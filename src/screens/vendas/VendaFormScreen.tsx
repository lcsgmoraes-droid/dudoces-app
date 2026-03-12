import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Card, Separador } from '../../components/ui';
import { registrarVenda } from '../../database/vendasService';
import { listarProdutos } from '../../database/produtosService';
import { listarClientes } from '../../database/clientesService';
import { Produto, Cliente, VendaItem } from '../../types';

type ItemVenda = {
  produto: Produto;
  quantidade: number;
  preco: string;
};

function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function mascararData(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
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

export default function VendaFormScreen({ navigation }: any) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [data, setData] = useState(formatarDataBR(new Date()));
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarProdutos, setMostrarProdutos] = useState(false);

  // Recarrega produtos TODA VEZ que a tela fica em foco (ex: volta da produção)
  useFocusEffect(useCallback(() => {
    listarProdutos().then(prods => setProdutos(prods.filter(p => p.estoque_atual > 0)));
  }, []));

  useEffect(() => {
    listarClientes().then(setClientes);
  }, []);

  const subtotal = itens.reduce((s, i) => s + (parseFloat(i.preco) || 0) * i.quantidade, 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto) || 0));

  const adicionarProduto = (p: Produto) => {
    const existente = itens.find(i => i.produto.id === p.id);
    if (existente) {
      setItens(prev => prev.map(i =>
        i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setItens(prev => [...prev, { produto: p, quantidade: 1, preco: String(p.preco_venda) }]);
    }
    setMostrarProdutos(false);
  };

  const alterarQtd = (prodId: number, delta: number) => {
    setItens(prev => {
      const novo = prev.map(i =>
        i.produto.id === prodId ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i
      ).filter(i => i.quantidade > 0);
      return novo;
    });
  };

  const alterarPreco = (prodId: number, novoPreco: string) => {
    setItens(prev => prev.map(i =>
      i.produto.id === prodId ? { ...i, preco: novoPreco } : i
    ));
  };

  const salvar = async () => {
    if (itens.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um produto.');
      return;
    }
    setSalvando(true);
    try {
      const dataISO = dataBRParaISO(data);
      if (!dataISO) {
        Alert.alert('Data inválida', 'Use o formato dd/mm/aaaa.');
        setSalvando(false);
        return;
      }

      const nomeCliente = clienteSelecionado?.nome || clienteNome.trim() || undefined;
      const vendaItens: Omit<VendaItem, 'id' | 'venda_id'>[] = itens.map(i => ({
        produto_id: i.produto.id,
        produto_nome: i.produto.nome,
        quantidade: i.quantidade,
        preco_unitario: parseFloat(i.preco) || i.produto.preco_venda,
        subtotal: (parseFloat(i.preco) || i.produto.preco_venda) * i.quantidade,
      }));

      await registrarVenda({
        cliente_id: clienteSelecionado?.id,
        cliente_nome: nomeCliente,
        data: dataISO,
        subtotal,
        desconto: parseFloat(desconto) || 0,
        total,
        status_pagamento: status,
        observacao: observacao.trim() || undefined,
      }, vendaItens);

      Alert.alert('✅ Venda registrada!', `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('❌ Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">

        {/* Itens da venda */}
        <Text style={estilos.secaoTitulo}>🛍️ Produtos</Text>
        {itens.map(item => (
          <Card key={item.produto.id} estilo={{ marginBottom: 8 }}>
            <View style={estilos.itemRow}>
              <Text style={estilos.itemNome}>{item.produto.nome}</Text>
            </View>
            <View style={estilos.itemControles}>
              <TouchableOpacity onPress={() => alterarQtd(item.produto.id, -1)} style={estilos.qtdBtn}>
                <Ionicons name="remove" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={estilos.qtdTexto}>{item.quantidade}</Text>
              <TouchableOpacity onPress={() => alterarQtd(item.produto.id, 1)} style={estilos.qtdBtn}>
                <Ionicons name="add" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={estilos.xTexto}>×</Text>
              <Input
                value={item.preco}
                onChangeText={v => alterarPreco(item.produto.id, v)}
                keyboardType="decimal-pad"
                estilo={{ width: 80, marginBottom: 0 }}
                style={{ textAlign: 'center' }}
                placeholder="0,00"
              />
              <Text style={{ color: Colors.textSecondary }}>=</Text>
              <Text style={estilos.subTotal}>
                {((parseFloat(item.preco) || 0) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          </Card>
        ))}

        <TouchableOpacity style={estilos.btnAdicionar} onPress={() => setMostrarProdutos(!mostrarProdutos)}>
          <Ionicons name="add-circle" size={20} color={Colors.primary} />
          <Text style={estilos.btnAdicionarTexto}>Adicionar produto</Text>
        </TouchableOpacity>

        {mostrarProdutos && (
          <Card estilo={{ maxHeight: 250 }}>
            <FlatList
              data={produtos}
              keyExtractor={p => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={estilos.prodOpcao} onPress={() => adicionarProduto(item)}>
                  <View style={estilos.prodOpcaoRow}>
                    {item.foto
                      ? <Image source={{ uri: item.foto }} style={estilos.prodOpcaoFoto} />
                      : <View style={estilos.prodOpcaoFotoPlaceholder}><Text style={{ fontSize: 18 }}>🍰</Text></View>
                    }
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.prodOpcaoNome}>{item.nome}</Text>
                      <Text style={estilos.prodOpcaoInfo}>
                        Estoque: {item.estoque_atual} · {item.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 8 }}>Sem produtos em estoque</Text>}
            />
          </Card>
        )}

        <Separador />

        {/* Resumo */}
        <Card estilo={{ backgroundColor: Colors.primaryLight }}>
          <View style={estilos.resumoRow}>
            <Text style={estilos.resumoLabel}>Subtotal</Text>
            <Text style={estilos.resumoValor}>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
          </View>
          {parseFloat(desconto) > 0 && (
            <View style={estilos.resumoRow}>
              <Text style={estilos.resumoLabel}>Desconto</Text>
              <Text style={[estilos.resumoValor, { color: Colors.danger }]}>
                -{(parseFloat(desconto) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          )}
          <View style={[estilos.resumoRow, { marginTop: 4 }]}>
            <Text style={[estilos.resumoLabel, { fontSize: FontSize.lg, fontWeight: '800' }]}>Total</Text>
            <Text style={[estilos.resumoValor, { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary }]}>
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </Card>

        <Input
          rotulo="Desconto (R$)"
          value={desconto}
          onChangeText={setDesconto}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <Separador espaco={Spacing.sm} />

        {/* Cliente */}
        <Text style={estilos.secaoTitulo}>👤 Cliente</Text>
        <TouchableOpacity style={estilos.btnCliente} onPress={() => setMostrarClientes(!mostrarClientes)}>
          <Text style={{ color: clienteSelecionado ? Colors.textPrimary : Colors.textMuted, flex: 1 }}>
            {clienteSelecionado?.nome || 'Selecionar cliente cadastrado...'}
          </Text>
          <Ionicons name={mostrarClientes ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {clienteSelecionado && (
          <TouchableOpacity onPress={() => setClienteSelecionado(null)} style={{ marginBottom: 4 }}>
            <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>✕ Remover seleção</Text>
          </TouchableOpacity>
        )}
        {mostrarClientes && (
          <Card estilo={{ maxHeight: 200, marginBottom: Spacing.sm }}>
            <FlatList
              data={clientes}
              keyExtractor={c => String(c.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={estilos.clienteOpcao}
                  onPress={() => { setClienteSelecionado(item); setClienteNome(''); setMostrarClientes(false); }}
                >
                  <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.nome}</Text>
                  {item.telefone && <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>{item.telefone}</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 8 }}>Sem clientes cadastrados</Text>}
            />
          </Card>
        )}

        {!clienteSelecionado && (
          <Input
            rotulo="Ou digite o nome do cliente"
            value={clienteNome}
            onChangeText={setClienteNome}
            placeholder="Nome do cliente"
          />
        )}

        {/* Pagamento */}
        <Text style={estilos.secaoTitulo}>💰 Pagamento</Text>
        <View style={estilos.statusRow}>
          <TouchableOpacity
            style={[estilos.statusOpcao, status === 'pago' && { borderColor: Colors.success, backgroundColor: '#E8F5E9' }]}
            onPress={() => setStatus('pago')}
          >
            <Text style={[estilos.statusTexto, status === 'pago' && { color: Colors.success }]}>✓ Recebido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.statusOpcao, status === 'pendente' && { borderColor: Colors.warning, backgroundColor: '#FFF8E1' }]}
            onPress={() => setStatus('pendente')}
          >
            <Text style={[estilos.statusTexto, status === 'pendente' && { color: Colors.warning }]}>⏳ A receber</Text>
          </TouchableOpacity>
        </View>

        <Input rotulo="Data da venda" value={data} onChangeText={v => setData(mascararData(v))} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} />
        <Input rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="Anotações..." multiline numberOfLines={2} />

        <Botao titulo="💰 Confirmar Venda" onPress={salvar} carregando={salvando} desabilitado={itens.length === 0} />
        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  secaoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  itemRow: { marginBottom: 4 },
  itemNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  itemControles: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  qtdBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qtdTexto: { fontWeight: '800', fontSize: FontSize.lg, color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },
  xTexto: { color: Colors.textMuted, fontWeight: '600' },
  subTotal: { fontWeight: '700', color: Colors.primary, fontSize: FontSize.md },
  btnAdicionar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  btnAdicionarTexto: { color: Colors.primary, fontWeight: '600' },
  prodOpcao: {
    padding: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  prodOpcaoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodOpcaoFoto: { width: 44, height: 44, borderRadius: 8 },
  prodOpcaoFotoPlaceholder: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  prodOpcaoNome: { fontWeight: '600', color: Colors.textPrimary },
  prodOpcaoInfo: { fontSize: FontSize.xs, color: Colors.textMuted },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  resumoLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  resumoValor: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  btnCliente: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  clienteOpcao: { padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statusOpcao: {
    flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  statusTexto: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textSecondary },
});
