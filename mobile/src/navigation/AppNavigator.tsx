import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RouteListScreen from '../screens/RouteListScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import OrderCollectionScreen from '../screens/OrderCollectionScreen';
import DeliveryConfirmScreen from '../screens/DeliveryConfirmScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import InvoiceListScreen from '../screens/InvoiceListScreen';
import IngestScreen from '../screens/IngestScreen';
import HubScreen from '../screens/HubScreen';

export type RoutesStackParamList = {
  RouteList: undefined;
  RouteDetail: { routeId: string; routeName: string };
  OrderCollection: { customerId: string; customerName: string; routeId: string };
  DeliveryConfirm: { orderId: string; customerName: string };
  Invoice: { orderId: string; customerName: string };
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const RoutesStack = createNativeStackNavigator<RoutesStackParamList>();
const Tab = createBottomTabNavigator();

const commonHeaderOptions = {
  headerStyle: { backgroundColor: '#1A1A1A' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontFamily: 'serif', fontWeight: '700' as const },
};

function RoutesStackNavigator() {
  return (
    <RoutesStack.Navigator screenOptions={commonHeaderOptions}>
      <RoutesStack.Screen name="RouteList" component={RouteListScreen} options={{ title: "Today's Routes" }} />
      <RoutesStack.Screen name="RouteDetail" component={RouteDetailScreen} options={({ route }) => ({ title: route.params.routeName })} />
      <RoutesStack.Screen name="OrderCollection" component={OrderCollectionScreen} options={{ title: 'Collect Order' }} />
      <RoutesStack.Screen name="DeliveryConfirm" component={DeliveryConfirmScreen} options={{ title: 'Delivery' }} />
      <RoutesStack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
    </RoutesStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1A1A1A',
        tabBarInactiveTintColor: '#8C8C8C',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E3',
        },
        tabBarLabelStyle: {
          fontFamily: 'sans-serif',
          fontSize: 11,
        },
        tabBarIcon: ({ focused }) => {
          let emoji = '';
          if (route.name === 'Routes') emoji = '🗺️';
          else if (route.name === 'Invoices') emoji = '🧾';
          else if (route.name === 'Ingest') emoji = '📥';
          else if (route.name === 'Hub') emoji = '⚙️';
          
          return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Routes" component={RoutesStackNavigator} />
      <Tab.Screen name="Invoices" component={InvoiceListScreen} />
      <Tab.Screen name="Ingest" component={IngestScreen} />
      <Tab.Screen name="Hub" component={HubScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
