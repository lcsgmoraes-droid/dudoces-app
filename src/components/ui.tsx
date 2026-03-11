import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, TextInputProps, ViewStyle
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

// === BOTÃO ===
interface BotaoProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo' | 'sucesso' | 'ghost';
  carregando?: boolean;
  desabilitado?: boolean;
  estilo?: ViewStyle;
  icone?: React.ReactNode;
  tamanho?: 'pequeno' | 'normal' | 'grande';
}

export function Botao({
  titulo, onPress, variante = 'primario', carregando, desabilitado, estilo, icone, tamanho = 'normal'
}: BotaoProps) {
  const bgColors = {
    primario: Colors.primary,
    secundario: Colors.secondary,
    perigo: Colors.danger,
    sucesso: Colors.success,
    ghost: 'transparent',
  };
  const textColors = {
    primario: '#fff',
    secundario: '#fff',
    perigo: '#fff',
    sucesso: '#fff',
    ghost: Colors.primary,
  };
  const padVertical = tamanho === 'pequeno' ? 8 : tamanho === 'grande' ? 16 : 12;
  const fontSize = tamanho === 'pequeno' ? FontSize.sm : tamanho === 'grande' ? FontSize.lg : FontSize.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desabilitado || carregando}
      style={[
        estilos.botao,
        { backgroundColor: bgColors[variante], paddingVertical: padVertical,
          opacity: (desabilitado || carregando) ? 0.6 : 1,
          borderWidth: variante === 'ghost' ? 1.5 : 0,
          borderColor: variante === 'ghost' ? Colors.primary : 'transparent',
        },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={textColors[variante]} size="small" />
      ) : (
        <View style={estilos.botaoConteudo}>
          {icone && <View style={{ marginRight: 6 }}>{icone}</View>}
          <Text style={[estilos.botaoTexto, { color: textColors[variante], fontSize }]}>
            {titulo}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// === INPUT ===
interface InputProps extends TextInputProps {
  rotulo?: string;
  erro?: string;
  obrigatorio?: boolean;
  estilo?: ViewStyle;
}

export function Input({ rotulo, erro, obrigatorio, style, estilo, ...props }: InputProps) {
  return (
    <View style={estilos.inputContainer}>
      {rotulo && (
        <Text style={estilos.rotulo}>
          {rotulo}{obrigatorio && <Text style={{ color: Colors.danger }}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[estilos.input, erro ? { borderColor: Colors.danger } : {}, style, estilo]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {erro && <Text style={estilos.erro}>{erro}</Text>}
    </View>
  );
}

// === CARD ===
interface CardProps {
  children: React.ReactNode;
  estilo?: ViewStyle | ViewStyle[] | (ViewStyle | undefined)[];
  onPress?: () => void;
}

export function Card({ children, estilo, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity style={[estilos.card, estilo]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[estilos.card, estilo]}>{children}</View>;
}

// === BADGE DE STATUS ===
interface BadgeProps {
  texto: string;
  cor?: 'verde' | 'vermelho' | 'amarelo' | 'rosa' | 'roxo';
}

export function Badge({ texto, cor = 'rosa' }: BadgeProps) {
  const cores = {
    verde: { bg: '#E8F5E9', text: Colors.success },
    vermelho: { bg: '#FFEBEE', text: Colors.danger },
    amarelo: { bg: '#FFF8E1', text: Colors.warning },
    rosa: { bg: Colors.primaryLight, text: Colors.primary },
    roxo: { bg: '#F3E5F5', text: Colors.accent },
  };
  return (
    <View style={[estilos.badge, { backgroundColor: cores[cor].bg }]}>
      <Text style={[estilos.badgeTexto, { color: cores[cor].text }]}>{texto}</Text>
    </View>
  );
}

// === SEPARADOR ===
export function Separador({ espaco = Spacing.md }: { espaco?: number }) {
  return <View style={{ height: espaco }} />;
}

// === TELA VAZIA ===
export function TelaVazia({ mensagem, icone }: { mensagem: string; icone?: string }) {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioIcone}>{icone || '🍬'}</Text>
      <Text style={estilos.vazioTexto}>{mensagem}</Text>
    </View>
  );
}

// === CABEÇALHO DE SEÇÃO ===
export function SecaoTitulo({ titulo, acao }: { titulo: string; acao?: React.ReactNode }) {
  return (
    <View style={estilos.secaoTituloRow}>
      <Text style={estilos.secaoTitulo}>{titulo}</Text>
      {acao}
    </View>
  );
}

const estilos = StyleSheet.create({
  botao: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoConteudo: { flexDirection: 'row', alignItems: 'center' },
  botaoTexto: { fontWeight: '700' },
  inputContainer: { marginBottom: Spacing.md },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  erro: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#D4478A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeTexto: { fontSize: FontSize.xs, fontWeight: '700' },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  vazioIcone: { fontSize: 52, marginBottom: Spacing.md },
  vazioTexto: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
  secaoTituloRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  secaoTitulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
});
