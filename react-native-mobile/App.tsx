import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';

// Screens
import Dashboard from './src/screens/Dashboard';
import Park from './src/screens/Park';
import Sessions from './src/screens/Sessions';
import ViewSession from './src/screens/ViewSession';
import AvailableSlots from './src/screens/AvailableSlots';
import SlotsManagement from './src/screens/SlotsManagement';
import EntryPointsManagement from './src/screens/EntryPointsManagement';
import VehiclesManagement from './src/screens/VehiclesManagement';
import BillingAuditLogsManagement from './src/screens/BillingAuditLogsManagement';
import KafkaEventsManagement from './src/screens/KafkaEventsManagement';
import Configuration from './src/screens/Configuration';
import UnparkVehicle from './src/screens/UnparkVehicle';

// ============================================================================
// Types
// ============================================================================

export type RootStackParamList = {
  MainTabs: undefined;
  Park: undefined;
  UnparkVehicle: undefined;
  ViewSession: { id: string };
  AvailableSlots: undefined;
  SlotsManagement: undefined;
  EntryPointsManagement: undefined;
  VehiclesManagement: undefined;
  BillingAuditLogsManagement: undefined;
  KafkaEventsManagement: undefined;
  Configuration: undefined;
  Dashboard: undefined;
  Sessions: undefined;
};

type TabParamList = {
  DashboardTab: undefined;
  ParkTab: undefined;
  SessionsTab: undefined;
  MoreTab: undefined;
};

// ============================================================================
// Tab Icons (text-based, no icon dependency)
// ============================================================================

const TabIcons: Record<string, string> = {
  DashboardTab: '◉',
  ParkTab: '⬆',
  SessionsTab: '☰',
  MoreTab: '⋯',
};

// ============================================================================
// Navigators
// ============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ============================================================================
// Tab Navigator
// ============================================================================

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
          <Text style={[styles.tabIcon, { fontSize: size - 8, opacity: focused ? 1 : 0.5 }]}>
            {TabIcons[route.name] || '•'}
          </Text>
        ),
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: true,
        headerTitleStyle: styles.headerTitle,
        headerStyle: styles.header,
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={Dashboard}
        options={{ title: 'Dashboard', tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ParkTab"
        component={Park}
        options={{ title: 'Park Vehicle', tabBarLabel: 'Park' }}
      />
      <Tab.Screen
        name="SessionsTab"
        component={Sessions}
        options={{ title: 'Sessions', tabBarLabel: 'Sessions' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{ title: 'More', tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// More Screen (navigation hub for management screens)
// ============================================================================

import { TouchableOpacity, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

function MoreScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const menuItems: { title: string; screen: keyof RootStackParamList; icon: string; desc: string }[] = [
    { title: 'Unpark Vehicle', screen: 'UnparkVehicle', icon: '⬇', desc: 'Unpark and calculate fee' },
    { title: 'Available Slots', screen: 'AvailableSlots', icon: '◉', desc: 'Search available slots' },
    { title: 'Slots Management', screen: 'SlotsManagement', icon: '▦', desc: 'Create, edit, delete slots' },
    { title: 'Entry Points', screen: 'EntryPointsManagement', icon: '▶', desc: 'Manage entry points' },
    { title: 'Vehicles', screen: 'VehiclesManagement', icon: '⌂', desc: 'Manage vehicles' },
    { title: 'Billing Audit Logs', screen: 'BillingAuditLogsManagement', icon: '$', desc: 'View billing history' },
    { title: 'Kafka Events', screen: 'KafkaEventsManagement', icon: '⚡', desc: 'Monitor event stream' },
    { title: 'Configuration', screen: 'Configuration', icon: '⚙', desc: 'System settings & init' },
  ];

  return (
    <ScrollView style={styles.moreContainer} contentContainerStyle={styles.moreContent}>
      <View style={styles.moreGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.moreCard}
            onPress={() => navigation.navigate(item.screen as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.moreCardIcon}>{item.icon}</Text>
            <Text style={styles.moreCardTitle}>{item.title}</Text>
            <Text style={styles.moreCardDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Root Stack Navigator
// ============================================================================

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Main tab interface */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Parking operations */}
        <Stack.Screen
          name="Park"
          component={Park}
          options={{ headerShown: true, title: 'Park Vehicle', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />
        <Stack.Screen
          name="UnparkVehicle"
          component={UnparkVehicle as any}
          options={{ headerShown: true, title: 'Unpark Vehicle', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Session screens */}
        <Stack.Screen
          name="ViewSession"
          component={ViewSession}
          options={{ headerShown: true, title: 'Session Details', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />
        <Stack.Screen
          name="Sessions"
          component={Sessions}
          options={{ headerShown: true, title: 'All Sessions', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Slot screens */}
        <Stack.Screen
          name="AvailableSlots"
          component={AvailableSlots as any}
          options={{ headerShown: true, title: 'Available Slots', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />
        <Stack.Screen
          name="SlotsManagement"
          component={SlotsManagement as any}
          options={{ headerShown: true, title: 'Slots Management', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Entry points */}
        <Stack.Screen
          name="EntryPointsManagement"
          component={EntryPointsManagement as any}
          options={{ headerShown: true, title: 'Entry Points', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Vehicles */}
        <Stack.Screen
          name="VehiclesManagement"
          component={VehiclesManagement as any}
          options={{ headerShown: true, title: 'Vehicles', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Audit & monitoring */}
        <Stack.Screen
          name="BillingAuditLogsManagement"
          component={BillingAuditLogsManagement as any}
          options={{ headerShown: true, title: 'Billing Audit Logs', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />
        <Stack.Screen
          name="KafkaEventsManagement"
          component={KafkaEventsManagement as any}
          options={{ headerShown: true, title: 'Kafka Events', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Configuration */}
        <Stack.Screen
          name="Configuration"
          component={Configuration}
          options={{ headerShown: true, title: 'Configuration', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />

        {/* Dashboard (direct access) */}
        <Stack.Screen
          name="Dashboard"
          component={Dashboard}
          options={{ headerShown: true, title: 'Dashboard', headerStyle: styles.header, headerTitleStyle: styles.headerTitle }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    paddingBottom: 4,
    paddingTop: 4,
    height: 56,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    color: '#1e40af',
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  moreContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  moreContent: {
    padding: 16,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  moreCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  moreCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  moreCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  moreCardDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default App;
