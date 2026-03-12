import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../theme';
import { Card, TelaVazia, Botao } from '../../components/ui';
import { listarProducoes, excluirProducao } from '../../database/producaoService';
import { Producao } from '../../types';

export default function ProducaoListaScreen({ navigation }: any) {
  const [producoes, setProducoes] = useState<Producao[]>([]);

  const carregar = useCallback(async () => {
    setProducoes(await listarProducoes());
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const confirmarExcluir = (p: Producao) => {
    Alert.alert(
      'Excluir produção',
      `Excluir essa produção vai devolver os ingredientes ao estoque de matérias-primas e remover ${p.produto_nome} do estoque de produtos. Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          await excluirProducao(p.id);
          carregar();
        }},
      ]
    );
  };

  return (
    <View style={estilos.container}>
      <FlatList
        data={producoes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={producoes.length === 0 ? { flex: 1 } : { padding: Spacing.md }}
        ListEmptyComponent={<TelaVazia mensagem="Nenhuma produção registrada ainda" icone="👩‍🍳" />}
        renderItem={({ item }) => (
          <Card>
            <View style={estilos.row}>
              <View style={estilos.iconCircle}>
                <Text style={{ fontSize: 22 }}>🍰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.nome}>{item.produto_nome}</Text>
                <Text style={estilos.info}>
                  {new Date(item.data + 'T00:00').toLocaleDateString('pt-BR')}
                  {item.observacao ? ` · ${item.observacao}` : ''}
                </Text>
                {item.custo_total > 0 && (
                  <Text style={estilos.custo}>
                    Custo: {item.custo_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                )}
              </View>
              <View style={estilos.qtdBox}>
                <Text style={estilos.qtd}>{item.quantidade}</Text>
                <Text style={estilos.qtdLabel}>receita(s)</Text>
              </View>
              <TouchableOpacity onPress={() => confirmarExcluir(item)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={17} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <View style={estilos.fab}>
        <Botao titulo="👩‍🍳 Registrar Produção" onPress={() => navigation.navigate('ProducaoForm', {})} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  info: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  custo: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  qtdBox: { alignItems: 'center', marginRight: 4 },
  qtd: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  qtdLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  fab: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
