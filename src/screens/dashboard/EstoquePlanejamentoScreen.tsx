import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, Separador, Input, Botao } from '../../components/ui';
import { calcularNecessidades, listarMetas, salvarMeta } from '../../database/alertasService';
import { listarProdutos } from '../../database/produtosService';
import { PlanejamentoNecessidade, Produto } from '../../types';

export default function EstoquePlanejamentoScreen() {
  const [necessidades, setNecessidades] = useState<PlanejamentoNecessidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Record<number, string>>({});
  const [modoMeta, setModoMeta] = useState<'semanal' | 'mensal'>('semanal');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [nec, prods, metasLista] = await Promise.all([
        calcularNecessidades(),
        listarProdutos(),
        listarMetas(),
      ]);
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

  const valorExibido = (prodId: number): string => {
    const semana = Number(metas[prodId] ?? 0);
    return modoMeta === 'mensal' ? String(Math.round(semana * 4)) : String(semana);
  };

  const setMetaValor = (prodId: number, v: string) => {
    if (modoMeta === 'mensal') {
      setMetas(prev => ({ ...prev, [prodId]: String(Math.round((Number(v) || 0) / 4)) }));
    } else {
      setMetas(prev => ({ ...prev, [prodId]: v }));
    }
  };

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} colors={[Colors.primary]} />}
    >
      {/* Meta de produção */}
      <View style={estilos.metaHeader}>
        <Text style={estilos.secaoTitulo}>🎯 Meta de produção</Text>
        <View style={estilos.toggle}>
          <TouchableOpacity
            style={[estilos.toggleBtn, modoMeta === 'semanal' && estilos.toggleBtnAtivo]}
            onPress={() => setModoMeta('semanal')}
          >
            <Text style={[estilos.toggleTxt, modoMeta === 'semanal' && estilos.toggleTxtAtivo]}>Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.toggleBtn, modoMeta === 'mensal' && estilos.toggleBtnAtivo]}
            onPress={() => setModoMeta('mensal')}
          >
            <Text style={[estilos.toggleTxt, modoMeta === 'mensal' && estilos.toggleTxtAtivo]}>Mensal</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={estilos.secaoDesc}>
        {modoMeta === 'semanal'
          ? 'Quantas unidades de cada produto você planeja fazer por semana'
          : 'Quantas unidades de cada produto você planeja fazer por mês (≈ 4 semanas)'}
      </Text>

      {produtos.map(p => (
        <View key={p.id} style={estilos.metaRow}>
          <Text style={estilos.metaNome}>{p.nome}</Text>
          <View style={estilos.metaInput}>
            <Input
              value={valorExibido(p.id)}
              onChangeText={v => setMetaValor(p.id, v)}
              keyboardType="numeric"
              estilo={{ marginBottom: 0 }}
            />
          </View>
          <Text style={estilos.metaUnidade}>/{modoMeta === 'semanal' ? 'sem' : 'mês'}</Text>
        </View>
      ))}

      <Botao titulo="Salvar Metas" onPress={salvarMetas} carregando={salvando} estilo={{ marginTop: Spacing.md }} />

      <Separador />

      {/* Necessidades calculadas */}
      {necessidades.length > 0 && (
        <>
          <Text style={estilos.secaoTitulo}>📦 Matérias-primas necessárias</Text>
          <Text style={estilos.secaoDesc}>Baseado nas suas metas semanais</Text>

          {necessidades.map(n => {
            const emb = n.qtd_por_embalagem && n.qtd_por_embalagem > 0;
            const embLabel = n.descricao_embalagem || 'pacote';
            const embSem = emb ? Math.ceil(n.necessidade_semana / n.qtd_por_embalagem!) : null;
            const embMes = emb ? Math.ceil(n.necessidade_mes / n.qtd_por_embalagem!) : null;
            const emb2m = emb ? Math.ceil(n.necessidade_2meses / n.qtd_por_embalagem!) : null;
            return (
            <Card key={n.materia_prima_id}>
              <Text style={estilos.necNome}>{n.nome}</Text>
              <View style={estilos.necGrid}>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>Semana</Text>
                  <Text style={estilos.necValor}>{n.necessidade_semana.toFixed(1)} {n.unidade}</Text>
                  {embSem !== null && <Text style={estilos.necEmb}>{embSem} {embLabel}(s)</Text>}
                </View>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>Mês</Text>
                  <Text style={estilos.necValor}>{n.necessidade_mes.toFixed(1)} {n.unidade}</Text>
                  {embMes !== null && <Text style={estilos.necEmb}>{embMes} {embLabel}(s)</Text>}
                </View>
                <View style={estilos.necItem}>
                  <Text style={estilos.necLabel}>2 meses</Text>
                  <Text style={estilos.necValor}>{n.necessidade_2meses.toFixed(1)} {n.unidade}</Text>
                  {emb2m !== null && <Text style={estilos.necEmb}>{emb2m} {embLabel}(s)</Text>}
                </View>
              </View>
              {n.falta_semana > 0 && (
                <Text style={estilos.necAlerta}>
                  ⚠️ Falta {n.falta_semana.toFixed(1)} {n.unidade} para a semana
                  {emb && embSem! > 0 ? ` (${Math.ceil(n.falta_semana / n.qtd_por_embalagem!)} ${embLabel}(s))` : ''}
                </Text>
              )}
              {n.falta_mes > 0 && (
                <Text style={estilos.necAlertaMes}>
                  📅 Falta {n.falta_mes.toFixed(1)} {n.unidade} para o mês
                  {emb ? ` (${Math.ceil(n.falta_mes / n.qtd_por_embalagem!)} ${embLabel}(s))` : ''}
                </Text>
              )}
              <Text style={estilos.necEstoque}>Em estoque: {n.estoque_atual.toFixed(1)} {n.unidade}</Text>
            </Card>
            );
          })}
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
  metaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  toggle: { flexDirection: 'row', backgroundColor: Colors.border, borderRadius: BorderRadius.full, padding: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full },
  toggleBtnAtivo: { backgroundColor: Colors.primary },
  toggleTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  toggleTxtAtivo: { color: '#fff' },
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
  necAlertaMes: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  necEmb: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  necEstoque: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});
