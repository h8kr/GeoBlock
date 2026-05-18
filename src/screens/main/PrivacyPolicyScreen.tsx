import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme, Colors} from '../../theme';

const SECTIONS = [
  {title: 'What We Collect', body: `• Email address — used to create and identify your account.\n• Location data — used only to trigger app blocking rules you define. Processed on-device; not sent to our servers.\n• App usage statistics — used to display your screen time in the app. Processed on-device; not sent to our servers.\n• Partner pairing data — your invite code and your partner's user ID, stored in Firebase Firestore to enable the accountability partner feature.`},
  {title: 'How We Use Your Data', body: `Your data is used solely to operate GeoBlock:\n• Firebase Authentication stores your email and manages login sessions.\n• Firebase Firestore stores your partner connection (invite code, partner ID, lock state).\n• All location and usage data stays on your device and is never uploaded.`},
  {title: 'Accessibility Service', body: `GeoBlock uses Android's Accessibility Service to detect when a blocked app is opened and display a blocking overlay. This service is used exclusively for this purpose. GeoBlock does not read screen content, capture input, or collect any data through the Accessibility Service.`},
  {title: 'Data Sharing', body: `We do not sell, trade, or share your personal data with third parties. Firebase (Google) processes authentication and partner data as our infrastructure provider, subject to Google's Privacy Policy.`},
  {title: 'Data Retention & Deletion', body: `Your account and all associated Firestore data can be deleted by contacting us at gavrielchaim123@gmail.com. Local data (location rules, blocked apps, lock state) can be cleared by uninstalling the app.`},
  {title: 'Security', body: `Data in transit is encrypted via HTTPS. Firestore security rules ensure each user can only write to their own document. Passwords are managed entirely by Firebase Authentication and are never accessible to us.`},
  {title: 'Changes to This Policy', body: `If this policy changes materially, we will update the date below. Continued use of the app after changes constitutes acceptance of the updated policy.`},
  {title: 'Contact', body: `Questions about this policy? Email us at gavrielchaim123@gmail.com.`},
];

type Props = {onClose: () => void};

export default function PrivacyPolicyScreen({onClose}: Props) {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 2026</Text>
        <Text style={styles.intro}>GeoBlock ("we", "our", "the app") is committed to protecting your privacy. This policy explains what data we collect, why, and how it is used.</Text>
        {SECTIONS.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border},
    title: {fontSize: 18, fontWeight: '700', color: c.text},
    closeButton: {paddingVertical: 4, paddingHorizontal: 8},
    closeText: {color: c.accent, fontSize: 15, fontWeight: '600'},
    content: {padding: 20, paddingBottom: 60},
    updated: {fontSize: 12, color: c.textMuted, marginBottom: 12},
    intro: {fontSize: 14, color: c.textSecondary, lineHeight: 22, marginBottom: 24},
    section: {marginBottom: 24},
    sectionTitle: {fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 8},
    sectionBody: {fontSize: 14, color: c.textSecondary, lineHeight: 22},
  });
}
