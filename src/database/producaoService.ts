import { getDatabase } from '../database/database';
import { Producao } from '../types';
import { listarReceita } from './produtosService';

type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'total';

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

export async function registrarProducao(
  produtoId: number,
  quantidade: number,
  data: string,
  observacao?: string
): Promise<void> {
  const db = await getDatabase();
  const receita = await listarReceita(produtoId);
  const produto = await db.getFirstAsync<{ rendimento_fatias: number }>(
    'SELECT rendimento_fatias FROM produtos WHERE id = ?',
    [produtoId]
  );
  const rendimento = Math.max(1, produto?.rendimento_fatias || 1);
  const fatorReceita = quantidade / rendimento;

  if (receita.length === 0) {
    throw new Error('Este produto não tem receita cadastrada.');
  }

  await db.withTransactionAsync(async () => {
    // Verifica e deduz matérias-primas do estoque
    for (const item of receita) {
      const mp = await db.getFirstAsync<{ estoque_atual: number; nome: string }>(
        'SELECT estoque_atual, nome FROM materias_primas WHERE id = ?',
        [item.materia_prima_id]
      );
      const necessario = item.quantidade * fatorReceita;
      if (!mp || mp.estoque_atual < necessario) {
        throw new Error(
          `Estoque insuficiente de "${mp?.nome || 'matéria-prima'}". Necessário: ${necessario}, disponível: ${mp?.estoque_atual ?? 0}.`
        );
      }
      await db.runAsync(
        'UPDATE materias_primas SET estoque_atual = estoque_atual - ? WHERE id = ?',
        [necessario, item.materia_prima_id]
      );
    }

    // Calcula custo total da produção
    const custoResult = await db.getFirstAsync<{ custo: number }>(
      `SELECT SUM(r.quantidade * ? *
         CASE WHEN mp.usar_custo_medio = 1 THEN mp.custo_medio ELSE mp.custo_ultima_compra END
       ) as custo
       FROM receitas r
       JOIN materias_primas mp ON mp.id = r.materia_prima_id
       WHERE r.produto_id = ?`,
      [fatorReceita, produtoId]
    );
    const custoTotal = custoResult?.custo || 0;

    // Registra a produção
    await db.runAsync(
      `INSERT INTO producoes (produto_id, quantidade, data, custo_total, observacao)
       VALUES (?, ?, ?, ?, ?)`,
      [produtoId, quantidade, data, custoTotal, observacao || null]
    );

    // Adiciona ao estoque de produtos
    await db.runAsync(
      'UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?',
      [quantidade, produtoId]
    );
  });
}

export async function listarProducoes(limite?: number): Promise<Producao[]> {
  const db = await getDatabase();
  const limitClause = limite ? `LIMIT ${limite}` : '';
  return await db.getAllAsync<Producao>(
    `SELECT p.*, pr.nome as produto_nome
     FROM producoes p
     JOIN produtos pr ON pr.id = p.produto_id
     ORDER BY p.data DESC, p.created_at DESC ${limitClause}`
  );
}

export async function listarProducoesPorPeriodo(filtro: FiltroPeriodo, limite = 8): Promise<Producao[]> {
  const db = await getDatabase();
  const { inicio, fim } = intervaloPorPeriodo(filtro);

  let whereClause = '';
  const params: (string | number)[] = [];

  if (inicio && fim) {
    whereClause = 'WHERE date(p.data) BETWEEN ? AND ?';
    params.push(inicio, fim);
  }

  params.push(limite);

  return await db.getAllAsync<Producao>(
    `SELECT p.*, pr.nome as produto_nome
     FROM producoes p
     JOIN produtos pr ON pr.id = p.produto_id
     ${whereClause}
     ORDER BY p.data DESC, p.created_at DESC
     LIMIT ?`,
    params
  );
}

export async function listarProducoesFiltradas(
  dataInicioISO: string,
  dataFimISO: string,
  produtoId?: number | null,
  limite = 8
): Promise<Producao[]> {
  const db = await getDatabase();
  const params: (string | number)[] = [dataInicioISO, dataFimISO];

  let filtroProduto = '';
  if (produtoId) {
    filtroProduto = 'AND p.produto_id = ?';
    params.push(produtoId);
  }

  params.push(limite);

  return await db.getAllAsync<Producao>(
    `SELECT p.*, pr.nome as produto_nome
     FROM producoes p
     JOIN produtos pr ON pr.id = p.produto_id
     WHERE date(p.data) BETWEEN ? AND ?
     ${filtroProduto}
     ORDER BY p.data DESC, p.created_at DESC
     LIMIT ?`,
    params
  );
}

export async function excluirProducao(id: number): Promise<void> {
  const db = await getDatabase();
  // Busca produção para reverter estoque
  const producao = await db.getFirstAsync<Producao>(
    'SELECT * FROM producoes WHERE id = ?', [id]
  );
  if (!producao) return;

  const receita = await listarReceita(producao.produto_id);

  await db.withTransactionAsync(async () => {
    // Devolve matérias-primas ao estoque
    for (const item of receita) {
      const devolver = item.quantidade * producao.quantidade;
      await db.runAsync(
        'UPDATE materias_primas SET estoque_atual = estoque_atual + ? WHERE id = ?',
        [devolver, item.materia_prima_id]
      );
    }
    // Remove do estoque de produtos
    await db.runAsync(
      'UPDATE produtos SET estoque_atual = MAX(0, estoque_atual - ?) WHERE id = ?',
      [producao.quantidade, producao.produto_id]
    );
    await db.runAsync('DELETE FROM producoes WHERE id = ?', [id]);
  });
}
