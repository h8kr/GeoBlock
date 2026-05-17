import React, {useState, useEffect} from 'react';
import {LogBox} from 'react-native';

LogBox.ignoreLogs([
  'This method is deprecated',
  'Codegen didn\'t run for',
]);
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar, View, ActivityIndicator} from 'react-native';
import auth from '@react-native-firebase/auth';
import {AppContext} from './src/store/AppContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import {useAppStore} from './src/store/useAppStore';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(auth().currentUser);
  const store = useAppStore();

  useEffect(() => {
    return auth().onAuthStateChanged(u => {
      setUser(u);
      setInitializing(false);
    });
  }, []);

  if (initializing) {
    return (
      <View style={{flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
        <AppContext.Provider value={{store, onSignOut: () => auth().signOut()}}>
          <NavigationContainer>
            {user ? <MainNavigator /> : <AuthNavigator />}
          </NavigationContainer>
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
