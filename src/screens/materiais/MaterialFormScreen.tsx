import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, Image,
  KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Separador, Card } from '../../components/ui';
import { salvarMateriaPrima, atualizarMateriaPrima } from '../../database/materiaisService';
import { MateriaPrima } from '../../types';

const UNIDADES = ['g', 'kg', 'ml', 'L', 'unidade', 'cx', 'pacote', 'colher', 'xícara'];

export default function MaterialFormScreen({ route, navigation }: any) {
  const mat: MateriaPrima | undefined = route.params?.material;
  const editando = !!mat;

  const [nome, setNome] = useState(mat?.nome || '');
  const [unidade, setUnidade] = useState(mat?.unidade || 'g');
  const [custoUltima, setCustoUltima] = useState(String(mat?.custo_ultima_compra ?? ''));
  const [custoMedio, setCustoMedio] = useState(String(mat?.custo_medio ?? ''));
  const [estoque, setEstoque] = useState(String(mat?.estoque_atual ?? '0'));
  const [estoqueMin, setEstoqueMin] = useState(String(mat?.estoque_minimo ?? '0'));
  const [usarMedio, setUsarMedio] = useState(mat?.usar_custo_medio === 1);
  const [foto, setFoto] = useState<string | null>(mat?.foto || null);
  const [qtdPorEmbalagem, setQtdPorEmbalagem] = useState(String(mat?.qtd_por_embalagem || ''));
  const [descricaoEmbalagem, setDescricaoEmbalagem] = useState(mat?.descricao_embalagem || '');
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        unidade,
        custo_ultima_compra: Number.parseFloat(custoUltima) || 0,
        custo_medio: Number.parseFloat(custoMedio) || 0,
        estoque_atual: Number.parseFloat(estoque) || 0,
        estoque_minimo: Number.parseFloat(estoqueMin) || 0,
        usar_custo_medio: usarMedio ? 1 : 0,
        foto: foto || undefined,
        qtd_por_embalagem: Number.parseFloat(qtdPorEmbalagem) || 0,
        descricao_embalagem: descricaoEmbalagem.trim() || undefined,
      };
      if (editando) {
        await atualizarMateriaPrima(mat.id, dados);
      } else {
        await salvarMateriaPrima(dados);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  const tirarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Precisamos acessar a câmera.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setFoto(result.assets[0].uri);
  };

  const escolherFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Precisamos acessar a galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setFoto(result.assets[0].uri);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Input
          rotulo="Nome da matéria-prima"
          obrigatorio
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Chocolate ao leite, Farinha de trigo"
          erro={erros.nome}
          autoFocus
        />

        {/* Unidade de medida */}
        <Text style={estilos.rotulo}>Unidade de medida *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {UNIDADES.map(u => (
            <TouchableOpacity
              key={u}
              style={[estilos.chipUnidade, unidade === u && estilos.chipSelecionado]}
              onPress={() => setUnidade(u)}
            >
              <Text style={[estilos.chipTexto, unidade === u && estilos.chipTextoSelecionado]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Input
          rotulo={`Estoque inicial (${unidade})`}
          value={estoque}
          onChangeText={setEstoque}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Input
          rotulo={`Estoque mínimo para alerta (${unidade})`}
          value={estoqueMin}
          onChangeText={setEstoqueMin}
          keyboardType="decimal-pad"
          placeholder="0 = sem alerta"
        />

        {/* Custos */}
        <Card estilo={{ marginBottom: Spacing.md }}>
          <Text style={estilos.cardTitulo}>💰 Configuração de custo</Text>
          <Input
            rotulo={`Custo da última compra (R$/${unidade})`}
            value={custoUltima}
            onChangeText={setCustoUltima}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <Input
            rotulo={`Custo médio calculado (R$/${unidade})`}
            value={custoMedio}
            onChangeText={setCustoMedio}
            keyboardType="decimal-pad"
            placeholder="Calculado automaticamente ao registrar compras"
          />
          <Text style={estilos.rotulo}>Qual custo usar nos cálculos?</Text>
          <View style={estilos.opcoesCusto}>
            <TouchableOpacity
              style={[estilos.opcao, !usarMedio && estilos.opcaoSelecionada]}
              onPress={() => setUsarMedio(false)}
            >
              <Text style={[estilos.opcaoTexto, !usarMedio && estilos.opcaoTextoSelecionado]}>
                Última compra
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.opcao, usarMedio && estilos.opcaoSelecionada]}
              onPress={() => setUsarMedio(true)}
            >
              <Text style={[estilos.opcaoTexto, usarMedio && estilos.opcaoTextoSelecionado]}>
                Custo médio
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={estilos.dica}>
            💡 Use "custo médio" quando mistura pacotes antigos e novos. O sistema calcula automaticamente ao registrar compras.
          </Text>
        </Card>

        <Botao
          titulo={editando ? 'Salvar Alterações' : 'Cadastrar Matéria-Prima'}
          onPress={salvar}
          carregando={salvando}
        />

        {/* Foto */}
        <Separador />
        <Text style={estilos.rotulo}>Foto da matéria-prima (opcional)</Text>
        <View style={estilos.fotoRow}>
          <TouchableOpacity style={estilos.fotoBotao} onPress={tirarFoto}>
            <Ionicons name="camera" size={22} color={Colors.primary} />
            <Text style={estilos.fotoBotaoTexto}>Tirar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.fotoBotao} onPress={escolherFoto}>
            <Ionicons name="image" size={22} color={Colors.primary} />
            <Text style={estilos.fotoBotaoTexto}>Galeria</Text>
          </TouchableOpacity>
        </View>
        {foto && (
          <View style={{ marginBottom: Spacing.md }}>
            <Image source={{ uri: foto }} style={estilos.fotoPreview} />
            <TouchableOpacity onPress={() => setFoto(null)} style={estilos.removerFoto}>
              <Text style={{ color: Colors.danger, fontWeight: '600' }}>✕ Remover foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Apresentação padrão de compra */}
        <Separador />
        <Card estilo={{ marginBottom: Spacing.md }}>
          <Text style={estilos.cardTitulo}>📦 Apresentação padrão de compra</Text>
          <Text style={estilos.dica}>Configure como costuma comprar (ex: pote de 650g). Será pré-preenchido na hora de registrar uma compra.</Text>
          <Input
            rotulo={`Qtd por embalagem (${unidade})`}
            value={qtdPorEmbalagem}
            onChangeText={setQtdPorEmbalagem}
            keyboardType="decimal-pad"
            placeholder={`Ex: 650 (${unidade})`}
          />
          <Input
            rotulo="Tipo de embalagem"
            value={descricaoEmbalagem}
            onChangeText={setDescricaoEmbalagem}
            placeholder="Ex: pote, pacote, caixa, lata"
          />
          {!!qtdPorEmbalagem && !!descricaoEmbalagem && (
            <Text style={[estilos.dica, { color: Colors.primary, marginTop: 4 }]}>
              Exemplo: 1 {descricaoEmbalagem} de {qtdPorEmbalagem}{unidade}
            </Text>
          )}
        </Card>

        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  cardTitulo: { fontWeight: '700', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  chipUnidade: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    marginRight: 8,
  },
  chipSelecionado: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTexto: { fontWeight: '600', color: Colors.textSecondary, fontSize: FontSize.sm },
  chipTextoSelecionado: { color: '#fff' },
  opcoesCusto: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  opcao: {
    flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  opcaoSelecionada: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  opcaoTexto: { fontWeight: '600', color: Colors.textSecondary },
  opcaoTextoSelecionado: { color: Colors.primary },
  dica: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  fotoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  fotoBotao: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  fotoBotaoTexto: { color: Colors.primary, fontWeight: '600' },
  fotoPreview: { width: '100%', height: 180, borderRadius: BorderRadius.md, backgroundColor: Colors.border },
  removerFoto: { alignItems: 'center', marginTop: 8 },
});
