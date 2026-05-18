import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {getAuth} from '@react-native-firebase/auth';
import {useAppContext} from '../../store/AppContext';
import {useTheme, Colors} from '../../theme';
import BlockingModule from '../../native/BlockingModule';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

const ADMIN_EMAIL = 'gavrielchaim123@gmail.com';
const TEST_PACKAGE = 'com.android.chrome';

function StatCard({label, value, colors}: {label: string; value: string; colors: Colors}) {
  const s = useMemo(() => cardStyles(colors), [colors]);
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function cardStyles(c: Colors) {
  return StyleSheet.create({
    statCard: {flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: c.border},
    statValue: {fontSize: 32, fontWeight: '800', color: c.text},
    statLabel: {fontSize: 13, color: c.textSecondary, marginTop: 4},
  });
}

function StatusBadge({active, colors}: {active: boolean; colors: Colors}) {
  return (
    <View style={{borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
      backgroundColor: active ? colors.successBg : colors.surface,
      borderWidth: active ? 0 : 1, borderColor: colors.border}}>
      <Text style={{fontSize: 12, color: active ? colors.success : colors.textMuted, fontWeight: '600'}}>
        {active ? 'Active' : 'Off'}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const {store, onSignOut} = useAppContext();
  const {colors, theme, toggleTheme} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {locationRules, selfLock, lockMode, partner} = store;
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [testBlocking, setTestBlocking] = useState(false);
  const isAdmin = __DEV__ || getAuth().currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    BlockingModule.isAccessibilityServiceEnabled().then(setAccessibilityEnabled).catch(() => {});
  }, []);

  // Count unique apps configured across all active location rules
  const activeRules = locationRules.filter(r => r.isActive);
  const configuredAppCount = new Set(activeRules.flatMap(r => r.blockedAppIds)).size;
  const isLocked = lockMode !== 'none' && (selfLock.isLocked || !!partner?.isLockingYou);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <MaterialIcons name={theme === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.subheading}>Your blocking is {isLocked ? 'locked' : 'unlocked'}.</Text>

      <View style={styles.row}>
        <StatCard label="Apps Configured" value={String(configuredAppCount)} colors={colors} />
        <StatCard label="Active Rules" value={String(activeRules.length)} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Blocking Service</Text>
          <StatusBadge active={accessibilityEnabled} colors={colors} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Location Rules</Text>
          <StatusBadge active={activeRules.length > 0} colors={colors} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Lock Mode</Text>
          <StatusBadge active={lockMode !== 'none'} colors={colors} />
        </View>
        {lockMode === 'partner' && partner && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Partner</Text>
            <Text style={styles.statusValue}>{partner.displayName}</Text>
          </View>
        )}
      </View>

      {lockMode === 'self' && selfLock.unlockRequestedAt && (
        <View style={styles.countdownBanner}>
          <Text style={styles.countdownTitle}>Unlock Requested</Text>
          <Text style={styles.countdownSub}>Your blocks will turn off in ~1 hour. Stay strong!</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={store.cancelSelfUnlock}>
            <Text style={styles.cancelButtonText}>Cancel Unlock Request</Text>
          </TouchableOpacity>
        </View>
      )}

      {!accessibilityEnabled && (
        <TouchableOpacity style={styles.warningBanner} onPress={() => BlockingModule.openAccessibilitySettings()}>
          <Text style={styles.warningBannerTitle}>App blocking is disabled</Text>
          <Text style={styles.warningBannerSub}>The Accessibility Service is off. Tap to re-enable it in Settings.</Text>
        </TouchableOpacity>
      )}

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>⚙ DEV: Test Blocking</Text>
          <Text style={styles.adminSub}>Directly blocks Chrome to verify the overlay works, bypassing geofencing.</Text>
          <View style={styles.adminButtons}>
            <TouchableOpacity
              style={[styles.adminButton, testBlocking && styles.adminButtonActive]}
              onPress={() => {
                BlockingModule.setBlockedApps([TEST_PACKAGE]);
                setTestBlocking(true);
              }}>
              <Text style={styles.adminButtonText}>Block Chrome</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => {
                BlockingModule.setBlockedApps([]);
                setTestBlocking(false);
              }}>
              <Text style={styles.adminButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.privacyLink} onPress={() => setShowPrivacy(true)}>
        <Text style={styles.privacyLinkText}>Privacy Policy</Text>
      </TouchableOpacity>

      <Modal visible={showPrivacy} animationType="slide">
        <PrivacyPolicyScreen onClose={() => setShowPrivacy(false)} />
      </Modal>
    </ScrollView>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, paddingBottom: 40},
    headingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
    heading: {fontSize: 28, fontWeight: '800', color: c.text},
    headerActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
    themeButton: {padding: 6},
    signOutButton: {paddingVertical: 4, paddingHorizontal: 10},
    signOutText: {fontSize: 13, color: c.textSecondary},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 24},
    row: {flexDirection: 'row', gap: 12, marginBottom: 24},
    section: {backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 20},
    sectionTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 14},
    statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border},
    statusLabel: {fontSize: 14, color: c.textSecondary},
    statusValue: {fontSize: 14, color: c.accent, fontWeight: '600'},
    countdownBanner: {backgroundColor: c.cardLocked, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: c.cardLockedBorder},
    countdownTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6},
    countdownSub: {fontSize: 13, color: c.accentSoft, marginBottom: 14},
    cancelButton: {backgroundColor: c.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
    cancelButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
    warningBanner: {backgroundColor: c.warningBg, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: c.warningBorder},
    warningBannerTitle: {fontSize: 14, fontWeight: '700', color: c.warning, marginBottom: 4},
    warningBannerSub: {fontSize: 13, color: c.warningText, lineHeight: 19},
    adminSection: {marginTop: 16, padding: 14, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border},
    adminLabel: {fontSize: 12, fontWeight: '700', color: c.textMuted, marginBottom: 4},
    adminSub: {fontSize: 12, color: c.textMuted, marginBottom: 10, lineHeight: 17},
    adminButtons: {flexDirection: 'row', gap: 8},
    adminButton: {flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: c.border},
    adminButtonActive: {borderColor: c.accent},
    adminButtonText: {fontSize: 13, color: c.textSecondary, fontWeight: '600'},
    privacyLink: {alignItems: 'center', paddingVertical: 16},
    privacyLinkText: {fontSize: 12, color: c.textMuted},
  });
}
