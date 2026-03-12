import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, View, Text, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Separador } from '../../components/ui';
import { salvarProduto, atualizarProduto } from '../../database/produtosService';
import { Produto } from '../../types';

export default function ProdutoFormScreen({ route, navigation }: any) {
  const prod: Produto | undefined = route.params?.produto;
  const editando = !!prod;

  const [nome, setNome] = useState(prod?.nome || '');
  const [descricao, setDescricao] = useState(prod?.descricao || '');
  const [preco, setPreco] = useState(String(prod?.preco_venda ?? ''));
  const [estoque, setEstoque] = useState(String(prod?.estoque_atual ?? '0'));
  const [unidade, setUnidade] = useState(prod?.unidade && prod.unidade !== 'fatia' ? prod.unidade : 'unidade');
  const [rendimentoFatias, setRendimentoFatias] = useState(String(prod?.rendimento_fatias ?? '1'));
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [tipoVenda, setTipoVenda] = useState<'unidade' | 'fatia'>(prod?.unidade === 'fatia' ? 'fatia' : 'unidade');

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!preco || Number.parseFloat(preco) < 0) e.preco = 'Informe o preço de venda';
    if (!rendimentoFatias || Number.parseFloat(rendimentoFatias) <= 0) e.rendimento = 'Informe o rendimento em fatias';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco_venda: Number.parseFloat(preco) || 0,
        estoque_atual: tipoVenda === 'fatia' ? 0 : (Number.parseFloat(estoque) || 0),
        unidade: tipoVenda === 'fatia' ? 'fatia' : (unidade.trim() || 'unidade'),
        rendimento_fatias: Number.parseFloat(rendimentoFatias) || 1,
      };
      if (editando) {
        if (!prod) throw new Error('Produto inválido');
        await atualizarProduto(prod.id, dados);
      } else {
        await salvarProduto(dados);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
        <Input
          rotulo="Nome do produto"
          obrigatorio
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Torta de chocolate, Brigadeiro"
          erro={erros.nome}
          autoFocus
        />
        <Input
          rotulo="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: Torta de 2kg recheada com creme"
          multiline
          numberOfLines={2}
        />
        <Input
          rotulo="Preço de venda (R$)"
          obrigatorio
          value={preco}
          onChangeText={setPreco}
          keyboardType="decimal-pad"
          placeholder="0,00"
          erro={erros.preco}
        />
        <Text style={estilos.rotulo}>Tipo de venda</Text>
        <View style={estilos.tipoRow}>
          <TouchableOpacity
            style={[estilos.tipoBtn, tipoVenda === 'unidade' && estilos.tipoBtnAtivo]}
            onPress={() => setTipoVenda('unidade')}
          >
            <Text style={[estilos.tipoTxt, tipoVenda === 'unidade' && estilos.tipoTxtAtivo]}>🎂 Por inteiro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.tipoBtn, tipoVenda === 'fatia' && estilos.tipoBtnAtivo]}
            onPress={() => setTipoVenda('fatia')}
          >
            <Text style={[estilos.tipoTxt, tipoVenda === 'fatia' && estilos.tipoTxtAtivo]}>🍰 Por fatia</Text>
          </TouchableOpacity>
        </View>
        {tipoVenda === 'unidade' && (
          <Input
            rotulo="Unidade"
            value={unidade}
            onChangeText={setUnidade}
            placeholder="unidade, kg, litro, ..."
          />
        )}
        <Input
          rotulo={tipoVenda === 'fatia' ? 'Fatias por receita' : 'Rendimento da receita (fatias)'}
          value={rendimentoFatias}
          onChangeText={setRendimentoFatias}
          keyboardType="decimal-pad"
          placeholder="Ex: 10"
          erro={erros.rendimento}
        />
        {tipoVenda === 'fatia' ? (
          <View style={estilos.porFatiaInfo}>
            <Text style={estilos.porFatiaTitulo}>🍰 por fatia · {rendimentoFatias || '?'} fatias por receita</Text>
            <Text style={estilos.porFatiaDesc}>O estoque é gerenciado automaticamente pela produção</Text>
          </View>
        ) : (
          <Input
            rotulo="Estoque inicial"
            value={estoque}
            onChangeText={setEstoque}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        )}
        <Separador />
        <Botao
          titulo={editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
          onPress={salvar}
          carregando={salvando}
        />
        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  tipoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tipoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tipoBtnAtivo: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tipoTxt: { fontWeight: '700', color: Colors.textSecondary, fontSize: FontSize.sm },
  tipoTxtAtivo: { color: Colors.primary },
  porFatiaInfo: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center',
  },
  porFatiaTitulo: { fontWeight: '700', color: Colors.primary, fontSize: FontSize.md },
  porFatiaDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
