import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {getAuth, signInWithEmailAndPassword} from '@react-native-firebase/auth';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../types';
import {darkColors, Colors} from '../../theme';

type Props = {navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>};

export default function LoginScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <MaterialIcons name="security" size={28} color="#fff" />
          </View>
          <Text style={styles.logoText}>GeoBlock</Text>
          <Text style={styles.tagline}>Secure access to your location-locked environment</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@company.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.passwordLabelRow}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TouchableOpacity><Text style={styles.forgot}>Forgot?</Text></TouchableOpacity>
          </View>
          <View style={styles.inputRow}>
            <MaterialIcons name="lock-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <MaterialIcons name="login" size={18} color="#fff" style={{marginLeft: 6}} />
                </View>}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLink}>
              Don't have an account?{'  '}
              <Text style={styles.signupLinkBold}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <MaterialIcons name="security" size={16} color={colors.danger} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.infoCardTitle}>AES-256</Text>
              <Text style={styles.infoCardSub}>Encrypted</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <MaterialIcons name="public" size={16} color={colors.accent} />
            <Text style={[styles.infoCardTitle, {marginLeft: 8}]}>Global Registry</Text>
          </View>
        </View>

        <Text style={styles.copyright}>© 2024 GeoBlock Security Systems. All rights reserved.</Text>
      </ScrollView>
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
    scroll: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32, justifyContent: 'center'},
    logoSection: {alignItems: 'center', marginBottom: 32},
    logoIcon: {width: 56, height: 56, borderRadius: 14, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12},
    logoText: {fontSize: 28, fontWeight: '800', color: c.accent, marginBottom: 6},
    tagline: {fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18},
    card: {backgroundColor: c.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.border, marginBottom: 16},
    fieldLabel: {fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8},
    passwordLabelRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
    forgot: {fontSize: 13, fontWeight: '700', color: c.accent},
    inputRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, marginBottom: 16},
    inputIcon: {marginRight: 8},
    input: {flex: 1, paddingVertical: 13, color: c.text, fontSize: 14},
    button: {backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 20},
    buttonInner: {flexDirection: 'row', alignItems: 'center'},
    buttonText: {color: '#fff', fontWeight: '700', fontSize: 15},
    divider: {height: 1, backgroundColor: c.border, marginBottom: 16},
    signupLink: {textAlign: 'center', fontSize: 14, color: c.textSecondary},
    signupLinkBold: {color: c.accent, fontWeight: '700'},
    infoRow: {flexDirection: 'row', gap: 12, marginBottom: 24},
    infoCard: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border},
    infoCardTitle: {fontSize: 13, fontWeight: '700', color: c.text},
    infoCardSub: {fontSize: 11, color: c.textMuted},
    copyright: {textAlign: 'center', fontSize: 11, color: c.textMuted, lineHeight: 16},
    error: {color: c.danger, textAlign: 'center', marginBottom: 12, fontSize: 13},
  });
}
