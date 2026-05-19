import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {getAuth} from '@react-native-firebase/auth';
import {useAppContext} from '../../store/AppContext';
import {useTheme, Colors} from '../../theme';
import BlockingModule from '../../native/BlockingModule';
import {COMMON_APPS} from '../../store/apps';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import SettingsModal from '../../components/SettingsModal';

const ADMIN_EMAIL = 'gavrielchaim123@gmail.com';

const TEST_APPS = [
  {id: 'chrome', packageName: 'com.android.chrome', appName: 'Chrome'},
  ...COMMON_APPS,
];

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
    statCard: {flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: c.border},
    statValue: {fontSize: 32, fontWeight: '800', color: c.text, marginBottom: 4},
    statLabel: {fontSize: 13, color: c.textSecondary},
  });
}

function StatusBadge({active, colors}: {active: boolean; colors: Colors}) {
  return (
    <View style={{borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
      backgroundColor: active ? colors.accent : colors.surface,
      borderWidth: active ? 0 : 1, borderColor: colors.border}}>
      <Text style={{fontSize: 12, color: active ? '#fff' : colors.textMuted, fontWeight: '700'}}>
        {active ? 'Active' : 'Off'}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const {store} = useAppContext();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {locationRules, selfLock, lockMode, partner, currentZone} = store;
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [testBlocking, setTestBlocking] = useState(false);
  const [selectedTestApp, setSelectedTestApp] = useState(TEST_APPS[0]);
  const isAdmin = getAuth().currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    BlockingModule.isAccessibilityServiceEnabled().then(setAccessibilityEnabled).catch(() => {});
  }, []);

  const activeRules = locationRules.filter(r => r.isActive);
  const configuredAppCount = new Set(activeRules.flatMap(r => r.blockedAppIds)).size;
  const isLocked = lockMode !== 'none' && (selfLock.isLocked || (!!partner && partner.isLockingYou && partner.blockedPackages.length > 0));

  const zoneTitle = currentZone ? currentZone.name : 'Zone: Unknown';
  const zoneSub = currentZone
    ? `${currentZone.radiusMeters}m radius · apps blocked`
    : 'Not inside any geofenced area';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 12}]}>
      {/* GeoBlock Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="security" size={20} color={colors.accent} />
          <Text style={styles.headerLogo}>GeoBlock</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerBtn}>
          <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.subheading}>Your blocking is {isLocked ? 'locked' : 'unlocked'}.</Text>

      <View style={styles.row}>
        <StatCard label="Apps Configured" value={String(configuredAppCount)} colors={colors} />
        <StatCard label="Active Rules" value={String(activeRules.length)} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <MaterialIcons name="location-on" size={18} color={colors.textSecondary} style={styles.statusIcon} />
            <Text style={styles.statusLabel}>Location Rules</Text>
          </View>
          <StatusBadge active={activeRules.length > 0} colors={colors} />
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <MaterialIcons name="lock" size={18} color={colors.textSecondary} style={styles.statusIcon} />
            <Text style={styles.statusLabel}>Lock Mode</Text>
          </View>
          <StatusBadge active={lockMode !== 'none'} colors={colors} />
        </View>
        {lockMode === 'partner' && partner && (
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <MaterialIcons name="people" size={18} color={colors.textSecondary} style={styles.statusIcon} />
              <Text style={styles.statusLabel}>Partner</Text>
            </View>
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

      {/* Enforcement Zone card */}
      <View style={[styles.mapCard, currentZone && styles.mapCardActive]}>
        <View style={styles.mapCardOverlay}>
          <MaterialIcons
            name="my-location"
            size={24}
            color={currentZone ? colors.accent : colors.textMuted}
            style={{marginBottom: 8}}
          />
          <Text style={styles.mapCardTitle}>{zoneTitle}</Text>
          <Text style={styles.mapCardSub}>{zoneSub}</Text>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>⚙ DEV: Test Blocking</Text>
          <Text style={styles.adminSub}>Select an app to block directly, bypassing geofencing. Verifies the overlay works.</Text>

          {/* App picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appPickerRow}>
            {TEST_APPS.map(app => (
              <TouchableOpacity
                key={app.id}
                style={[styles.appChip, selectedTestApp.id === app.id && styles.appChipSelected]}
                onPress={() => setSelectedTestApp(app)}>
                <Text style={[styles.appChipText, selectedTestApp.id === app.id && styles.appChipTextSelected]}>
                  {app.appName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.adminButtons}>
            <TouchableOpacity
              style={[styles.adminButton, testBlocking && styles.adminButtonActive]}
              onPress={() => {
                BlockingModule.setBlockedApps([selectedTestApp.packageName]);
                setTestBlocking(true);
              }}>
              <Text style={styles.adminButtonText}>
                {testBlocking ? `Blocking ${selectedTestApp.appName}` : `Block ${selectedTestApp.appName}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => { BlockingModule.setBlockedApps([]); setTestBlocking(false); }}>
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

      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </ScrollView>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, paddingBottom: 40},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
    headerLogo: {fontSize: 16, fontWeight: '700', color: c.text},
    headerBtn: {padding: 6},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 24},
    row: {flexDirection: 'row', gap: 12, marginBottom: 20},
    section: {backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 20},
    sectionTitle: {fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12},
    statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border},
    statusLeft: {flexDirection: 'row', alignItems: 'center'},
    statusIcon: {marginRight: 10},
    statusLabel: {fontSize: 14, color: c.textSecondary},
    statusValue: {fontSize: 14, fontWeight: '600', color: c.accent},
    countdownBanner: {backgroundColor: c.cardLocked, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: c.cardLockedBorder, marginBottom: 16},
    countdownTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6},
    countdownSub: {fontSize: 13, color: c.accentSoft, marginBottom: 14},
    cancelButton: {backgroundColor: c.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
    cancelButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
    warningBanner: {backgroundColor: c.warningBg, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.warningBorder},
    warningBannerTitle: {fontSize: 14, fontWeight: '700', color: c.warning, marginBottom: 4},
    warningBannerSub: {fontSize: 13, color: c.warningText, lineHeight: 19},
    mapCard: {height: 160, backgroundColor: '#0d1117', borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#1e293b', justifyContent: 'center', alignItems: 'center'},
    mapCardActive: {borderColor: c.accent},
    mapCardOverlay: {alignItems: 'center'},
    mapCardTitle: {fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4},
    mapCardSub: {fontSize: 13, color: c.textSecondary},
    adminSection: {marginBottom: 16, padding: 14, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border},
    adminLabel: {fontSize: 12, fontWeight: '700', color: c.textMuted, marginBottom: 4},
    adminSub: {fontSize: 12, color: c.textMuted, marginBottom: 10, lineHeight: 17},
    appPickerRow: {marginBottom: 12},
    appChip: {borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, marginRight: 8},
    appChipSelected: {backgroundColor: c.accent, borderColor: c.accent},
    appChipText: {fontSize: 12, fontWeight: '600', color: c.textSecondary},
    appChipTextSelected: {color: '#fff'},
    adminButtons: {flexDirection: 'row', gap: 8},
    adminButton: {flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: c.border},
    adminButtonActive: {borderColor: c.accent, backgroundColor: '#1e1b4b'},
    adminButtonText: {fontSize: 13, fontWeight: '600', color: c.textSecondary},
    privacyLink: {alignItems: 'center', paddingVertical: 16},
    privacyLinkText: {fontSize: 12, color: c.textMuted},
  });
}
