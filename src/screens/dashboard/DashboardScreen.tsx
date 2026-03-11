import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, useWindowDimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, Badge, Separador, Input } from '../../components/ui';
import { resumoDashboardFiltrado } from '../../database/vendasService';
import { listarAlertas } from '../../database/alertasService';
import { listarProdutos, listarProdutosComCapacidade } from '../../database/produtosService';
import { listarProducoesFiltradas } from '../../database/producaoService';
import { AlertaEstoque, Produto, Producao } from '../../types';

function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function dataBRParaISO(valor: string): string | null {
  const partes = valor.split('/');
  if (partes.length !== 3) return null;

  const dia = Number(partes[0]);
  const mes = Number(partes[1]);
  const ano = Number(partes[2]);
  if (!dia || !mes || !ano || ano < 2000 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function mascararData(valor: string): string {
  const digitos = valor.replaceAll(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [financeiro, setFinanceiro] = useState({
    totalRecebido: 0,
    totalPendente: 0,
    totalVendas: 0,
    lucroEstimado: 0,
    quantidadeVendas: 0,
    quantidadeVendida: 0,
  });
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [dataInicio, setDataInicio] = useState(formatarDataBR(inicioMes));
  const [dataFim, setDataFim] = useState(formatarDataBR(hoje));
  const [produtoFiltroId, setProdutoFiltroId] = useState<number | null>(null);
  const [listaProdutosFiltro, setListaProdutosFiltro] = useState<Produto[]>([]);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    const dataInicioISO = dataBRParaISO(dataInicio);
    const dataFimISO = dataBRParaISO(dataFim);
    if (!dataInicioISO || !dataFimISO) return;

    setCarregando(true);
    try {
      const [fin, alts, prodsFiltro, prodsCapacidade, prods_hist] = await Promise.all([
        resumoDashboardFiltrado(dataInicioISO, dataFimISO, produtoFiltroId),
        listarAlertas(),
        listarProdutos(),
        listarProdutosComCapacidade(),
        listarProducoesFiltradas(dataInicioISO, dataFimISO, produtoFiltroId, 8),
      ]);

      const capacidadesFiltradas = produtoFiltroId
        ? prodsCapacidade.filter(p => p.id === produtoFiltroId)
        : prodsCapacidade;

      setFinanceiro(fin);
      setAlertas(alts);
      setListaProdutosFiltro(prodsFiltro);
      setProdutos(capacidadesFiltradas);
      setProducoes(prods_hist);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim, produtoFiltroId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const formataMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={[estilos.conteudo, { paddingBottom: Spacing.xl + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} colors={[Colors.primary]} />}
    >
      {/* Header decorativo */}
      <View style={estilos.header}>
        <Text style={estilos.headerEmoji}>🍰</Text>
        <View>
          <Text style={estilos.headerTitulo}>DuDoces</Text>
          <Text style={estilos.headerSubtitulo}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>

      {/* Filtro colapsável */}
      <View style={estilos.filtroCabecalhoRow}>
        <Text style={estilos.filtroResumoTexto}>Período: {dataInicio} até {dataFim} · Produto: {produtoFiltroId ? (listaProdutosFiltro.find(p => p.id === produtoFiltroId)?.nome || 'Selecionado') : 'Todos'}</Text>
        <TouchableOpacity style={estilos.filtroExpandirBtn} onPress={() => setFiltroAberto(prev => !prev)}>
          <Text style={estilos.filtroExpandirTexto}>{filtroAberto ? 'Ocultar filtros' : 'Mostrar filtros'}</Text>
        </TouchableOpacity>
      </View>

      {filtroAberto && (
        <Card estilo={{ marginBottom: Spacing.md }}>
          <Input
            rotulo="Data início"
            value={dataInicio}
            onChangeText={v => setDataInicio(mascararData(v))}
            keyboardType="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
          />
          <Input
            rotulo="Data fim"
            value={dataFim}
            onChangeText={v => setDataFim(mascararData(v))}
            keyboardType="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
          />

          <Text style={estilos.filtroLabel}>Produto</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            <TouchableOpacity
              style={[estilos.filtroBtn, !produtoFiltroId && estilos.filtroBtnAtivo]}
              onPress={() => setProdutoFiltroId(null)}
            >
              <Text style={[estilos.filtroTexto, !produtoFiltroId && estilos.filtroTextoAtivo]}>Todos</Text>
            </TouchableOpacity>
            {listaProdutosFiltro.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[estilos.filtroBtn, produtoFiltroId === p.id && estilos.filtroBtnAtivo]}
                onPress={() => setProdutoFiltroId(p.id)}
              >
                <Text style={[estilos.filtroTexto, produtoFiltroId === p.id && estilos.filtroTextoAtivo]}>{p.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={estilos.aplicarBtn} onPress={carregar}>
            <Text style={estilos.aplicarBtnTexto}>Aplicar filtro</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Alertas de estoque */}
      {alertas.length > 0 && (
        <TouchableOpacity
          style={[estilos.alertaBanner, { backgroundColor: alertas.some(a => a.tipo === 'critico') ? '#FFEBEE' : '#FFF8E1' }]}
          onPress={() => navigation.navigate('EstoquePlanejamento')}
        >
          <Text style={estilos.alertaIcone}>
            {alertas.some(a => a.tipo === 'critico') ? '🚨' : '⚠️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.alertaTitulo, {
              color: alertas.some(a => a.tipo === 'critico') ? Colors.danger : Colors.warning
            }]}>
              {alertas.some(a => a.tipo === 'critico')
                ? `${alertas.filter(a => a.tipo === 'critico').length} material(is) acabando!`
                : `${alertas.length} material(is) com estoque baixo`}
            </Text>
            <Text style={estilos.alertaDesc}>Toque para ver detalhes</Text>
          </View>
          <Text style={{ fontSize: 20 }}>›</Text>
        </TouchableOpacity>
      )}

      {/* Cards financeiros */}
      <View style={estilos.gridResponsivo}>
        <Card estilo={[estilos.cardFinanceiro, estilos.cardMetade, { backgroundColor: '#E8F5E9' }]}>
          <Text style={estilos.cfTitulo}>Recebido</Text>
          <Text style={[estilos.cfValor, { color: Colors.success }]}>
            {formataMoeda(financeiro.totalRecebido)}
          </Text>
        </Card>
        <Card estilo={[estilos.cardFinanceiro, estilos.cardMetade, { backgroundColor: '#FFF8E1' }]}>
          <Text style={estilos.cfTitulo}>A Receber</Text>
          <Text style={[estilos.cfValor, { color: Colors.warning }]}>
            {formataMoeda(financeiro.totalPendente)}
          </Text>
        </Card>
        <Card estilo={[estilos.cardFinanceiro, estilos.cardMetade, { backgroundColor: Colors.primaryLight }]}>
          <Text style={estilos.cfTitulo}>Vendas no período</Text>
          <Text style={[estilos.cfValor, { color: Colors.primary }]}>
            {formataMoeda(financeiro.totalVendas)}
          </Text>
          <Text style={estilos.cfSub}>{financeiro.quantidadeVendas} venda(s)</Text>
        </Card>
        <Card estilo={[estilos.cardFinanceiro, estilos.cardMetade, { backgroundColor: '#F3E5F5' }]}>
          <Text style={estilos.cfTitulo}>Lucro Estimado</Text>
          <Text style={[estilos.cfValor, { color: Colors.accent }]}>
            {formataMoeda(financeiro.lucroEstimado)}
          </Text>
        </Card>
        <Card estilo={[estilos.cardFinanceiro, estilos.cardMetade, { backgroundColor: '#E3F2FD' }]}>
          <Text style={estilos.cfTitulo}>Quantidade vendida</Text>
          <Text style={[estilos.cfValor, { color: '#1565C0' }]}>{financeiro.quantidadeVendida.toFixed(0)} un</Text>
        </Card>
      </View>

      {/* Capacidade baseada no estoque atual */}
      <Separador espaco={Spacing.sm} />
      <View style={estilos.secaoHeader}>
        <Text style={estilos.secaoTitulo}>🍭 Capacidade de produção atual</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EstoquePlanejamento')}>
          <Text style={estilos.verMais}>Planejar ›</Text>
        </TouchableOpacity>
      </View>

      {produtos.filter(p => (p.pode_fazer_quantidade ?? 0) > 0).length === 0 ? (
        <Card>
          <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 8 }}>
            Sem receitas cadastradas ou estoque insuficiente
          </Text>
        </Card>
      ) : (
        produtos
          .filter(p => (p.pode_fazer_quantidade ?? 0) > 0)
          .slice(0, 5)
          .map(p => (
            <Card key={p.id} onPress={() => navigation.navigate('Producao', { screen: 'ProducaoForm', params: { produtoId: p.id } })}>
              <View style={estilos.produtoRow}>
                <Text style={estilos.produtoNome}>{p.nome}</Text>
                <View style={estilos.prodBadges}>
                  <Badge texto={`Faz: ${p.pode_fazer_quantidade}`} cor="verde" />
                  {(p.estoque_atual ?? 0) > 0 && (
                    <Badge texto={`Estoque: ${p.estoque_atual}`} cor="rosa" />
                  )}
                </View>
              </View>
            </Card>
          ))
      )}

      {/* Últimas produções */}
      {producoes.length > 0 && (
        <>
          <Separador espaco={Spacing.sm} />
          <Text style={estilos.secaoTitulo}>🔥 Produções no período</Text>
          {producoes.map(p => (
            <Card key={p.id}>
              <View style={estilos.producaoRow}>
                <View>
                  <Text style={estilos.producaoNome}>{p.produto_nome}</Text>
                  <Text style={estilos.producaoData}>
                    {new Date(p.data + 'T00:00').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Text style={estilos.producaoQtd}>{p.quantidade}x</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Atalhos rápidos */}
      <Separador espaco={Spacing.sm} />
      <Text style={estilos.secaoTitulo}>⚡ Atalhos rápidos</Text>
      <View style={estilos.gridAtalhos}>
        <TouchableOpacity
          style={[estilos.atalho, isTablet ? estilos.atalhoTablet : estilos.atalhoMobile]}
          onPress={() => navigation.navigate('Vendas', { screen: 'VendaForm' })}
        >
          <Text style={estilos.atalhoEmoji}>💰</Text>
          <Text style={estilos.atalhoTexto}>Nova Venda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.atalho, isTablet ? estilos.atalhoTablet : estilos.atalhoMobile]}
          onPress={() => navigation.navigate('Producao', { screen: 'ProducaoForm' })}
        >
          <Text style={estilos.atalhoEmoji}>👩‍🍳</Text>
          <Text style={estilos.atalhoTexto}>Registrar Produção</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.atalho, isTablet ? estilos.atalhoTablet : estilos.atalhoMobile]}
          onPress={() => navigation.navigate('Materiais', { screen: 'CompraForm' })}
        >
          <Text style={estilos.atalhoEmoji}>🛒</Text>
          <Text style={estilos.atalhoTexto}>Registrar Compra</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.atalho, isTablet ? estilos.atalhoTablet : estilos.atalhoMobile]}
          onPress={() => navigation.navigate('EstoquePlanejamento')}
        >
          <Text style={estilos.atalhoEmoji}>📊</Text>
          <Text style={estilos.atalhoTexto}>Ver Planejamento</Text>
        </TouchableOpacity>
      </View>

      <Separador espaco={Spacing.xl} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  filtroCabecalhoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  filtroResumoTexto: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  filtroExpandirBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.full },
  filtroExpandirTexto: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.xs },
  filtroLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  filtroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  filtroBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filtroBtnAtivo: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filtroTexto: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  filtroTextoAtivo: { color: Colors.primary, fontWeight: '700' },
  aplicarBtn: { marginTop: 4, backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  aplicarBtnTexto: { color: '#fff', fontWeight: '700' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    margin: -Spacing.md, marginBottom: Spacing.lg,
    padding: Spacing.lg, paddingTop: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerEmoji: { fontSize: 42, marginRight: Spacing.md },
  headerTitulo: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  headerSubtitulo: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' },
  alertaBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    marginBottom: Spacing.md, gap: Spacing.sm,
  },
  alertaIcone: { fontSize: 24 },
  alertaTitulo: { fontWeight: '700', fontSize: FontSize.md },
  alertaDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  gridResponsivo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardFinanceiro: { flex: 1, padding: Spacing.md },
  cardMetade: { width: '48.6%', marginBottom: Spacing.sm },
  cfTitulo: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  cfValor: { fontSize: FontSize.lg, fontWeight: '800' },
  cfSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  secaoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  verMais: { color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm },
  produtoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  produtoNome: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  prodBadges: { flexDirection: 'row', gap: 4 },
  producaoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  producaoNome: { fontWeight: '600', color: Colors.textPrimary },
  producaoData: { fontSize: FontSize.xs, color: Colors.textMuted },
  producaoQtd: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  gridAtalhos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  atalho: {
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  atalhoMobile: { width: '48.6%' },
  atalhoTablet: { width: '23.8%' },
  atalhoEmoji: { fontSize: 32, marginBottom: 6 },
  atalhoTexto: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});
