import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Card, Separador } from '../../components/ui';
import { registrarProducao } from '../../database/producaoService';
import { listarProdutosComCapacidade } from '../../database/produtosService';
import { Produto } from '../../types';

export default function ProducaoFormScreen({ route, navigation }: any) {
  const preSelecionado: number | undefined = route.params?.produtoId;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarProdutosComCapacidade().then(lista => {
      setProdutos(lista);
      if (preSelecionado) {
        const p = lista.find(x => x.id === preSelecionado);
        if (p) setProdutoSelecionado(p);
      }
    });
  }, []);

  const qtdNum = parseInt(quantidade) || 0;
  const podeFazer = produtoSelecionado?.pode_fazer_quantidade ?? 0;
  const estoqueSuficiente = qtdNum <= podeFazer;

  const salvar = async () => {
    if (!produtoSelecionado) {
      Alert.alert('Atenção', 'Selecione um produto.');
      return;
    }
    if (qtdNum <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida.');
      return;
    }
    setSalvando(true);
    try {
      await registrarProducao(produtoSelecionado.id, qtdNum, data, observacao.trim() || undefined);
      Alert.alert('✅ Produção registrada!', `${qtdNum}x ${produtoSelecionado.nome} adicionado ao estoque.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('❌ Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.secaoTitulo}>O que você fez hoje? 👩‍🍳</Text>

        {/* Seleção de produto */}
        <Text style={estilos.rotulo}>Produto *</Text>
        {produtos.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[
              estilos.prodCard,
              produtoSelecionado?.id === p.id && estilos.prodCardSel
            ]}
            onPress={() => setProdutoSelecionado(p)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[estilos.prodNome, produtoSelecionado?.id === p.id && { color: Colors.primary }]}>
                {p.nome}
              </Text>
              <Text style={estilos.prodInfo}>
                {p.pode_fazer_quantidade !== undefined && p.pode_fazer_quantidade > 0
                  ? `✅ Dá pra fazer: ${p.pode_fazer_quantidade}`
                  : '⚠️ Sem estoque suficiente'}
                {'  '}· Estoque atual: {p.estoque_atual}
              </Text>
            </View>
            {produtoSelecionado?.id === p.id && (
              <Text style={{ fontSize: 20 }}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        {produtos.length === 0 && (
          <Text style={{ color: Colors.textMuted, marginBottom: Spacing.md }}>
            Cadastre produtos com receita antes de registrar produção.
          </Text>
        )}

        <Separador />

        {produtoSelecionado && (
          <Card estilo={{
            backgroundColor: estoqueSuficiente ? '#E8F5E9' : '#FFEBEE',
            marginBottom: Spacing.md,
          }}>
            <Text style={{ fontWeight: '700', color: estoqueSuficiente ? Colors.success : Colors.danger, textAlign: 'center' }}>
              {estoqueSuficiente
                ? `✅ Estoque suficiente para ${podeFazer} unidade(s)`
                : `⚠️ Estoque insuficiente! Máximo: ${podeFazer}`}
            </Text>
          </Card>
        )}

        <Input
          rotulo="Quantidade produzida"
          obrigatorio
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="numeric"
          placeholder="1"
        />

        <Input
          rotulo="Data de produção"
          value={data}
          onChangeText={setData}
          placeholder="AAAA-MM-DD"
        />

        <Input
          rotulo="Observação (opcional)"
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex: lote para encomenda da Maria"
          multiline
          numberOfLines={2}
        />

        <Botao
          titulo="✅ Registrar Produção"
          onPress={salvar}
          carregando={salvando}
          desabilitado={!produtoSelecionado || qtdNum <= 0}
        />
        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  secaoTitulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  prodCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, marginBottom: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  prodCardSel: {
    borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  prodNome: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary },
  prodInfo: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
