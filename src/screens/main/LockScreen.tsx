import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getAuth} from '@react-native-firebase/auth';
import {useAppContext} from '../../store/AppContext';
import {useTheme, Colors} from '../../theme';
import {
  getOrCreateUserDoc,
  connectPartner,
  disconnectPartner,
  setLocking,
  subscribeToPartner,
  UserDoc,
} from '../../services/PartnerService';

function formatAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LockScreen() {
  const {store} = useAppContext();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {lockMode, selfLock, partner, lockHistory, updateLockMode, activateSelfLock, requestSelfUnlock, cancelSelfUnlock, getUnlockCountdownMs, devResetLock, setPartner, addLockEvent} = store;
  const isAdmin = getAuth().currentUser?.email === 'gavrielchaim123@gmail.com';
  const [countdown, setCountdown] = useState(0);

  // Partner mode state
  const [myDoc, setMyDoc] = useState<UserDoc | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<UserDoc | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [firestoreError, setFirestoreError] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const myUnsubRef = useRef<(() => void) | null>(null);
  const prevPartnerLocking = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!selfLock.unlockRequestedAt) return;
    const interval = setInterval(() => {
      const remaining = getUnlockCountdownMs();
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        store.updateSelfLock({...selfLock, isLocked: false, unlockRequestedAt: null});
        addLockEvent('self_lock_off', 'Self-lock unlocked after countdown');
      }
    }, 1000);
    setCountdown(getUnlockCountdownMs());
    return () => clearInterval(interval);
  }, [selfLock.unlockRequestedAt]);

  // Load partner data when in partner mode
  useEffect(() => {
    if (lockMode !== 'partner') return;
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    getOrCreateUserDoc().then(doc => {
      setFirestoreError(false);
      setMyDoc(doc);
      myUnsubRef.current?.();
      myUnsubRef.current = subscribeToPartner(uid, updated => setMyDoc(updated));
      if (doc.partnerId) {
        subscribeToPartnerDoc(doc.partnerId);
      }
    }).catch(() => setFirestoreError(true));
  }, [lockMode]);

  function subscribeToPartnerDoc(partnerId: string) {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToPartner(partnerId, doc => {
      if (prevPartnerLocking.current !== undefined && prevPartnerLocking.current !== doc.isLocking) {
        addLockEvent(
          doc.isLocking ? 'partner_locked_you' : 'partner_unlocked_you',
          doc.isLocking ? 'Partner locked your settings' : 'Partner unlocked your settings',
        );
      }
      prevPartnerLocking.current = doc.isLocking;
      setPartnerDoc(doc);
      setPartner({uid: partnerId, displayName: doc.displayName, email: doc.email, isLockingYou: doc.isLocking});
    });
  }

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      myUnsubRef.current?.();
    };
  }, []);

  async function handleConnectPartner() {
    if (!codeInput.trim()) return;
    setLoadingPartner(true);
    try {
      const doc = await connectPartner(codeInput);
      const updatedMyDoc = await getOrCreateUserDoc();
      setMyDoc(updatedMyDoc);
      subscribeToPartnerDoc(updatedMyDoc.partnerId!);
      setCodeInput('');
    } catch (e: any) {
      Alert.alert('Could not connect', e.message);
    } finally {
      setLoadingPartner(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert('Disconnect partner?', 'This will remove the connection for both of you.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Disconnect', style: 'destructive', onPress: async () => {
        await disconnectPartner();
        unsubRef.current?.();
        setMyDoc(prev => prev ? {...prev, partnerId: null} : null);
        setPartnerDoc(null);
        setPartner(null);
      }},
    ]);
  }

  async function handleToggleLock() {
    const nowLocking = !myDoc?.isLocking;
    try {
      await setLocking(nowLocking);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function handleSelectMode(mode: 'self' | 'partner') {
    if (lockMode !== 'none') {
      Alert.alert('Already in a lock mode', 'Disable your current lock mode first.');
      return;
    }
    updateLockMode(mode);
    addLockEvent(mode === 'self' ? 'self_mode_enabled' : 'partner_mode_enabled',
      mode === 'self' ? 'Self-lock mode enabled' : 'Partner mode enabled');
  }

  function handleDisableMode() {
    if (lockMode === 'self' && selfLock.isLocked) {
      Alert.alert('Locked', 'You need to request an unlock and wait 1 hour before you can disable self-lock.');
      return;
    }
    if (lockMode === 'partner' && partner?.isLockingYou) {
      Alert.alert('Locked', 'Your partner has locked your settings. Ask them to unlock you.');
      return;
    }
    if (lockMode === 'partner') {
      disconnectPartner().catch(() => {});
      setPartner(null);
      addLockEvent('partner_mode_disabled', 'Partner mode disabled');
    } else {
      addLockEvent('self_mode_disabled', 'Self-lock mode disabled');
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
      <Text style={styles.subheading}>Prevent yourself from disabling your blocks.</Text>

      {lockMode === 'none' && (
        <View>
          <Text style={styles.sectionTitle}>Choose a lock method</Text>
          <TouchableOpacity style={styles.optionCard} onPress={() => handleSelectMode('self')}>
            <View style={styles.optionTop}>
              <Text style={styles.optionIcon}>⏱</Text>
              <Text style={styles.optionTitle}>Self-Lock</Text>
            </View>
            <Text style={styles.optionDesc}>
              Lock your settings on this device. If you want to turn off your blocks, you must wait 1 hour after requesting the unlock.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={() => handleSelectMode('partner')}>
            <View style={styles.optionTop}>
              <Text style={styles.optionIcon}>👥</Text>
              <Text style={styles.optionTitle}>Accountability Partner</Text>
            </View>
            <Text style={styles.optionDesc}>
              Invite a trusted person. They can lock your settings from their phone so only they can allow changes.
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

      {lockMode === 'partner' && (
        <View>
          {/* My invite code */}
          {myDoc && (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your invite code</Text>
              <Text style={styles.codeValue}>{myDoc.inviteCode}</Text>
              <TouchableOpacity onPress={() => {
                Clipboard.setString(myDoc.inviteCode);
                Alert.alert('Copied!', 'Share this code with your accountability partner.');
              }}>
                <Text style={styles.codeCopy}>Tap to copy</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Not connected yet */}
          {myDoc && !myDoc.partnerId && (
            <View style={styles.connectCard}>
              <Text style={styles.connectTitle}>Connect a partner</Text>
              <Text style={styles.connectSub}>Ask your partner to open GeoBlock and share their invite code with you.</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter their code"
                placeholderTextColor="#555"
                autoCapitalize="characters"
                value={codeInput}
                onChangeText={setCodeInput}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleConnectPartner}
                disabled={loadingPartner}>
                {loadingPartner
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryButtonText}>Connect</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Connected */}
          {myDoc?.partnerId && partnerDoc && (
            <View>
              <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>Partner: {partnerDoc.displayName || partnerDoc.email}</Text>
                <Text style={styles.statusCardSub}>
                  {partnerDoc.isLocking
                    ? '🔒 Your partner is currently locking your settings.'
                    : '🔓 Your partner is not locking your settings right now.'}
                </Text>
              </View>

              <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>Lock your partner</Text>
                <Text style={styles.statusCardSub}>
                  When you lock your partner, they cannot change their blocked apps until you unlock them.
                </Text>
                <TouchableOpacity
                  style={[myDoc?.isLocking ? styles.warningButton : styles.primaryButton, {marginTop: 12}]}
                  onPress={handleToggleLock}>
                  <Text style={myDoc?.isLocking ? styles.warningButtonText : styles.primaryButtonText}>
                    {myDoc?.isLocking
                      ? `Unlock ${partnerDoc.displayName || 'Partner'}`
                      : `Lock ${partnerDoc.displayName || 'Partner'}`}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.ghostButton} onPress={handleDisconnect}>
                <Text style={styles.ghostButtonText}>Disconnect Partner</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading / error */}
          {!myDoc && !firestoreError && <ActivityIndicator color="#4f46e5" style={{marginTop: 20}} />}
          {firestoreError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>Couldn't connect to server. Check your internet connection.</Text>
              <TouchableOpacity onPress={() => {
                setFirestoreError(false);
                getOrCreateUserDoc()
                  .then(doc => { setMyDoc(doc); })
                  .catch(() => setFirestoreError(true));
              }}>
                <Text style={styles.errorBannerRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.ghostButton, {marginTop: 8}]} onPress={handleDisableMode}>
            <Text style={styles.ghostButtonText}>Disable Partner Mode</Text>
          </TouchableOpacity>
        </View>
      )}

      {lockHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Activity</Text>
          {lockHistory.slice(0, 10).map(event => (
            <View key={event.id} style={styles.historyRow}>
              <Text style={styles.historyLabel}>{event.label}</Text>
              <Text style={styles.historyTime}>{formatAge(event.timestamp)}</Text>
            </View>
          ))}
        </View>
      )}

      {isAdmin && (
        <TouchableOpacity style={styles.devButton} onPress={devResetLock}>
          <Text style={styles.devButtonText}>⚙ DEV: Reset all locks</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, paddingBottom: 40},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 24},
    sectionTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 14},
    optionCard: {backgroundColor: c.surface, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: c.border},
    optionTop: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
    optionIcon: {fontSize: 20, marginRight: 10},
    optionTitle: {fontSize: 16, fontWeight: '700', color: c.text},
    optionDesc: {fontSize: 14, color: c.textSecondary, lineHeight: 21},
    statusCard: {borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, backgroundColor: c.surface, borderColor: c.border},
    statusCardLocked: {backgroundColor: c.cardLocked, borderColor: c.cardLockedBorder},
    statusCardUnlocked: {backgroundColor: c.surface, borderColor: c.border},
    statusCardTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6},
    statusCardSub: {fontSize: 14, color: c.textSecondary, lineHeight: 21},
    primaryButton: {backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12},
    primaryButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
    warningButton: {backgroundColor: c.dangerBg, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: c.dangerBorder},
    warningButtonText: {color: c.dangerText, fontWeight: '700', fontSize: 15},
    ghostButton: {borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginTop: 4},
    ghostButtonText: {color: c.textMuted, fontWeight: '600', fontSize: 14},
    countdownCard: {backgroundColor: c.cardLocked, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: c.cardLockedBorder},
    countdownLabel: {fontSize: 13, color: c.accentSoft, marginBottom: 8},
    countdownTimer: {fontSize: 48, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums']},
    countdownSub: {fontSize: 13, color: c.accentSoft, marginTop: 6, marginBottom: 16},
    cancelButton: {backgroundColor: c.surfaceSecondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10},
    cancelButtonText: {color: c.text, fontWeight: '600', fontSize: 14},
    codeCard: {backgroundColor: c.surface, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: c.border},
    codeLabel: {fontSize: 13, color: c.textSecondary, marginBottom: 8},
    codeValue: {fontSize: 36, fontWeight: '800', color: c.text, letterSpacing: 6, marginBottom: 8},
    codeCopy: {fontSize: 13, color: c.accent, fontWeight: '600'},
    connectCard: {backgroundColor: c.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: c.border},
    connectTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6},
    connectSub: {fontSize: 13, color: c.textSecondary, lineHeight: 19, marginBottom: 16},
    codeInput: {backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: 4, borderWidth: 1, borderColor: c.border, marginBottom: 12, textAlign: 'center'},
    historySection: {marginTop: 32, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 20},
    historySectionTitle: {fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1},
    historyRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.borderSubtle},
    historyLabel: {fontSize: 14, color: c.textSecondary, flex: 1},
    historyTime: {fontSize: 13, color: c.textFaint, marginLeft: 12},
    errorBanner: {backgroundColor: c.dangerBg, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: c.dangerBorder},
    errorBannerText: {color: c.dangerText, fontSize: 13, marginBottom: 8},
    errorBannerRetry: {color: c.danger, fontWeight: '700', fontSize: 13},
    devButton: {marginTop: 24, alignItems: 'center', padding: 8},
    devButtonText: {color: c.textFaint, fontSize: 12},
  });
}
