import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('dudoces.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Clientes
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      endereco TEXT,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Matérias-primas
    CREATE TABLE IF NOT EXISTS materias_primas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      unidade TEXT NOT NULL DEFAULT 'g',
      custo_ultima_compra REAL DEFAULT 0,
      custo_medio REAL DEFAULT 0,
      estoque_atual REAL DEFAULT 0,
      estoque_minimo REAL DEFAULT 0,
      usar_custo_medio INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Histórico de compras de matéria-prima
    CREATE TABLE IF NOT EXISTS compras_materia_prima (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      materia_prima_id INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      custo_unitario REAL NOT NULL,
      custo_total REAL NOT NULL,
      data TEXT NOT NULL,
      foto_cupom TEXT,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (materia_prima_id) REFERENCES materias_primas(id)
    );

    -- Produtos acabados (o que ela vende)
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco_venda REAL NOT NULL DEFAULT 0,
      estoque_atual REAL DEFAULT 0,
      unidade TEXT DEFAULT 'unidade',
      rendimento_fatias REAL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Receitas: ingredientes de cada produto
    CREATE TABLE IF NOT EXISTS receitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      materia_prima_id INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      FOREIGN KEY (materia_prima_id) REFERENCES materias_primas(id)
    );

    -- Produções realizadas
    CREATE TABLE IF NOT EXISTS producoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      data TEXT NOT NULL,
      custo_total REAL DEFAULT 0,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    -- Vendas
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      cliente_nome TEXT,
      data TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      desconto REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status_pagamento TEXT DEFAULT 'pendente',
      forma_pagamento TEXT,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    -- Itens de cada venda
    CREATE TABLE IF NOT EXISTS venda_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      produto_nome TEXT NOT NULL,
      quantidade REAL NOT NULL,
      preco_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    -- Configurações gerais
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL
    );

    -- Metas semanais por produto
    CREATE TABLE IF NOT EXISTS metas_producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL UNIQUE,
      quantidade_semana REAL DEFAULT 0,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );
  `);

  const colunasProdutos = await database.getAllAsync<{ name: string }>("PRAGMA table_info(produtos)");
  const temRendimento = colunasProdutos.some(col => col.name === 'rendimento_fatias');
  if (!temRendimento) {
    await database.runAsync('ALTER TABLE produtos ADD COLUMN rendimento_fatias REAL DEFAULT 1');
  }
  if (!colunasProdutos.some(col => col.name === 'foto')) {
    await database.runAsync('ALTER TABLE produtos ADD COLUMN foto TEXT');
  }

  const colsMateriais = await database.getAllAsync<{ name: string }>("PRAGMA table_info(materias_primas)");
  const nomesCols = new Set(colsMateriais.map(c => c.name));
  if (!nomesCols.has('foto')) await database.runAsync('ALTER TABLE materias_primas ADD COLUMN foto TEXT');
  if (!nomesCols.has('qtd_por_embalagem')) await database.runAsync('ALTER TABLE materias_primas ADD COLUMN qtd_por_embalagem REAL DEFAULT 0');
  if (!nomesCols.has('descricao_embalagem')) await database.runAsync('ALTER TABLE materias_primas ADD COLUMN descricao_embalagem TEXT');
}
