import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {useTheme} from '../theme';
import DashboardScreen from '../screens/main/DashboardScreen';
import ScreenTimeScreen from '../screens/main/ScreenTimeScreen';
import LocationRulesScreen from '../screens/main/LocationRulesScreen';
import LockScreen from '../screens/main/LockScreen';
import type {MainTabParamList} from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'home',
  ScreenTime: 'access-time',
  LocationRules: 'location-on',
  Partner: 'lock',
};

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  return (
    <MaterialIcons
      name={TAB_ICONS[name] ?? 'circle'}
      size={24}
      color={focused ? '#4f46e5' : '#555'}
    />
  );
}

export default function MainNavigator() {
  const {colors} = useTheme();
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused}) => <TabIcon name={route.name} focused={focused} />,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {fontSize: 11},
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{tabBarLabel: 'Home'}} />
      <Tab.Screen name="ScreenTime" component={ScreenTimeScreen} options={{tabBarLabel: 'Screen Time'}} />
      <Tab.Screen name="LocationRules" component={LocationRulesScreen} options={{tabBarLabel: 'Locations'}} />
      <Tab.Screen name="Partner" component={LockScreen} options={{tabBarLabel: 'Lock'}} />
    </Tab.Navigator>
  );
}
