export interface Cliente {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacao?: string;
  created_at: string;
}

export interface MateriaPrima {
  id: number;
  nome: string;
  unidade: string;
  custo_ultima_compra: number;
  custo_medio: number;
  estoque_atual: number;
  estoque_minimo: number;
  usar_custo_medio: number; // 0 = última compra, 1 = custo médio
  foto?: string;
  qtd_por_embalagem?: number;
  descricao_embalagem?: string;
  created_at: string;
}

export interface CompraMateriaPrima {
  id: number;
  materia_prima_id: number;
  materia_prima_nome?: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  data: string;
  foto_cupom?: string;
  observacao?: string;
  created_at: string;
}

export interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  preco_venda: number;
  estoque_atual: number;
  unidade: string;
  rendimento_fatias?: number;
  foto?: string;
  created_at: string;
  // campos extras calculados
  custo_producao?: number;
  pode_fazer_quantidade?: number;
}

export interface ReceitaItem {
  id: number;
  produto_id: number;
  materia_prima_id: number;
  materia_prima_nome?: string;
  quantidade: number;
  unidade?: string;
}

export interface Producao {
  id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  data: string;
  custo_total: number;
  observacao?: string;
  created_at: string;
}

export interface Venda {
  id: number;
  cliente_id?: number;
  cliente_nome?: string;
  data: string;
  subtotal: number;
  desconto: number;
  total: number;
  status_pagamento: 'pago' | 'pendente';
  forma_pagamento?: string;
  observacao?: string;
  created_at: string;
  itens?: VendaItem[];
}

export interface VendaItem {
  id: number;
  venda_id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface MetaProducao {
  id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade_semana: number;
}

export interface AlertaEstoque {
  materia_prima_id: number;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  tipo: 'critico' | 'baixo';
}

export interface PlanejamentoNecessidade {
  materia_prima_id: number;
  nome: string;
  unidade: string;
  necessidade_semana: number;
  necessidade_mes: number;
  necessidade_2meses: number;
  estoque_atual: number;
  falta_semana: number;
  falta_mes: number;
  falta_2meses: number;
  qtd_por_embalagem?: number;
  descricao_embalagem?: string;
}
