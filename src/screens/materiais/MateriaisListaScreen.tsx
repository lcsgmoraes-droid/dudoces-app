import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, TelaVazia, Botao, Badge } from '../../components/ui';
import { listarMateriasPrimas, excluirMateriaPrima } from '../../database/materiaisService';
import { MateriaPrima } from '../../types';

export default function MateriaisListaScreen({ navigation }: any) {
  const [materiais, setMateriais] = useState<MateriaPrima[]>([]);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setMateriais(await listarMateriasPrimas());
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const filtrados = materiais.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const confirmarExcluir = (m: MateriaPrima) => {
    Alert.alert('Excluir', `Excluir "${m.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirMateriaPrima(m.id);
        carregar();
      }},
    ]);
  };

  const formataMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const alertaEstoque = (m: MateriaPrima) => {
    if (m.estoque_minimo <= 0) return null;
    if (m.estoque_atual <= m.estoque_minimo) return 'critico';
    if (m.estoque_atual <= m.estoque_minimo * 1.2) return 'baixo';
    return null;
  };

  return (
    <View style={estilos.container}>
      <View style={estilos.busca}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={estilos.buscaInput}
          placeholder="Buscar matéria-prima..."
          placeholderTextColor={Colors.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={filtrados.length === 0 ? { flex: 1 } : { padding: Spacing.md }}
        ListEmptyComponent={
          <TelaVazia mensagem="Nenhuma matéria-prima cadastrada" icone="🧂" />
        }
        renderItem={({ item }) => {
          const alerta = alertaEstoque(item);
          const custo = item.usar_custo_medio ? item.custo_medio : item.custo_ultima_compra;
          return (
            <Card onPress={() => navigation.navigate('MaterialForm', { material: item })}>
              {alerta && (
                <View style={[estilos.alertaStripe, {
                  backgroundColor: alerta === 'critico' ? '#FFEBEE' : '#FFF8E1'
                }]}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700',
                    color: alerta === 'critico' ? Colors.danger : Colors.warning }}>
                    {alerta === 'critico' ? '🚨 Estoque crítico!' : '⚠️ Estoque baixo'}
                  </Text>
                </View>
              )}
              <View style={estilos.materialRow}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nome}>{item.nome}</Text>
                  <Text style={estilos.info}>
                    Estoque: <Text style={{ fontWeight: '700', color: alerta ? Colors.danger : Colors.success }}>
                      {item.estoque_atual} {item.unidade}
                    </Text>
                    {item.estoque_minimo > 0 && ` (mín: ${item.estoque_minimo})`}
                  </Text>
                  <Text style={estilos.info}>
                    Custo: <Text style={{ fontWeight: '700' }}>{formataMoeda(custo)}/{item.unidade}</Text>
                    {' '}
                    <Text style={{ color: Colors.textMuted }}>
                      ({item.usar_custo_medio ? 'custo médio' : 'última compra'})
                    </Text>
                  </Text>
                </View>
                <View style={estilos.acoes}>
                  <TouchableOpacity
                    style={estilos.btnCompra}
                    onPress={() => navigation.navigate('CompraForm', { materialId: item.id, materialNome: item.nome })}
                  >
                    <Ionicons name="add-circle" size={22} color={Colors.success} />
                    <Text style={estilos.btnCompraTexto}>Compra</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarExcluir(item)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <View style={estilos.fab}>
        <Botao titulo="+ Nova Matéria-Prima" onPress={() => navigation.navigate('MaterialForm', {})} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  busca: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  buscaInput: { flex: 1, paddingVertical: 12, fontSize: FontSize.md, color: Colors.textPrimary },
  alertaStripe: {
    padding: 6, borderRadius: 6, marginBottom: 8,
    alignItems: 'center',
  },
  materialRow: { flexDirection: 'row', alignItems: 'flex-start' },
  nome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: 2 },
  info: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  acoes: { alignItems: 'center', gap: 8 },
  btnCompra: { alignItems: 'center' },
  btnCompraTexto: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  fab: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
