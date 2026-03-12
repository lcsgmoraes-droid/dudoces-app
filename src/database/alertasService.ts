import { getDatabase } from '../database/database';
import { AlertaEstoque, PlanejamentoNecessidade, MetaProducao } from '../types';

// Alertas de estoque baixo / crítico
export async function listarAlertas(): Promise<AlertaEstoque[]> {
  const db = await getDatabase();
  const materiais = await db.getAllAsync<{
    id: number; nome: string; unidade: string;
    estoque_atual: number; estoque_minimo: number;
  }>(
    `SELECT id, nome, unidade, estoque_atual, estoque_minimo
     FROM materias_primas
     WHERE estoque_minimo > 0 AND estoque_atual <= estoque_minimo * 1.2
     ORDER BY (CAST(estoque_atual AS REAL) / NULLIF(estoque_minimo, 0)) ASC`
  );

  return materiais.map(mp => ({
    materia_prima_id: mp.id,
    nome: mp.nome,
    unidade: mp.unidade,
    estoque_atual: mp.estoque_atual,
    estoque_minimo: mp.estoque_minimo,
    tipo: mp.estoque_atual <= mp.estoque_minimo ? 'critico' : 'baixo',
  }));
}

// Salvar / atualizar meta de produção semanal por produto
export async function salvarMeta(produtoId: number, qtdSemana: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO metas_producao (produto_id, quantidade_semana)
     VALUES (?, ?)
     ON CONFLICT(produto_id) DO UPDATE SET quantidade_semana = excluded.quantidade_semana`,
    [produtoId, qtdSemana]
  );
}

export async function listarMetas(): Promise<MetaProducao[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MetaProducao>(
    `SELECT m.*, p.nome as produto_nome
     FROM metas_producao m
     JOIN produtos p ON p.id = m.produto_id
     ORDER BY p.nome ASC`
  );
}

// Calcular necessidade de matérias-primas com base nas metas
export async function calcularNecessidades(): Promise<PlanejamentoNecessidade[]> {
  const db = await getDatabase();

  // Soma de (quantidade_semana * quantidade_receita) por matéria-prima
  const necessidades = await db.getAllAsync<{
    materia_prima_id: number;
    nome: string;
    unidade: string;
    necessidade_semana: number;
    estoque_atual: number;
    qtd_por_embalagem: number;
    descricao_embalagem: string | null;
  }>(
    `SELECT
       mp.id as materia_prima_id,
       mp.nome,
       mp.unidade,
       mp.estoque_atual,
       mp.qtd_por_embalagem,
       mp.descricao_embalagem,
       COALESCE(SUM(r.quantidade * m.quantidade_semana), 0) as necessidade_semana
     FROM materias_primas mp
     LEFT JOIN receitas r ON r.materia_prima_id = mp.id
     LEFT JOIN metas_producao m ON m.produto_id = r.produto_id
     GROUP BY mp.id, mp.nome, mp.unidade, mp.estoque_atual, mp.qtd_por_embalagem, mp.descricao_embalagem
     HAVING necessidade_semana > 0
     ORDER BY mp.nome ASC`
  );

  return necessidades.map(n => ({
    materia_prima_id: n.materia_prima_id,
    nome: n.nome,
    unidade: n.unidade,
    estoque_atual: n.estoque_atual,
    necessidade_semana: n.necessidade_semana,
    necessidade_mes: n.necessidade_semana * 4,
    necessidade_2meses: n.necessidade_semana * 8,
    falta_semana: Math.max(0, n.necessidade_semana - n.estoque_atual),
    falta_mes: Math.max(0, n.necessidade_semana * 4 - n.estoque_atual),
    falta_2meses: Math.max(0, n.necessidade_semana * 8 - n.estoque_atual),
    qtd_por_embalagem: n.qtd_por_embalagem || 0,
    descricao_embalagem: n.descricao_embalagem || undefined,
  }));
}

export async function totalAlertas(): Promise<number> {
  const alertas = await listarAlertas();
  return alertas.length;
}
