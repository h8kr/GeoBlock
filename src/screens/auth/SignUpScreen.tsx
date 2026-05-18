import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <MaterialIcons name="security" size={28} color="#fff" />
          </View>
          <Text style={styles.logoText}>GeoBlock</Text>
          <Text style={styles.tagline}>Create your account to get started.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

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

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="lock-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signupLink}>
              Already have an account?{'  '}
              <Text style={styles.signupLinkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    scroll: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32, justifyContent: 'center'},
    logoSection: {alignItems: 'center', marginBottom: 32},
    logoIcon: {width: 56, height: 56, borderRadius: 14, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12},
    logoText: {fontSize: 28, fontWeight: '800', color: c.accent, marginBottom: 6},
    tagline: {fontSize: 13, color: c.textSecondary, textAlign: 'center'},
    card: {backgroundColor: c.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.border},
    fieldLabel: {fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8},
    inputRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, marginBottom: 16},
    inputIcon: {marginRight: 8},
    input: {flex: 1, paddingVertical: 13, color: c.text, fontSize: 14},
    button: {backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 20},
    buttonText: {color: '#fff', fontWeight: '700', fontSize: 15},
    divider: {height: 1, backgroundColor: c.border, marginBottom: 16},
    signupLink: {textAlign: 'center', fontSize: 14, color: c.textSecondary},
    signupLinkBold: {color: c.accent, fontWeight: '700'},
    error: {color: c.danger, textAlign: 'center', marginBottom: 12, fontSize: 13},
  });
}
