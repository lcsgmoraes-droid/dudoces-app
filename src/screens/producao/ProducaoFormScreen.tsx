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

function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function dataBRParaISO(valor: string): string | null {
  const partes = valor.split('/');
  if (partes.length !== 3) return null;
  const dia = Number(partes[0]);
  const mes = Number(partes[1]);
  const ano = Number(partes[2]);
  if (!dia || !mes || !ano || ano < 2000 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function mascararData(valor: string): string {
  const digitos = valor.replaceAll(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export default function ProducaoFormScreen({ route, navigation }: any) {
  const preSelecionado: number | undefined = route.params?.produtoId;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [data, setData] = useState(formatarDataBR(new Date()));
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

  const qtdNum = Number.parseInt(quantidade) || 0;
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
      await registrarProducao(produtoSelecionado.id, qtdNum, dataBRParaISO(data) || data, observacao.trim() || undefined);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          onChangeText={v => setData(mascararData(v))}
          keyboardType="numeric"
          maxLength={10}
          placeholder="dd/mm/aaaa"
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
