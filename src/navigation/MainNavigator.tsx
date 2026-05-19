import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {useTheme, fonts} from '../theme';
import DashboardScreen from '../screens/main/DashboardScreen';
import ScreenTimeScreen from '../screens/main/ScreenTimeScreen';
import LocationRulesScreen from '../screens/main/LocationRulesScreen';
import LockScreen from '../screens/main/LockScreen';
import type {MainTabParamList} from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'dashboard',
  ScreenTime: 'timer',
  LocationRules: 'location-on',
  Partner: 'lock',
};

export default function MainNavigator() {
  const {colors} = useTheme();
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color}) => (
          <MaterialIcons
            name={TAB_ICONS[route.name] ?? 'circle'}
            size={24}
            color={color}
          />
        ),
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {fontSize: 11, fontFamily: fonts.semibold},
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{tabBarLabel: 'Dashboard'}} />
      <Tab.Screen name="LocationRules" component={LocationRulesScreen} options={{tabBarLabel: 'Rules'}} />
      <Tab.Screen name="Partner" component={LockScreen} options={{tabBarLabel: 'Lock'}} />
      <Tab.Screen name="ScreenTime" component={ScreenTimeScreen} options={{tabBarLabel: 'Limits'}} />
    </Tab.Navigator>
  );
}
