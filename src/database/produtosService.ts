import { getDatabase } from '../database/database';
import { Produto, ReceitaItem } from '../types';

type ProdutoPayload = Omit<Produto, 'id' | 'created_at' | 'custo_producao' | 'pode_fazer_quantidade'>;

export async function listarProdutos(): Promise<Produto[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Produto>(
    'SELECT * FROM produtos ORDER BY nome ASC'
  );
}

export async function buscarProduto(id: number): Promise<Produto | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Produto>(
    'SELECT * FROM produtos WHERE id = ?', [id]
  );
}

export async function salvarProduto(produto: ProdutoPayload): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO produtos (nome, descricao, preco_venda, estoque_atual, unidade, rendimento_fatias, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [produto.nome, produto.descricao || null, produto.preco_venda,
     produto.estoque_atual, produto.unidade, produto.rendimento_fatias || 1, produto.foto || null]
  );
  return result.lastInsertRowId;
}

export async function atualizarProduto(id: number, produto: ProdutoPayload): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE produtos SET nome=?, descricao=?, preco_venda=?, estoque_atual=?, unidade=?, rendimento_fatias=?, foto=? WHERE id=?`,
    [produto.nome, produto.descricao || null, produto.preco_venda,
     produto.estoque_atual, produto.unidade, produto.rendimento_fatias || 1, produto.foto || null, id]
  );
}

export async function atualizarRendimentoProduto(produtoId: number, rendimentoFatias: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE produtos SET rendimento_fatias = ? WHERE id = ?',
    [Math.max(1, rendimentoFatias || 1), produtoId]
  );
}

export async function excluirProduto(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM produtos WHERE id = ?', [id]);
}

// === RECEITAS ===

export async function listarReceita(produtoId: number): Promise<ReceitaItem[]> {
  const db = await getDatabase();
  return await db.getAllAsync<ReceitaItem>(
    `SELECT r.*, mp.nome as materia_prima_nome, mp.unidade
     FROM receitas r
     JOIN materias_primas mp ON mp.id = r.materia_prima_id
     WHERE r.produto_id = ?`,
    [produtoId]
  );
}

export async function salvarReceita(produtoId: number, itens: Omit<ReceitaItem, 'id' | 'produto_id'>[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // Remove receita anterior
    await db.runAsync('DELETE FROM receitas WHERE produto_id = ?', [produtoId]);
    // Insere novos itens
    for (const item of itens) {
      await db.runAsync(
        'INSERT INTO receitas (produto_id, materia_prima_id, quantidade) VALUES (?, ?, ?)',
        [produtoId, item.materia_prima_id, item.quantidade]
      );
    }
  });
}

// Calcula custo de produção de um produto baseado na receita e custos das matérias-primas
export async function calcularCustoProduto(produtoId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ custo: number }>(
    `SELECT SUM(
       r.quantidade * 
       CASE WHEN mp.usar_custo_medio = 1 THEN mp.custo_medio ELSE mp.custo_ultima_compra END
     ) as custo
     FROM receitas r
     JOIN materias_primas mp ON mp.id = r.materia_prima_id
     WHERE r.produto_id = ?`,
    [produtoId]
  );

  const produto = await buscarProduto(produtoId);
  const rendimento = Math.max(1, produto?.rendimento_fatias || 1);
  return (result?.custo || 0) / rendimento;
}

// Calcula quantas unidades dá pra fazer com o estoque atual
export async function calcularQuantidadePossivel(produtoId: number): Promise<number> {
  const db = await getDatabase();
  const produto = await buscarProduto(produtoId);
  const rendimento = Math.max(1, produto?.rendimento_fatias || 1);
  const receita = await listarReceita(produtoId);
  if (receita.length === 0) return 0;

  let minimo = Infinity;
  for (const item of receita) {
    const mp = await db.getFirstAsync<{ estoque_atual: number }>(
      'SELECT estoque_atual FROM materias_primas WHERE id = ?',
      [item.materia_prima_id]
    );
    if (!mp || item.quantidade <= 0) {
      minimo = 0;
      break;
    }
    const possivel = Math.floor(mp.estoque_atual / item.quantidade) * rendimento;
    if (possivel < minimo) minimo = possivel;
  }
  return minimo === Infinity ? 0 : minimo;
}

// Lista produtos com quantidade possível calculada
export async function listarProdutosComCapacidade(): Promise<Produto[]> {
  const produtos = await listarProdutos();

  for (const produto of produtos) {
    produto.custo_producao = await calcularCustoProduto(produto.id);
    produto.pode_fazer_quantidade = await calcularQuantidadePossivel(produto.id);
  }

  return produtos;
}
