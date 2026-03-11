import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, TelaVazia, Botao, Badge } from '../../components/ui';
import { listarVendas, marcarComoPago, excluirVenda } from '../../database/vendasService';
import { Venda } from '../../types';

export default function VendasListaScreen({ navigation }: any) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'pendente' | 'pago'>('todas');

  const carregar = useCallback(async () => {
    setVendas(await listarVendas());
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const filtradas = vendas.filter(v => filtro === 'todas' || v.status_pagamento === filtro);

  const totalPendente = vendas
    .filter(v => v.status_pagamento === 'pendente')
    .reduce((s, v) => s + v.total, 0);

  const confirmarPago = (v: Venda) => {
    Alert.alert('Marcar como pago', `${v.cliente_nome || 'Cliente'} — ${v.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: '💵 Dinheiro', onPress: () => { marcarComoPago(v.id, 'Dinheiro').then(carregar); } },
      { text: '💳 Pix', onPress: () => { marcarComoPago(v.id, 'Pix').then(carregar); } },
    ]);
  };

  const confirmarExcluir = (v: Venda) => {
    Alert.alert('Excluir venda', 'Excluir essa venda devolve os produtos ao estoque. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirVenda(v.id);
        carregar();
      }},
    ]);
  };

  return (
    <View style={estilos.container}>
      {/* Resumo */}
      {totalPendente > 0 && (
        <View style={estilos.banner}>
          <Ionicons name="time-outline" size={18} color={Colors.warning} />
          <Text style={estilos.bannerTexto}>
            A receber: {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      )}

      {/* Filtros */}
      <View style={estilos.filtros}>
        {(['todas', 'pendente', 'pago'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[estilos.filtro, filtro === f && estilos.filtroAtivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[estilos.filtroTexto, filtro === f && estilos.filtroTextoAtivo]}>
              {f === 'todas' ? 'Todas' : f === 'pendente' ? 'A receber' : 'Recebido'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={filtradas.length === 0 ? { flex: 1 } : { padding: Spacing.md }}
        ListEmptyComponent={<TelaVazia mensagem="Nenhuma venda encontrada" icone="💳" />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('VendaDetalhe', { vendaId: item.id })}>
            <View style={estilos.vendaRow}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.clienteNome}>{item.cliente_nome || '— Sem cliente —'}</Text>
                <Text style={estilos.vendaData}>
                  {new Date(item.data + 'T00:00').toLocaleDateString('pt-BR')}
                  {item.forma_pagamento && ` · ${item.forma_pagamento}`}
                </Text>
              </View>
              <View style={estilos.vendaRight}>
                <Text style={estilos.vendaTotal}>
                  {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
                <Badge
                  texto={item.status_pagamento === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                  cor={item.status_pagamento === 'pago' ? 'verde' : 'amarelo'}
                />
              </View>
            </View>

            {item.status_pagamento === 'pendente' && (
              <View style={estilos.vendaAcoes}>
                <TouchableOpacity style={estilos.btnPago} onPress={() => confirmarPago(item)}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={[estilos.btnTexto, { color: Colors.success }]}>Marcar pago</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmarExcluir(item)} style={estilos.btnExcluir}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />

      <View style={estilos.fab}>
        <Botao titulo="💰 Nova Venda" onPress={() => navigation.navigate('VendaForm', {})} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bannerTexto: { fontWeight: '700', color: Colors.warning },
  filtros: {
    flexDirection: 'row', padding: Spacing.sm,
    gap: 8, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filtro: {
    flex: 1, paddingVertical: 8, borderRadius: BorderRadius.full,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  filtroAtivo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filtroTexto: { fontWeight: '600', fontSize: FontSize.sm, color: Colors.textSecondary },
  filtroTextoAtivo: { color: '#fff' },
  vendaRow: { flexDirection: 'row', alignItems: 'center' },
  clienteNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  vendaData: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  vendaRight: { alignItems: 'flex-end', gap: 4 },
  vendaTotal: { fontWeight: '800', fontSize: FontSize.lg, color: Colors.textPrimary },
  vendaAcoes: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  btnPago: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  btnTexto: { fontWeight: '600', fontSize: FontSize.sm },
  btnExcluir: { padding: 4 },
  fab: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
