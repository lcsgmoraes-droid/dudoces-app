import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors, Spacing } from '../../theme';
import { Input, Botao, Separador } from '../../components/ui';
import { salvarCliente, atualizarCliente } from '../../database/clientesService';
import { Cliente } from '../../types';

export default function ClienteFormScreen({ route, navigation }: any) {
  const clienteExistente: Cliente | undefined = route.params?.cliente;
  const editando = !!clienteExistente;

  const [nome, setNome] = useState(clienteExistente?.nome || '');
  const [telefone, setTelefone] = useState(clienteExistente?.telefone || '');
  const [email, setEmail] = useState(clienteExistente?.email || '');
  const [endereco, setEndereco] = useState(clienteExistente?.endereco || '');
  const [observacao, setObservacao] = useState(clienteExistente?.observacao || '');
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string }>({});

  const validar = () => {
    const novosErros: { nome?: string } = {};
    if (!nome.trim()) novosErros.nome = 'Nome é obrigatório';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = { nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), endereco: endereco.trim(), observacao: observacao.trim() };
      if (editando) {
        await atualizarCliente(clienteExistente!.id, dados);
      } else {
        await salvarCliente(dados);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo}>
        <Input
          rotulo="Nome"
          obrigatorio
          value={nome}
          onChangeText={setNome}
          placeholder="Nome completo"
          erro={erros.nome}
          autoFocus
        />
        <Input
          rotulo="Telefone / WhatsApp"
          value={telefone}
          onChangeText={setTelefone}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
        />
        <Input
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          rotulo="Endereço"
          value={endereco}
          onChangeText={setEndereco}
          placeholder="Rua, número, bairro"
        />
        <Input
          rotulo="Observação"
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex: prefere entrega no período da tarde"
          multiline
          numberOfLines={3}
        />
        <Separador />
        <Botao
          titulo={editando ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
});
