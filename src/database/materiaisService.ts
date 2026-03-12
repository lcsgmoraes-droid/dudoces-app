import { getDatabase } from '../database/database';
import { MateriaPrima, CompraMateriaPrima } from '../types';

export async function listarMateriasPrimas(): Promise<MateriaPrima[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MateriaPrima>(
    'SELECT * FROM materias_primas ORDER BY nome ASC'
  );
}

export async function buscarMateriaPrima(id: number): Promise<MateriaPrima | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<MateriaPrima>(
    'SELECT * FROM materias_primas WHERE id = ?', [id]
  );
}

export async function salvarMateriaPrima(mp: Omit<MateriaPrima, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO materias_primas (nome, unidade, custo_ultima_compra, custo_medio, estoque_atual, estoque_minimo, usar_custo_medio, foto, qtd_por_embalagem, descricao_embalagem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [mp.nome, mp.unidade, mp.custo_ultima_compra, mp.custo_medio,
     mp.estoque_atual, mp.estoque_minimo, mp.usar_custo_medio,
     mp.foto || null, mp.qtd_por_embalagem || 0, mp.descricao_embalagem || null]
  );
  return result.lastInsertRowId;
}

export async function atualizarMateriaPrima(id: number, mp: Omit<MateriaPrima, 'id' | 'created_at'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE materias_primas SET nome=?, unidade=?, custo_ultima_compra=?, custo_medio=?, estoque_atual=?, estoque_minimo=?, usar_custo_medio=?, foto=?, qtd_por_embalagem=?, descricao_embalagem=?
     WHERE id=?`,
    [mp.nome, mp.unidade, mp.custo_ultima_compra, mp.custo_medio,
     mp.estoque_atual, mp.estoque_minimo, mp.usar_custo_medio,
     mp.foto || null, mp.qtd_por_embalagem || 0, mp.descricao_embalagem || null, id]
  );
}

export async function excluirMateriaPrima(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM materias_primas WHERE id = ?', [id]);
}

// Registrar uma compra e atualizar estoque + custos
export async function registrarCompra(compra: Omit<CompraMateriaPrima, 'id' | 'created_at'>): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // Busca matéria-prima atual
    const mp = await db.getFirstAsync<MateriaPrima>(
      'SELECT * FROM materias_primas WHERE id = ?', [compra.materia_prima_id]
    );
    if (!mp) throw new Error('Matéria-prima não encontrada');

    // Salva a compra
    await db.runAsync(
      `INSERT INTO compras_materia_prima (materia_prima_id, quantidade, custo_unitario, custo_total, data, foto_cupom, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [compra.materia_prima_id, compra.quantidade, compra.custo_unitario,
       compra.custo_total, compra.data, compra.foto_cupom || null, compra.observacao || null]
    );

    // Calcula custo médio ponderado
    const estoqueAnterior = mp.estoque_atual;
    const novoEstoque = estoqueAnterior + compra.quantidade;
    const custoMedio = novoEstoque > 0
      ? ((estoqueAnterior * mp.custo_medio) + (compra.quantidade * compra.custo_unitario)) / novoEstoque
      : compra.custo_unitario;

    // Atualiza matéria-prima
    await db.runAsync(
      `UPDATE materias_primas SET estoque_atual=?, custo_ultima_compra=?, custo_medio=? WHERE id=?`,
      [novoEstoque, compra.custo_unitario, custoMedio, compra.materia_prima_id]
    );
  });
}

export async function listarCompras(materiaPrimaId?: number): Promise<CompraMateriaPrima[]> {
  const db = await getDatabase();
  if (materiaPrimaId) {
    return await db.getAllAsync<CompraMateriaPrima>(
      `SELECT c.*, mp.nome as materia_prima_nome
       FROM compras_materia_prima c
       JOIN materias_primas mp ON mp.id = c.materia_prima_id
       WHERE c.materia_prima_id = ?
       ORDER BY c.data DESC`, [materiaPrimaId]
    );
  }
  return await db.getAllAsync<CompraMateriaPrima>(
    `SELECT c.*, mp.nome as materia_prima_nome
     FROM compras_materia_prima c
     JOIN materias_primas mp ON mp.id = c.materia_prima_id
     ORDER BY c.data DESC`
  );
}

// Ajuste manual de estoque (ex: perda, correção)
export async function ajustarEstoque(id: number, novaQuantidade: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE materias_primas SET estoque_atual = ? WHERE id = ?',
    [novaQuantidade, id]
  );
}
