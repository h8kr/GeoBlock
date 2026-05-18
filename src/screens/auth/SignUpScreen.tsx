import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator} from 'react-native';
import {getAuth, createUserWithEmailAndPassword, updateProfile} from '@react-native-firebase/auth';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../types';
import {darkColors, Colors} from '../../theme';

type Props = {navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>};

export default function SignUpScreen({navigation}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const colors = darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  async function handleSignUp() {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      const {user} = await createUserWithEmailAndPassword(getAuth(), email, password);
      await updateProfile(user, {displayName: name});
    } catch (e: any) {
      setError(friendlyError(e.code));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>GeoBlock</Text>
        <Text style={styles.tagline}>Create your account.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password (min 6 characters)" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
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
