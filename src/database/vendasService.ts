import { getDatabase } from '../database/database';
import { Venda, VendaItem } from '../types';

export type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'total';

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function intervaloPorPeriodo(filtro: FiltroPeriodo): { inicio?: string; fim?: string } {
  if (filtro === 'total') return {};

  const hoje = new Date();
  const fim = formatarDataISO(hoje);

  if (filtro === 'hoje') {
    return { inicio: fim, fim };
  }

  if (filtro === 'mes') {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { inicio: formatarDataISO(inicioMes), fim };
  }

  const inicioSemana = new Date(hoje);
  const diaSemana = (inicioSemana.getDay() + 6) % 7;
  inicioSemana.setDate(inicioSemana.getDate() - diaSemana);
  return { inicio: formatarDataISO(inicioSemana), fim };
}

export async function registrarVenda(
  venda: Omit<Venda, 'id' | 'created_at'>,
  itens: Omit<VendaItem, 'id' | 'venda_id'>[]
): Promise<number> {
  const db = await getDatabase();
  let vendaId = 0;

  await db.withTransactionAsync(async () => {
    // Verifica estoque de cada produto
    for (const item of itens) {
      const produto = await db.getFirstAsync<{ estoque_atual: number; nome: string }>(
        'SELECT estoque_atual, nome FROM produtos WHERE id = ?', [item.produto_id]
      );
      if (!produto || produto.estoque_atual < item.quantidade) {
        throw new Error(
          `Estoque insuficiente de "${produto?.nome || 'produto'}". Disponível: ${produto?.estoque_atual ?? 0}.`
        );
      }
    }

    // Cria a venda
    const result = await db.runAsync(
      `INSERT INTO vendas (cliente_id, cliente_nome, data, subtotal, desconto, total, status_pagamento, forma_pagamento, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [venda.cliente_id || null, venda.cliente_nome || null, venda.data,
       venda.subtotal, venda.desconto, venda.total,
       venda.status_pagamento, venda.forma_pagamento || null, venda.observacao || null]
    );
    vendaId = result.lastInsertRowId;

    // Insere itens e deduz estoque
    for (const item of itens) {
      await db.runAsync(
        `INSERT INTO venda_itens (venda_id, produto_id, produto_nome, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [vendaId, item.produto_id, item.produto_nome, item.quantidade,
         item.preco_unitario, item.subtotal]
      );
      await db.runAsync(
        'UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?',
        [item.quantidade, item.produto_id]
      );
    }
  });

  return vendaId;
}

export async function listarVendas(limite?: number): Promise<Venda[]> {
  const db = await getDatabase();
  const limitClause = limite ? `LIMIT ${limite}` : '';
  return await db.getAllAsync<Venda>(
    `SELECT * FROM vendas ORDER BY data DESC, created_at DESC ${limitClause}`
  );
}

export async function buscarVenda(id: number): Promise<Venda | null> {
  const db = await getDatabase();
  const venda = await db.getFirstAsync<Venda>(
    'SELECT * FROM vendas WHERE id = ?', [id]
  );
  if (!venda) return null;

  venda.itens = await db.getAllAsync<VendaItem>(
    'SELECT * FROM venda_itens WHERE venda_id = ?', [id]
  );
  return venda;
}

export async function marcarComoPago(vendaId: number, formaPagamento?: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE vendas SET status_pagamento = ?, forma_pagamento = ? WHERE id = ?',
    ['pago', formaPagamento || null, vendaId]
  );
}

export async function excluirVenda(id: number): Promise<void> {
  const db = await getDatabase();
  // Devolve estoque dos produtos
  const itens = await db.getAllAsync<VendaItem>(
    'SELECT * FROM venda_itens WHERE venda_id = ?', [id]
  );
  await db.withTransactionAsync(async () => {
    for (const item of itens) {
      await db.runAsync(
        'UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?',
        [item.quantidade, item.produto_id]
      );
    }
    await db.runAsync('DELETE FROM vendas WHERE id = ?', [id]);
  });
}

