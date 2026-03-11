import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, TelaVazia, Botao, Badge } from '../../components/ui';
import { listarProdutosComCapacidade, excluirProduto } from '../../database/produtosService';
import { Produto } from '../../types';

export default function ProdutosListaScreen({ navigation }: any) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setProdutos(await listarProdutosComCapacidade());
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const confirmarExcluir = (p: Produto) => {
    Alert.alert('Excluir produto', `Excluir "${p.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirProduto(p.id);
        carregar();
      }},
    ]);
  };

  return (
    <View style={estilos.container}>
      <View style={estilos.busca}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={estilos.buscaInput}
          placeholder="Buscar produto..."
          placeholderTextColor={Colors.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={filtrados.length === 0 ? { flex: 1 } : { padding: Spacing.md }}
        ListEmptyComponent={<TelaVazia mensagem="Nenhum produto cadastrado" icone="🎂" />}
        renderItem={({ item }) => (
          <Card>
            <View style={estilos.prodRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('ProdutoForm', { produto: item })}
              >
                <Text style={estilos.nome}>{item.nome}</Text>
                <Text style={estilos.preco}>
                  Venda: {item.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {item.custo_producao !== undefined && item.custo_producao > 0 && (
                    <Text style={estilos.custo}>
                      {'  '}Custo: {item.custo_producao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  )}
                </Text>
                <View style={estilos.badgeRow}>
                  <Badge texto={`Estoque: ${item.estoque_atual}`} cor={item.estoque_atual > 0 ? 'verde' : 'vermelho'} />
                  {(item.pode_fazer_quantidade ?? 0) > 0 && (
                    <Badge texto={`Pode fazer: ${item.pode_fazer_quantidade}`} cor="roxo" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={estilos.acoes}>
                <TouchableOpacity
                  style={estilos.btnReceita}
                  onPress={() => navigation.navigate('Receita', { produtoId: item.id, produtoNome: item.nome })}
                >
                  <Ionicons name="list" size={18} color={Colors.secondary} />
                  <Text style={[estilos.btnTexto, { color: Colors.secondary }]}>Receita</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmarExcluir(item)} style={{ padding: 4, marginTop: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />

      <View style={estilos.fab}>
        <Botao titulo="+ Novo Produto" onPress={() => navigation.navigate('ProdutoForm', {})} />
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
  prodRow: { flexDirection: 'row', alignItems: 'flex-start' },
  nome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: 2 },
  preco: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600' },
  custo: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '400' },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  acoes: { alignItems: 'center', gap: 4, paddingLeft: 8 },
  btnReceita: { alignItems: 'center' },
  btnTexto: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  fab: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
