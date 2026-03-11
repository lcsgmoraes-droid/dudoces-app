import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Card, TelaVazia, Botao } from '../../components/ui';
import { listarClientes, excluirCliente } from '../../database/clientesService';
import { Cliente } from '../../types';

export default function ClientesListaScreen({ navigation }: any) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    const lista = await listarClientes();
    setClientes(lista);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  );

  const confirmarExcluir = (cliente: Cliente) => {
    Alert.alert('Excluir cliente', `Excluir ${cliente.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await excluirCliente(cliente.id);
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
          placeholder="Buscar por nome ou telefone..."
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
          <TelaVazia mensagem={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'} icone="👤" />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('ClienteForm', { cliente: item })}>
            <View style={estilos.clienteRow}>
              <View style={estilos.avatar}>
                <Text style={estilos.avatarLetra}>{item.nome[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.nome}>{item.nome}</Text>
                {item.telefone && (
                  <Text style={estilos.info}>📱 {item.telefone}</Text>
                )}
                {item.email && (
                  <Text style={estilos.info}>✉️ {item.email}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => confirmarExcluir(item)} style={estilos.excluirBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <View style={estilos.fab}>
        <Botao
          titulo="+ Novo Cliente"
          onPress={() => navigation.navigate('ClienteForm', {})}
        />
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
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  nome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  info: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  excluirBtn: { padding: 6 },
  fab: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