export async function resumoFinanceiro(): Promise<{
  totalRecebido: number;
  totalPendente: number;
  vendasHoje: number;
  vendasMes: number;
}> {
  const db = await getDatabase();
  const hoje = new Date().toISOString().split('T')[0];
  const primeiroDiaMes = hoje.substring(0, 7) + '-01';

  const recebido = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM vendas WHERE status_pagamento = 'pago'"
  );
  const pendente = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM vendas WHERE status_pagamento = 'pendente'"
  );
  const vendasHoje = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM vendas WHERE date(data) = ?", [hoje]
  );
  const vendasMes = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM vendas WHERE data >= ?", [primeiroDiaMes]
  );

  return {
    totalRecebido: recebido?.total || 0,
    totalPendente: pendente?.total || 0,
    vendasHoje: vendasHoje?.total || 0,
    vendasMes: vendasMes?.total || 0,
  };
}

export async function resumoDashboardPorPeriodo(filtro: FiltroPeriodo): Promise<{
  totalRecebido: number;
  totalPendente: number;
  totalVendas: number;
  lucroEstimado: number;
  quantidadeVendas: number;
}> {
  const db = await getDatabase();
  const { inicio, fim } = intervaloPorPeriodo(filtro);

  let whereClause = '';
  const params: (string | number)[] = [];

  if (inicio && fim) {
    whereClause = 'WHERE date(v.data) BETWEEN ? AND ?';
    params.push(inicio, fim);
  }

  const totais = await db.getFirstAsync<{
    total_recebido: number;
    total_pendente: number;
    total_vendas: number;
    quantidade_vendas: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN v.status_pagamento = 'pago' THEN v.total ELSE 0 END), 0) as total_recebido,
       COALESCE(SUM(CASE WHEN v.status_pagamento = 'pendente' THEN v.total ELSE 0 END), 0) as total_pendente,
       COALESCE(SUM(v.total), 0) as total_vendas,
       COUNT(v.id) as quantidade_vendas
     FROM vendas v
     ${whereClause}`,
    params
  );

  const lucro = await db.getFirstAsync<{ lucro: number }>(
    `SELECT
       COALESCE(SUM((vi.preco_unitario - COALESCE(cp.custo_unitario, 0)) * vi.quantidade), 0) as lucro
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     LEFT JOIN (
       SELECT
         r.produto_id,
         SUM(r.quantidade * CASE WHEN mp.usar_custo_medio = 1 THEN mp.custo_medio ELSE mp.custo_ultima_compra END) / MAX(COALESCE(p.rendimento_fatias, 1)) as custo_unitario
       FROM receitas r
       JOIN materias_primas mp ON mp.id = r.materia_prima_id
       JOIN produtos p ON p.id = r.produto_id
       GROUP BY r.produto_id
     ) cp ON cp.produto_id = vi.produto_id
     ${whereClause}`,
    params
  );

  return {
    totalRecebido: totais?.total_recebido || 0,
    totalPendente: totais?.total_pendente || 0,
    totalVendas: totais?.total_vendas || 0,
    lucroEstimado: lucro?.lucro || 0,
    quantidadeVendas: totais?.quantidade_vendas || 0,
  };
}

export async function resumoDashboardFiltrado(
  dataInicioISO: string,
  dataFimISO: string,
  produtoId?: number | null
): Promise<{
  totalRecebido: number;
  totalPendente: number;
  totalVendas: number;
  lucroEstimado: number;
  quantidadeVendas: number;
  quantidadeVendida: number;
}> {
  const db = await getDatabase();

  if (produtoId) {
    const params: (string | number)[] = [dataInicioISO, dataFimISO, produtoId];

    const totais = await db.getFirstAsync<{
      total_recebido: number;
      total_pendente: number;
      total_vendas: number;
      quantidade_vendas: number;
      quantidade_vendida: number;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN v.status_pagamento = 'pago' THEN vi.subtotal ELSE 0 END), 0) as total_recebido,
         COALESCE(SUM(CASE WHEN v.status_pagamento = 'pendente' THEN vi.subtotal ELSE 0 END), 0) as total_pendente,
         COALESCE(SUM(vi.subtotal), 0) as total_vendas,
         COUNT(DISTINCT v.id) as quantidade_vendas,
         COALESCE(SUM(vi.quantidade), 0) as quantidade_vendida
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       WHERE date(v.data) BETWEEN ? AND ?
         AND vi.produto_id = ?`,
      params
    );

    const lucro = await db.getFirstAsync<{ lucro: number }>(
      `SELECT
         COALESCE(SUM((vi.preco_unitario - COALESCE(cp.custo_unitario, 0)) * vi.quantidade), 0) as lucro
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       LEFT JOIN (
         SELECT
           r.produto_id,
           SUM(r.quantidade * CASE WHEN mp.usar_custo_medio = 1 THEN mp.custo_medio ELSE mp.custo_ultima_compra END) / MAX(COALESCE(p.rendimento_fatias, 1)) as custo_unitario
         FROM receitas r
         JOIN materias_primas mp ON mp.id = r.materia_prima_id
         JOIN produtos p ON p.id = r.produto_id
         GROUP BY r.produto_id
       ) cp ON cp.produto_id = vi.produto_id
       WHERE date(v.data) BETWEEN ? AND ?
         AND vi.produto_id = ?`,
      params
    );

    return {
      totalRecebido: totais?.total_recebido || 0,
      totalPendente: totais?.total_pendente || 0,
      totalVendas: totais?.total_vendas || 0,
      lucroEstimado: lucro?.lucro || 0,
      quantidadeVendas: totais?.quantidade_vendas || 0,
      quantidadeVendida: totais?.quantidade_vendida || 0,
    };
  }

  const params: (string | number)[] = [dataInicioISO, dataFimISO];

  const totais = await db.getFirstAsync<{
    total_recebido: number;
    total_pendente: number;
    total_vendas: number;
    quantidade_vendas: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN v.status_pagamento = 'pago' THEN v.total ELSE 0 END), 0) as total_recebido,
       COALESCE(SUM(CASE WHEN v.status_pagamento = 'pendente' THEN v.total ELSE 0 END), 0) as total_pendente,
       COALESCE(SUM(v.total), 0) as total_vendas,
       COUNT(v.id) as quantidade_vendas
     FROM vendas v
     WHERE date(v.data) BETWEEN ? AND ?`,
    params
  );

  const quantidadeVendida = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(vi.quantidade), 0) as total
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     WHERE date(v.data) BETWEEN ? AND ?`,
    params
  );

  const lucro = await db.getFirstAsync<{ lucro: number }>(
    `SELECT
       COALESCE(SUM((vi.preco_unitario - COALESCE(cp.custo_unitario, 0)) * vi.quantidade), 0) as lucro
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     LEFT JOIN (
       SELECT
         r.produto_id,
         SUM(r.quantidade * CASE WHEN mp.usar_custo_medio = 1 THEN mp.custo_medio ELSE mp.custo_ultima_compra END) / MAX(COALESCE(p.rendimento_fatias, 1)) as custo_unitario
       FROM receitas r
       JOIN materias_primas mp ON mp.id = r.materia_prima_id
       JOIN produtos p ON p.id = r.produto_id
       GROUP BY r.produto_id
     ) cp ON cp.produto_id = vi.produto_id
     WHERE date(v.data) BETWEEN ? AND ?`,
    params
  );

  return {
    totalRecebido: totais?.total_recebido || 0,
    totalPendente: totais?.total_pendente || 0,
    totalVendas: totais?.total_vendas || 0,
    lucroEstimado: lucro?.lucro || 0,
    quantidadeVendas: totais?.quantidade_vendas || 0,
    quantidadeVendida: quantidadeVendida?.total || 0,
  };
}
