import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator} from 'react-native';
import {getAuth, signInWithEmailAndPassword} from '@react-native-firebase/auth';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../types';
import {lightColors, darkColors, Colors} from '../../theme';

type Props = {navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>};

export default function LoginScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Auth screens use dark theme always (pre-login, no store access)
  const colors = darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  async function handleLogin() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(getAuth(), email, password);
    } catch (e: any) {
      setError(friendlyError(e.code));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>GeoBlock</Text>
        <Text style={styles.tagline}>Take back your time.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    default: return 'Something went wrong. Please try again.';
  }
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    inner: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
    logo: {fontSize: 36, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 6},
    tagline: {fontSize: 15, color: c.textSecondary, textAlign: 'center', marginBottom: 40},
    input: {backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: c.text, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: c.border},
    button: {backgroundColor: c.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6, marginBottom: 20},
    buttonText: {color: '#fff', fontWeight: '700', fontSize: 16},
    link: {color: c.accent, textAlign: 'center', fontSize: 14},
    error: {color: c.danger, textAlign: 'center', marginBottom: 12, fontSize: 14},
  });
}
