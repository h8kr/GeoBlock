import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppContext} from '../../store/AppContext';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LockScreen() {
  const {store} = useAppContext();
  const insets = useSafeAreaInsets();
  const {lockMode, selfLock, partner, updateLockMode, activateSelfLock, requestSelfUnlock, cancelSelfUnlock, getUnlockCountdownMs, devResetLock} = store;
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!selfLock.unlockRequestedAt) return;
    const interval = setInterval(() => {
      const remaining = getUnlockCountdownMs();
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        // Auto-unlock when countdown hits zero
        store.updateSelfLock({...selfLock, isLocked: false, unlockRequestedAt: null});
      }
    }, 1000);
    setCountdown(getUnlockCountdownMs());
    return () => clearInterval(interval);
  }, [selfLock.unlockRequestedAt]);

  function handleSelectMode(mode: 'self' | 'partner') {
    if (lockMode !== 'none') {
      Alert.alert('Already in a lock mode', 'Disable your current lock mode first.');
      return;
    }
    updateLockMode(mode);
  }

  function handleDisableMode() {
    if (lockMode === 'self' && selfLock.isLocked) {
      Alert.alert(
        'Locked',
        'You need to request an unlock and wait 1 hour before you can disable self-lock.',
      );
      return;
    }
    if (lockMode === 'partner' && partner?.isLockingYou) {
      Alert.alert('Locked', 'Your partner has locked your settings. Ask them to unlock you.');
      return;
    }
    updateLockMode('none');
  }

  function handleActivateSelfLock() {
    Alert.alert(
      'Activate Self-Lock',
      'Your settings will be locked. To unlock, you must request it and wait 1 hour. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Lock It', style: 'destructive', onPress: activateSelfLock},
      ],
    );
  }

  function handleRequestUnlock() {
    Alert.alert(
      'Request Unlock',
      'A 1-hour countdown will start. Your blocks stay active until it finishes. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Start Countdown', onPress: requestSelfUnlock},
      ],
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <Text style={styles.heading}>Lock Mode</Text>
      <Text style={styles.subheading}>
        Prevent yourself from disabling your blocks.
      </Text>

      {lockMode === 'none' && (
        <View>
          <Text style={styles.sectionTitle}>Choose a lock method</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => handleSelectMode('self')}>
            <View style={styles.optionTop}>
              <Text style={styles.optionIcon}>⏱</Text>
              <Text style={styles.optionTitle}>Self-Lock</Text>
            </View>
            <Text style={styles.optionDesc}>
              Lock your settings on this device. If you want to turn off your blocks, you must
              wait 1 hour after requesting the unlock. No other person needed.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectMode('partner')}>
            <View style={styles.optionTop}>
              <Text style={styles.optionIcon}>👥</Text>
              <Text style={styles.optionTitle}>Accountability Partner</Text>
            </View>
            <Text style={styles.optionDesc}>
              Invite a trusted person. They can lock your settings from their phone so only they
              can allow changes. The strongest option.
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {lockMode === 'self' && (
        <View>
          <View style={[styles.statusCard, selfLock.isLocked ? styles.statusCardLocked : styles.statusCardUnlocked]}>
            <Text style={styles.statusCardTitle}>
              {selfLock.isLocked ? 'Self-Lock Active' : 'Self-Lock Enabled (Not Locked)'}
            </Text>
            <Text style={styles.statusCardSub}>
              {selfLock.isLocked
                ? 'Your blocks are locked. You cannot change settings without a 1-hour delay.'
                : 'Lock your settings to prevent yourself from disabling blocks on impulse.'}
            </Text>
          </View>

          {!selfLock.isLocked && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleActivateSelfLock}>
              <Text style={styles.primaryButtonText}>Activate Lock</Text>
            </TouchableOpacity>
          )}

          {selfLock.isLocked && !selfLock.unlockRequestedAt && (
            <TouchableOpacity style={styles.warningButton} onPress={handleRequestUnlock}>
              <Text style={styles.warningButtonText}>Request Unlock (1-hour delay)</Text>
            </TouchableOpacity>
          )}

          {selfLock.isLocked && selfLock.unlockRequestedAt && countdown > 0 && (
            <View style={styles.countdownCard}>
              <Text style={styles.countdownLabel}>Time until unlock</Text>
              <Text style={styles.countdownTimer}>{formatCountdown(countdown)}</Text>
              <Text style={styles.countdownSub}>Stay strong — you've got this.</Text>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelSelfUnlock}>
                <Text style={styles.cancelButtonText}>Cancel Unlock Request</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.ghostButton} onPress={handleDisableMode}>
            <Text style={styles.ghostButtonText}>Disable Self-Lock Mode</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.devButton} onPress={devResetLock}>
        <Text style={styles.devButtonText}>⚙ DEV: Reset all locks</Text>
      </TouchableOpacity>

      {lockMode === 'partner' && (
        <View>
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Accountability Partner</Text>
            {partner ? (
              <Text style={styles.statusCardSub}>
                Partner: {partner.displayName} — {partner.isLockingYou ? 'Locking your settings' : 'Not currently locking'}
              </Text>
            ) : (
              <Text style={styles.statusCardSub}>
                No partner connected yet. Share your invite code below.
              </Text>
            )}
          </View>

          {!partner && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Alert.alert('Coming soon', 'Partner invite flow requires Firebase setup.')}>
              <Text style={styles.primaryButtonText}>Invite a Partner</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.ghostButton} onPress={handleDisableMode}>
            <Text style={styles.ghostButtonText}>Disable Partner Mode</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  content: {paddingHorizontal: 20, paddingBottom: 40},
  heading: {fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4},
  subheading: {fontSize: 14, color: '#888', marginBottom: 24},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14},
  optionCard: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  optionTop: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  optionIcon: {fontSize: 20, marginRight: 10},
  optionTitle: {fontSize: 16, fontWeight: '700', color: '#fff'},
  optionDesc: {fontSize: 14, color: '#888', lineHeight: 21},
  statusCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: '#1c1c1c',
    borderColor: '#2a2a2a',
  },
  statusCardLocked: {backgroundColor: '#1e1b4b', borderColor: '#4f46e5'},
  statusCardUnlocked: {backgroundColor: '#1c1c1c', borderColor: '#2a2a2a'},
  statusCardTitle: {fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6},
  statusCardSub: {fontSize: 14, color: '#888', lineHeight: 21},
  primaryButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
  warningButton: {
    backgroundColor: '#7c2d12',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c2410c',
  },
  warningButtonText: {color: '#fed7aa', fontWeight: '700', fontSize: 15},
  ghostButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginTop: 4,
  },
  ghostButtonText: {color: '#555', fontWeight: '600', fontSize: 14},
  countdownCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  countdownLabel: {fontSize: 13, color: '#a5b4fc', marginBottom: 8},
  countdownTimer: {fontSize: 48, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums']},
  countdownSub: {fontSize: 13, color: '#a5b4fc', marginTop: 6, marginBottom: 16},
  cancelButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {color: '#fff', fontWeight: '600', fontSize: 14},
  devButton: {marginTop: 24, alignItems: 'center', padding: 8},
  devButtonText: {color: '#333', fontSize: 12},
});
