import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/database';
import { seedDadosIniciais } from './src/database/seedData';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme';

export default function App() {
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => seedDadosIniciais())
      .then(() => setPronto(true))
      .catch(e => {
        console.error('Erro ao inicializar banco:', e);
        setErro(e.message || 'Erro ao inicializar o banco de dados');
      });
  }, []);

  if (erro) {
    return (
      <View style={estilos.splash}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>❌</Text>
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', padding: 24 }}>{erro}</Text>
      </View>
    );
  }

  if (!pronto) {
    return (
      <View style={estilos.splash}>
        <Text style={estilos.splashEmoji}>🍰</Text>
        <Text style={estilos.splashTitulo}>DuDoces</Text>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />
        <Text style={estilos.splashSub}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D4478A',
  },
  splashEmoji: { fontSize: 72, marginBottom: 8 },
  splashTitulo: {
    fontSize: 42, fontWeight: '900', color: '#fff',
    letterSpacing: 2,
  },
  splashSub: { color: 'rgba(255,255,255,0.7)', marginTop: 16, fontSize: 16 },
});
