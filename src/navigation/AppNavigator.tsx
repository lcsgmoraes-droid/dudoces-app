import React from 'react';
import { useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';

// Importa todas as telas
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ClientesListaScreen from '../screens/clientes/ClientesListaScreen';
import ClienteFormScreen from '../screens/clientes/ClienteFormScreen';
import MateriaisListaScreen from '../screens/materiais/MateriaisListaScreen';
import MaterialFormScreen from '../screens/materiais/MaterialFormScreen';
import CompraFormScreen from '../screens/materiais/CompraFormScreen';
import ProdutosListaScreen from '../screens/produtos/ProdutosListaScreen';
import ProdutoFormScreen from '../screens/produtos/ProdutoFormScreen';
import ReceitaScreen from '../screens/produtos/ReceitaScreen';
import ProducaoListaScreen from '../screens/producao/ProducaoListaScreen';
import ProducaoFormScreen from '../screens/producao/ProducaoFormScreen';
import VendasListaScreen from '../screens/vendas/VendasListaScreen';
import VendaFormScreen from '../screens/vendas/VendaFormScreen';
import VendaDetalheScreen from '../screens/vendas/VendaDetalheScreen';
import EstoquePlanejamentoScreen from '../screens/dashboard/EstoquePlanejamentoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: '🍬 DuDoces' }} />
      <Stack.Screen name="EstoquePlanejamento" component={EstoquePlanejamentoScreen} options={{ title: 'Planejamento de Estoque' }} />
    </Stack.Navigator>
  );
}

function ClientesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ClientesLista" component={ClientesListaScreen} options={{ title: 'Clientes' }} />
      <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cadastro de Cliente' }} />
    </Stack.Navigator>
  );
}

function MateriaisStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MateriaisLista" component={MateriaisListaScreen} options={{ title: 'Matérias-Primas' }} />
      <Stack.Screen name="MaterialForm" component={MaterialFormScreen} options={{ title: 'Matéria-Prima' }} />
      <Stack.Screen name="CompraForm" component={CompraFormScreen} options={{ title: 'Registrar Compra' }} />
    </Stack.Navigator>
  );
}

function ProdutosStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProdutosLista" component={ProdutosListaScreen} options={{ title: 'Produtos' }} />
      <Stack.Screen name="ProdutoForm" component={ProdutoFormScreen} options={{ title: 'Produto' }} />
      <Stack.Screen name="Receita" component={ReceitaScreen} options={{ title: 'Receita / Ingredientes' }} />
    </Stack.Navigator>
  );
}

function ProducaoStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProducaoLista" component={ProducaoListaScreen} options={{ title: 'Produção' }} />
      <Stack.Screen name="ProducaoForm" component={ProducaoFormScreen} options={{ title: 'Registrar Produção' }} />
    </Stack.Navigator>
  );
}

function VendasStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="VendasLista" component={VendasListaScreen} options={{ title: 'Vendas' }} />
      <Stack.Screen name="VendaForm" component={VendaFormScreen} options={{ title: 'Nova Venda' }} />
      <Stack.Screen name="VendaDetalhe" component={VendaDetalheScreen} options={{ title: 'Detalhe da Venda' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: (isTablet ? 76 : 62) + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: isTablet ? 8 : 4,
          },
          tabBarItemStyle: { paddingVertical: isTablet ? 4 : 0 },
          tabBarLabelStyle: { fontSize: isTablet ? 12 : 11, fontWeight: '600' },
          tabBarIcon: ({ color, size, focused }) => {
            const icons: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
              Dashboard: { focused: 'home', outline: 'home-outline' },
              Clientes: { focused: 'people', outline: 'people-outline' },
              Materiais: { focused: 'basket', outline: 'basket-outline' },
              Produtos: { focused: 'cafe', outline: 'cafe-outline' },
              Producao: { focused: 'restaurant', outline: 'restaurant-outline' },
              Vendas: { focused: 'cart', outline: 'cart-outline' },
            };
            const icon = icons[route.name];
            if (icon) {
              return <Ionicons name={focused ? icon.focused : icon.outline} size={size} color={color} />;
            }
            return <Ionicons name="ellipse" size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardStack} options={{ title: 'Início' }} />
        <Tab.Screen name="Vendas" component={VendasStack} options={{ title: 'Vendas' }} />
        <Tab.Screen name="Producao" component={ProducaoStack} options={{ title: 'Produção' }} />
        <Tab.Screen name="Produtos" component={ProdutosStack} options={{ title: 'Produtos' }} />
        <Tab.Screen name="Materiais" component={MateriaisStack} options={{ title: 'Materiais' }} />
        <Tab.Screen name="Clientes" component={ClientesStack} options={{ title: 'Clientes' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
