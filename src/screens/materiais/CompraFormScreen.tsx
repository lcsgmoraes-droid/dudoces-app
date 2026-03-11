import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  Image, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Separador, Card } from '../../components/ui';
import { registrarCompra, listarMateriasPrimas } from '../../database/materiaisService';
import { MateriaPrima } from '../../types';

export default function CompraFormScreen({ route, navigation }: any) {
  // Pode vir com materialId pré-selecionado ou nenhum (seleção livre)
  const preId: number | undefined = route.params?.materialId;

  const [materiais, setMateriais] = useState<MateriaPrima[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<MateriaPrima | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [foto, setFoto] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    listarMateriasPrimas().then(lista => {
      setMateriais(lista);
      if (preId) {
        const m = lista.find(x => x.id === preId);
        if (m) setMaterialSelecionado(m);
      }
    });
  }, []);

  const quantidadeNum = Number.parseFloat(quantidade) || 0;
  const valorPagoNum = Number.parseFloat(valorPago) || 0;
  const custoUnitarioCalculado = quantidadeNum > 0 ? valorPagoNum / quantidadeNum : 0;

  const tirarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar a câmera para tirar foto do cupom.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setFoto(result.assets[0].uri);
    }
  };

  const escolherFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar a galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFoto(result.assets[0].uri);
    }
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!materialSelecionado) e.material = 'Selecione a matéria-prima';
    if (!quantidade || Number.parseFloat(quantidade) <= 0) e.quantidade = 'Informe a quantidade';
    if (!valorPago || Number.parseFloat(valorPago) <= 0) e.custo = 'Informe o valor pago';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const qtd = Number.parseFloat(quantidade);
      const custoTotal = Number.parseFloat(valorPago);
      const custoUnitario = custoTotal / qtd;
      await registrarCompra({
        materia_prima_id: materialSelecionado!.id,
        quantidade: qtd,
        custo_unitario: custoUnitario,
        custo_total: custoTotal,
        data,
        foto_cupom: foto || undefined,
        observacao: observacao.trim() || undefined,
      });
      Alert.alert('✅ Registrado!', `Compra de ${materialSelecionado!.nome} salva. Estoque atualizado.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
        {/* Seleção da matéria-prima */}
        <Text style={estilos.rotulo}>Matéria-prima *</Text>
        {!!erros.material && <Text style={estilos.erro}>{erros.material}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {materiais.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[estilos.chip, materialSelecionado?.id === m.id && estilos.chipSel]}
              onPress={() => setMaterialSelecionado(m)}
            >
              <Text style={[estilos.chipTexto, materialSelecionado?.id === m.id && estilos.chipTextoSel]}>
                {m.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {materialSelecionado && (
          <Card estilo={{ marginBottom: Spacing.md, backgroundColor: Colors.primaryLight }}>
            <Text style={{ fontWeight: '700', color: Colors.primary }}>
              {materialSelecionado.nome} — Estoque atual: {materialSelecionado.estoque_atual} {materialSelecionado.unidade}
            </Text>
          </Card>
        )}

        <Input
          rotulo={materialSelecionado ? `Quantidade comprada (${materialSelecionado.unidade})` : 'Quantidade comprada'}
          obrigatorio
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="decimal-pad"
          placeholder="0"
          erro={erros.quantidade}
        />

        <Input
          rotulo="Valor total pago (R$)"
          obrigatorio
          value={valorPago}
          onChangeText={setValorPago}
          keyboardType="decimal-pad"
          placeholder="0,00"
          erro={erros.custo}
        />

        {valorPagoNum > 0 && quantidadeNum > 0 && (
          <Card estilo={{ backgroundColor: '#E8F5E9', marginBottom: Spacing.md }}>
            <Text style={{ fontWeight: '700', color: Colors.success, fontSize: FontSize.lg, textAlign: 'center' }}>
              Custo por {materialSelecionado?.unidade || 'unidade'}: {custoUnitarioCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              Baseado em {quantidadeNum} {materialSelecionado?.unidade || ''} por {valorPagoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </Card>
        )}

        <Input
          rotulo="Data da compra"
          value={data}
          onChangeText={setData}
          placeholder="AAAA-MM-DD"
        />

        {/* Foto do cupom */}
        <Text style={estilos.rotulo}>Foto do cupom fiscal (opcional)</Text>
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

        <Input
          rotulo="Observação"
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex: Comprado no Atacadão"
          multiline
          numberOfLines={2}
        />

        <Botao titulo="Registrar Compra" onPress={salvar} carregando={salvando} />
        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  erro: { fontSize: FontSize.xs, color: Colors.danger, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    marginRight: 8,
  },
  chipSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTexto: { fontWeight: '600', color: Colors.textSecondary, fontSize: FontSize.sm },
  chipTextoSel: { color: '#fff' },
  fotoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  fotoBotao: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  fotoBotaoTexto: { color: Colors.primary, fontWeight: '600' },
  fotoPreview: {
    width: '100%', height: 200, borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
  },
  removerFoto: { alignItems: 'center', marginTop: 8 },
});
