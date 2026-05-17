import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppContext} from '../../store/AppContext';

function StatCard({label, value, sub}: {label: string; value: string; sub?: string}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function StatusBadge({active}: {active: boolean}) {
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeOff]}>
      <Text style={styles.badgeText}>{active ? 'Active' : 'Off'}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const {store, onSignOut} = useAppContext();
  const insets = useSafeAreaInsets();
  const {blockedApps, locationRules, selfLock, lockMode, partner} = store;

  const activeBlocks = blockedApps.filter(a => a.isBlocked).length;
  const activeRules = locationRules.filter(r => r.isActive).length;
  const isLocked = lockMode !== 'none' && (selfLock.isLocked || !!partner?.isLockingYou);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Dashboard</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subheading}>Your blocking is {isLocked ? 'locked' : 'unlocked'}.</Text>

      <View style={styles.row}>
        <StatCard label="Apps Blocked" value={String(activeBlocks)} />
        <StatCard label="Location Rules" value={String(activeRules)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>App Blocking</Text>
          <StatusBadge active={activeBlocks > 0} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Location Rules</Text>
          <StatusBadge active={activeRules > 0} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Lock Mode</Text>
          <StatusBadge active={lockMode !== 'none'} />
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
          <Text style={styles.countdownSub}>
            Your blocks will turn off in ~1 hour. Stay strong!
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={store.cancelSelfUnlock}>
            <Text style={styles.cancelButtonText}>Cancel Unlock Request</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  content: {paddingHorizontal: 20, paddingBottom: 40},
  headingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  heading: {fontSize: 28, fontWeight: '800', color: '#fff'},
  signOutButton: {paddingVertical: 4, paddingHorizontal: 10},
  signOutText: {fontSize: 13, color: '#888'},
  subheading: {fontSize: 14, color: '#888', marginBottom: 24},
  row: {flexDirection: 'row', gap: 12, marginBottom: 24},
  statCard: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {fontSize: 32, fontWeight: '800', color: '#fff'},
  statLabel: {fontSize: 13, color: '#888', marginTop: 4},
  statSub: {fontSize: 11, color: '#555', marginTop: 2},
  section: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 20,
  },
  sectionTitle: {fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14},
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  statusLabel: {fontSize: 14, color: '#ccc'},
  statusValue: {fontSize: 14, color: '#4f46e5', fontWeight: '600'},
  badge: {borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4},
  badgeActive: {backgroundColor: '#14532d'},
  badgeOff: {backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#3a3a3a'},
  badgeText: {fontSize: 12, color: '#4ade80', fontWeight: '600'},
  countdownBanner: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  countdownTitle: {fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6},
  countdownSub: {fontSize: 13, color: '#a5b4fc', marginBottom: 14},
  cancelButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
});
