import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, Separador, Input, Botao } from '../../components/ui';
import { listarAlertas, calcularNecessidades, listarMetas, salvarMeta } from '../../database/alertasService';
import { listarProdutos } from '../../database/produtosService';
import { AlertaEstoque, PlanejamentoNecessidade, MetaProducao, Produto } from '../../types';

export default function EstoquePlanejamentoScreen() {
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [necessidades, setNecessidades] = useState<PlanejamentoNecessidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Record<number, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [alts, nec, prods, metasLista] = await Promise.all([
        listarAlertas(),
        calcularNecessidades(),
        listarProdutos(),
        listarMetas(),
      ]);
      setAlertas(alts);
      setNecessidades(nec);
      setProdutos(prods);
      const metasMap: Record<number, string> = {};
      metasLista.forEach(m => { metasMap[m.produto_id] = String(m.quantidade_semana); });
      setMetas(metasMap);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const salvarMetas = async () => {
    setSalvando(true);
    try {
      for (const [prodId, qtd] of Object.entries(metas)) {
        await salvarMeta(Number(prodId), Number(qtd) || 0);
      }
      await carregar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} colors={[Colors.primary]} />}
    >
      {/* Alertas */}
      <Text style={estilos.secaoTitulo}>🚨 Alertas de Estoque</Text>
      {alertas.length === 0 ? (
        <Card><Text style={{ color: Colors.success, textAlign: 'center', fontWeight: '600' }}>✅ Tudo em ordem!</Text></Card>
      ) : (
        alertas.map(a => (
          <Card key={a.materia_prima_id} estilo={{
            borderLeftWidth: 4,
            borderLeftColor: a.tipo === 'critico' ? Colors.danger : Colors.warning,
          }}>
            <View style={estilos.alertaRow}>
              <Text style={estilos.alertaEmoji}>{a.tipo === 'critico' ? '🚨' : '⚠️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={estilos.alertaNome}>{a.nome}</Text>
                <Text style={estilos.alertaInfo}>
                  Atual: <Text style={{ fontWeight: '700' }}>{a.estoque_atual} {a.unidade}</Text>
                  {'  |  '}Mínimo: {a.estoque_minimo} {a.unidade}
                </Text>
              </View>
              <View style={[estilos.alertaBadge, {
                backgroundColor: a.tipo === 'critico' ? '#FFEBEE' : '#FFF8E1'
              }]}>
                <Text style={[estilos.alertaBadgeTexto, {
                  color: a.tipo === 'critico' ? Colors.danger : Colors.warning
                }]}>
                  {a.tipo === 'critico' ? 'CRÍTICO' : 'BAIXO'}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}

      <Separador />

      {/* Metas de produção semanal */}
      <Text style={estilos.secaoTitulo}>🎯 Meta de produção semanal</Text>
      <Text style={estilos.secaoDesc}>Defina quantas unidades de cada produto você planeja fazer por semana</Text>

      {produtos.map(p => (
        <View key={p.id} style={estilos.metaRow}>
          <Text style={estilos.metaNome}>{p.nome}</Text>
          <View style={estilos.metaInput}>
            <Input
              value={metas[p.id] ?? '0'}
              onChangeText={v => setMetas(prev => ({ ...prev, [p.id]: v }))}
              keyboardType="numeric"
              estilo={{ marginBottom: 0 }}
            />
          </View>
          <Text style={estilos.metaUnidade}>/sem</Text>
        </View>
      ))}

      <Botao titulo="Salvar Metas" onPress={salvarMetas} carregando={salvando} estilo={{ marginTop: Spacing.md }} />

      <Separador />

      {/* Necessidades calculadas */}
      {necessidades.length > 0 && (
        <>
          <Text style={estilos.secaoTitulo}>📦 Matérias-primas necessárias</Text>
          <Text style={estilos.secaoDesc}>Baseado nas suas metas semanais</Text>

          {necessidades.map(n => (
            <Card key={n.materia_prima_id}>
              <Text style={estilos.necNome}>{n.nome}</Text>
              <View style={estilos.necGrid}>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>Semana</Text>
                  <Text style={estilos.necValor}>{n.necessidade_semana.toFixed(1)} {n.unidade}</Text>
                </View>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>Mês</Text>
                  <Text style={estilos.necValor}>{n.necessidade_mes.toFixed(1)} {n.unidade}</Text>
                </View>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>2 meses</Text>
                  <Text style={estilos.necValor}>{n.necessidade_2meses.toFixed(1)} {n.unidade}</Text>
                </View>
              </View>
              {n.falta_semana > 0 && (
                <Text style={estilos.necAlerta}>
                  ⚠️ Falta {n.falta_semana.toFixed(1)} {n.unidade} para a semana
                </Text>
              )}
              <Text style={estilos.necEstoque}>Em estoque: {n.estoque_atual.toFixed(1)} {n.unidade}</Text>
            </Card>
          ))}
        </>
      )}

      <Separador espaco={Spacing.xl} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  secaoTitulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  secaoDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  alertaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  alertaEmoji: { fontSize: 22 },
  alertaNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  alertaInfo: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  alertaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  alertaBadgeTexto: { fontSize: FontSize.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  metaNome: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  metaInput: { width: 80 },
  metaUnidade: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 35 },
  necNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  necGrid: { flexDirection: 'row', gap: Spacing.sm },
  necItem: { flex: 1, alignItems: 'center', backgroundColor: Colors.background, padding: 8, borderRadius: BorderRadius.sm },
  necLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  necValor: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  necAlerta: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600', marginTop: Spacing.sm },
  necEstoque: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});
