import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, Badge, Botao } from '../../components/ui';
import { buscarVenda, marcarComoPago, excluirVenda } from '../../database/vendasService';
import { Venda } from '../../types';

export default function VendaDetalheScreen({ route, navigation }: any) {
  const { vendaId } = route.params;
  const [venda, setVenda] = useState<Venda | null>(null);

  useEffect(() => {
    buscarVenda(vendaId).then(setVenda);
  }, []);

  if (!venda) return null;

  const pago = (forma: string) => {
    marcarComoPago(vendaId, forma).then(() => buscarVenda(vendaId).then(setVenda));
  };

  const excluir = () => {
    Alert.alert('Excluir venda', 'Isso devolve os produtos ao estoque. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirVenda(vendaId);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
      {/* Header */}
      <Card estilo={{ backgroundColor: venda.status_pagamento === 'pago' ? '#E8F5E9' : '#FFF8E1' }}>
        <View style={estilos.headerRow}>
          <View>
            <Text style={estilos.clienteNome}>{venda.cliente_nome || '— Sem cliente —'}</Text>
            <Text style={estilos.data}>
              {new Date(venda.data + 'T00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Text>
          </View>
          <Badge
            texto={venda.status_pagamento === 'pago' ? '✓ Pago' : '⏳ Pendente'}
            cor={venda.status_pagamento === 'pago' ? 'verde' : 'amarelo'}
          />
        </View>
      </Card>

      {/* Itens */}
      <Text style={estilos.secaoTitulo}>🛍️ Produtos</Text>
      {(venda.itens || []).map(item => (
        <Card key={item.id} estilo={{ marginBottom: 8 }}>
          <View style={estilos.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemNome}>{item.produto_nome}</Text>
              <Text style={estilos.itemInfo}>
                {item.quantidade} × {item.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            <Text style={estilos.itemTotal}>
              {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </Card>
      ))}

      {/* Totais */}
      <Card>
        {venda.desconto > 0 && (
          <View style={estilos.totalRow}>
            <Text style={estilos.totalLabel}>Subtotal</Text>
            <Text>{venda.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
          </View>
        )}
        {venda.desconto > 0 && (
          <View style={estilos.totalRow}>
            <Text style={estilos.totalLabel}>Desconto</Text>
            <Text style={{ color: Colors.danger }}>
              -{venda.desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        )}
        <View style={[estilos.totalRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 }]}>
          <Text style={[estilos.totalLabel, { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary }]}>TOTAL</Text>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary }}>
            {venda.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
        {venda.forma_pagamento && (
          <Text style={estilos.formaPag}>Forma de pagamento: {venda.forma_pagamento}</Text>
        )}
      </Card>

      {venda.observacao && (
        <Card>
          <Text style={{ color: Colors.textSecondary, fontStyle: 'italic' }}>💬 {venda.observacao}</Text>
        </Card>
      )}

      {/* Ações */}
      {venda.status_pagamento === 'pendente' && (
        <>
          <Text style={[estilos.secaoTitulo, { marginTop: Spacing.md }]}>Marcar como pago com:</Text>
          <View style={estilos.pagRow}>
            {['Dinheiro', 'Pix', 'Cartão', 'Fiado'].map(f => (
              <TouchableOpacity key={f} style={estilos.btnPag} onPress={() => pago(f)}>
                <Text style={estilos.btnPagTexto}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={estilos.btnExcluir} onPress={excluir}>
        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
        <Text style={{ color: Colors.danger, fontWeight: '600' }}>Excluir venda</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteNome: { fontWeight: '800', fontSize: FontSize.xl, color: Colors.textPrimary },
  data: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  secaoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  itemInfo: { fontSize: FontSize.sm, color: Colors.textSecondary },
  itemTotal: { fontWeight: '700', color: Colors.primary, fontSize: FontSize.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  formaPag: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  pagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnPag: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success, flex: 1, alignItems: 'center',
  },
  btnPagTexto: { color: '#fff', fontWeight: '700' },
  btnExcluir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: Spacing.lg, padding: Spacing.sm,
  },
});
