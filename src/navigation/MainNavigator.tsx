import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import DashboardScreen from '../screens/main/DashboardScreen';
import BlockedAppsScreen from '../screens/main/BlockedAppsScreen';
import ScreenTimeScreen from '../screens/main/ScreenTimeScreen';
import LocationRulesScreen from '../screens/main/LocationRulesScreen';
import LockScreen from '../screens/main/LockScreen';
import type {MainTabParamList} from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function icon(label: string, focused: boolean) {
  const icons: Record<string, string> = {
    Dashboard: '⊞',
    BlockedApps: '🚫',
    ScreenTime: '⏱',
    LocationRules: '📍',
    Partner: '🔒',
  };
  return <Text style={{fontSize: 20, opacity: focused ? 1 : 0.4}}>{icons[label]}</Text>;
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused}) => icon(route.name, focused),
        tabBarStyle: {
          backgroundColor: '#0f0f0f',
          borderTopColor: '#1c1c1c',
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: {fontSize: 11},
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{tabBarLabel: 'Home'}} />
      <Tab.Screen name="BlockedApps" component={BlockedAppsScreen} options={{tabBarLabel: 'Blocked'}} />
      <Tab.Screen name="ScreenTime" component={ScreenTimeScreen} options={{tabBarLabel: 'Screen Time'}} />
      <Tab.Screen name="LocationRules" component={LocationRulesScreen} options={{tabBarLabel: 'Locations'}} />
      <Tab.Screen name="Partner" component={LockScreen} options={{tabBarLabel: 'Lock'}} />
    </Tab.Navigator>
  );
}
