import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { Input, Botao, Card, Separador } from '../../components/ui';
import { listarReceita, salvarReceita, calcularCustoProduto, buscarProduto, atualizarRendimentoProduto } from '../../database/produtosService';
import { listarMateriasPrimas } from '../../database/materiaisService';
import { MateriaPrima } from '../../types';

export default function ReceitaScreen({ route, navigation }: any) {
  const { produtoId, produtoNome } = route.params;

  const [materiais, setMateriais] = useState<MateriaPrima[]>([]);
  const [itens, setItens] = useState<Array<{ materia_prima_id: number; materia_prima_nome: string; quantidade: string; unidade: string }>>([]);
  const [custoPorFatia, setCustoPorFatia] = useState(0);
  const [rendimentoFatias, setRendimentoFatias] = useState('1');
  const [apresentacao, setApresentacao] = useState<'receita' | 'fatia'>('receita');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `Receita: ${produtoNome}` });
    Promise.all([
      listarMateriasPrimas(),
      listarReceita(produtoId),
      calcularCustoProduto(produtoId),
      buscarProduto(produtoId),
    ]).then(([mats, receita, custo, produto]) => {
      setMateriais(mats);
      setItens(receita.map(r => ({
        materia_prima_id: r.materia_prima_id,
        materia_prima_nome: r.materia_prima_nome || '',
        quantidade: String(r.quantidade),
        unidade: r.unidade || '',
      })));
      setCustoPorFatia(custo);
      setRendimentoFatias(String(produto?.rendimento_fatias || 1));
    });
  }, []);

  const adicionarIngrediente = (m: MateriaPrima) => {
    if (itens.some(i => i.materia_prima_id === m.id)) {
      Alert.alert('Já adicionado', 'Este ingrediente já está na receita.');
      return;
    }
    setItens(prev => [...prev, {
      materia_prima_id: m.id,
      materia_prima_nome: m.nome,
      quantidade: '',
      unidade: m.unidade,
    }]);
  };

  const atualizarQtd = (idx: number, qtd: string) => {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, quantidade: qtd } : item));
  };

  const removerItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    const validos = itens.filter(i => i.quantidade && Number.parseFloat(i.quantidade) > 0);
    const rendimento = Number.parseFloat(rendimentoFatias) || 0;
    if (validos.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um ingrediente com quantidade.');
      return;
    }
    if (rendimento <= 0) {
      Alert.alert('Atenção', 'Informe quantas fatias essa receita rende.');
      return;
    }
    setSalvando(true);
    try {
      await salvarReceita(produtoId, validos.map(i => ({
        materia_prima_id: i.materia_prima_id,
        quantidade: Number.parseFloat(i.quantidade),
      })));
      await atualizarRendimentoProduto(produtoId, rendimento);
      const custo = await calcularCustoProduto(produtoId);
      setCustoPorFatia(custo);
      Alert.alert('✅ Receita salva!', `Custo por fatia: ${custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  const rendimento = Math.max(1, Number.parseFloat(rendimentoFatias) || 1);
  const custoTotalReceita = custoPorFatia * rendimento;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
        <Card estilo={{ marginBottom: Spacing.md }}>
          <Input
            rotulo="Essa receita rende quantas fatias?"
            value={rendimentoFatias}
            onChangeText={setRendimentoFatias}
            keyboardType="decimal-pad"
            placeholder="Ex: 10"
          />

          <Text style={estilos.rotuloToggle}>Visualização de ingredientes e custo</Text>
          <View style={estilos.toggleRow}>
            <TouchableOpacity
              style={[estilos.toggleBtn, apresentacao === 'receita' && estilos.toggleBtnAtivo]}
              onPress={() => setApresentacao('receita')}
            >
              <Text style={[estilos.toggleTexto, apresentacao === 'receita' && estilos.toggleTextoAtivo]}>Por receita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.toggleBtn, apresentacao === 'fatia' && estilos.toggleBtnAtivo]}
              onPress={() => setApresentacao('fatia')}
            >
              <Text style={[estilos.toggleTexto, apresentacao === 'fatia' && estilos.toggleTextoAtivo]}>Por fatia</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {custoPorFatia > 0 && (
          <Card estilo={{ backgroundColor: Colors.secondaryLight, marginBottom: Spacing.md }}>
            <Text style={{ fontWeight: '700', color: Colors.secondary, textAlign: 'center', fontSize: FontSize.lg }}>
              {apresentacao === 'receita'
                ? `💰 Custo total da receita: ${custoTotalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                : `💰 Custo por fatia: ${custoPorFatia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
            </Text>
          </Card>
        )}

        {/* Ingredientes já adicionados */}
        {itens.length > 0 && (
          <>
            <Text style={estilos.secaoTitulo}>🧂 Ingredientes desta receita</Text>
            {itens.map((item, idx) => (
              <Card key={item.materia_prima_id} estilo={{ marginBottom: 8 }}>
                <View style={estilos.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.itemNome}>{item.materia_prima_nome}</Text>
                    {apresentacao === 'receita' && (
                      <Text style={estilos.itemSubInfo}>
                        Receita: {(Number.parseFloat(item.quantidade) || 0).toFixed(2)} {item.unidade}
                      </Text>
                    )}
                  </View>
                  {apresentacao === 'receita' ? (
                    <>
                      <View style={estilos.itemQtd}>
                        <Input
                          value={item.quantidade}
                          onChangeText={v => atualizarQtd(idx, v)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          estilo={{ marginBottom: 0, width: 80 }}
                        />
                      </View>
                      <Text style={estilos.unidade}>{item.unidade}</Text>
                    </>
                  ) : (
                    <Text style={estilos.itemPorFatia}>
                      Por fatia: {((Number.parseFloat(item.quantidade) || 0) / rendimento).toFixed(2)} {item.unidade}
                    </Text>
                  )}
                  <TouchableOpacity onPress={() => removerItem(idx)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={22} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Adicionar ingredientes */}
        <Separador />
        <Text style={estilos.secaoTitulo}>➕ Adicionar ingrediente</Text>
        {materiais
          .filter(m => !itens.some(i => i.materia_prima_id === m.id))
          .map(m => (
            <TouchableOpacity
              key={m.id}
              style={estilos.btnAdicionar}
              onPress={() => adicionarIngrediente(m)}
            >
              <Ionicons name="add-circle" size={22} color={Colors.success} />
              <Text style={estilos.btnAdicionarTexto}>{m.nome}</Text>
              <Text style={estilos.btnAdicionarSub}>{m.unidade}</Text>
            </TouchableOpacity>
          ))
        }

        {materiais.length === 0 && (
          <Text style={{ color: Colors.textMuted, textAlign: 'center', marginVertical: Spacing.md }}>
            Cadastre matérias-primas primeiro
          </Text>
        )}

        <Separador />
        <Botao titulo="Salvar Receita" onPress={salvar} carregando={salvando} />
        <Separador espaco={Spacing.xl} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md },
  rotuloToggle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1.2, borderColor: Colors.border, alignItems: 'center' },
  toggleBtnAtivo: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  toggleTexto: { color: Colors.textSecondary, fontWeight: '600' },
  toggleTextoAtivo: { color: Colors.primary, fontWeight: '700' },
  secaoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemNome: { fontWeight: '600', fontSize: FontSize.md, color: Colors.textPrimary },
  itemSubInfo: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  itemPorFatia: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700', marginRight: 4 },
  itemQtd: { width: 80 },
  unidade: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 40 },
  btnAdicionar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  btnAdicionarTexto: { flex: 1, fontWeight: '600', color: Colors.textPrimary },
  btnAdicionarSub: { fontSize: FontSize.sm, color: Colors.textMuted },
});
