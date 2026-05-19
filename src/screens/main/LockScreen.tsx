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
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {getAuth} from '@react-native-firebase/auth';
import {useAppContext} from '../../store/AppContext';
import {useTheme, Colors} from '../../theme';
import {
  getOrCreateUserDoc,
  connectPartner,
  disconnectPartner,
  setPartnerBlockedApps,
  subscribeToPartner,
  UserDoc,
} from '../../services/PartnerService';
import SettingsModal from '../../components/SettingsModal';

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
  const [showSettings, setShowSettings] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Partner mode state
  const [myDoc, setMyDoc] = useState<UserDoc | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<UserDoc | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | false>(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [savingApps, setSavingApps] = useState(false);
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
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    setFirestoreError(false);
    setMyDoc(null);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      setFirestoreError('Connection timed out after 10 seconds');
    }, 10000);
    getOrCreateUserDoc().then(doc => {
      clearTimeout(timeout);
      if (timedOut) return;
      setFirestoreError(false);
      setMyDoc(doc);
      setSelectedApps(doc.partnerBlockedPackages || []);
      myUnsubRef.current?.();
      myUnsubRef.current = subscribeToPartner(uid, updated => setMyDoc(updated));
      if (doc.partnerId) {
        subscribeToPartnerDoc(doc.partnerId);
      }
    }).catch((e: any) => {
      clearTimeout(timeout);
      setFirestoreError(e?.message || e?.toString() || 'Unknown Firestore error');
    });
    return () => clearTimeout(timeout);
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
      setPartner({uid: partnerId, displayName: doc.displayName, email: doc.email, isLockingYou: doc.isLocking, blockedPackages: doc.partnerBlockedPackages || []});
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

  function toggleAppSelection(packageName: string) {
    setSelectedApps(prev =>
      prev.includes(packageName)
        ? prev.filter(p => p !== packageName)
        : [...prev, packageName],
    );
  }

  async function handleSavePartnerApps() {
    if (!myDoc?.partnerId) return;
    setSavingApps(true);
    try {
      await setPartnerBlockedApps(myDoc.partnerId, selectedApps);
      addLockEvent(
        selectedApps.length > 0 ? 'partner_apps_set' : 'partner_apps_cleared',
        selectedApps.length > 0
          ? `Blocking ${selectedApps.length} app(s) on partner's device`
          : "Cleared all blocks on partner's device",
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingApps(false);
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
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 12}]}>

      {/* GeoBlock Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="security" size={20} color={colors.accent} />
          <Text style={styles.headerLogo}>GeoBlock</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={{padding: 4}}>
          <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.heading}>Lock Mode</Text>
      <Text style={styles.subheading}>Prevent yourself from disabling your blocks.</Text>

      {lockMode === 'none' && (
        <View>
          <TouchableOpacity style={styles.optionCard} onPress={() => handleSelectMode('self')}>
            <View style={styles.optionCardInner}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="timer" size={22} color="#fff" />
                </View>
                <Text style={styles.optionTitle}>Self-Lock</Text>
                <Text style={styles.optionDesc}>
                  Lock your settings on this device. If you want to turn off your blocks, you must wait 1 hour after requesting the unlock.
                </Text>
                <Text style={styles.optionLink}>Activate protocol &gt;</Text>
              </View>
              <MaterialIcons name="timer" size={64} color={colors.border} style={styles.optionGhostIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => handleSelectMode('partner')}>
            <View style={styles.optionCardInner}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="people" size={22} color="#fff" />
                </View>
                <Text style={styles.optionTitle}>Accountability Partner</Text>
                <Text style={styles.optionDesc}>
                  Connect with a trusted friend. They must approve any changes to your blocking rules via a secure verification code.
                </Text>
                <Text style={styles.optionLink}>Setup partner &gt;</Text>
              </View>
              <MaterialIcons name="people" size={64} color={colors.border} style={styles.optionGhostIcon} />
            </View>
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
                placeholderTextColor={colors.textMuted}
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
          {myDoc?.partnerId && partnerDoc && (() => {
            const installedApps = partnerDoc.installedApps ?? [];
            return (
            <View>
              <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>Partner: {partnerDoc.displayName || partnerDoc.email}</Text>
                <Text style={styles.statusCardSub}>
                  {(partner?.blockedPackages?.length ?? 0) > 0
                    ? `🔒 Your partner is blocking ${partner!.blockedPackages.length} app(s) on your device.`
                    : '🔓 Your partner is not blocking any apps on your device.'}
                </Text>
              </View>

              <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>Block apps on {partnerDoc.displayName || 'partner'}'s device</Text>
                <Text style={styles.statusCardSub}>
                  Select which apps to block. These will be enforced on their device immediately.
                </Text>
                {installedApps.length === 0 ? (
                  <Text style={[styles.statusCardSub, {marginTop: 12, color: colors.textMuted}]}>
                    No app list available. Ask your partner to open GeoBlock to sync their installed apps.
                  </Text>
                ) : (
                <ScrollView style={{maxHeight: 300, marginTop: 12}} nestedScrollEnabled={true}>
                  {installedApps.map((app: any) => {
                    const isSelected = selectedApps.includes(app.packageName);
                    return (
                      <TouchableOpacity
                        key={app.id || app.packageName}
                        style={[styles.appRow, isSelected && styles.appRowSelected]}
                        onPress={() => toggleAppSelection(app.packageName)}>
                        <Text style={[styles.appRowText, isSelected && styles.appRowTextSelected]} numberOfLines={1}>
                          {app.appName}
                        </Text>
                        <MaterialIcons
                          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                          size={22}
                          color={isSelected ? colors.accent : colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                )}
                <TouchableOpacity
                  style={[styles.primaryButton, {marginTop: 14}]}
                  onPress={handleSavePartnerApps}
                  disabled={savingApps}>
                  {savingApps
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>
                        {selectedApps.length > 0
                          ? `Block ${selectedApps.length} App(s)`
                          : 'Clear All Blocks'}
                      </Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.ghostButton} onPress={handleDisconnect}>
                <Text style={styles.ghostButtonText}>Disconnect Partner</Text>
              </TouchableOpacity>
            </View>
          )})()}

          {/* Loading / error */}
          {!myDoc && !firestoreError && <ActivityIndicator color="#4f46e5" style={{marginTop: 20}} />}
          {firestoreError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>Couldn't connect to server: {firestoreError}</Text>
              <TouchableOpacity onPress={() => {
                setFirestoreError(false);
                setMyDoc(null);
                getOrCreateUserDoc()
                  .then(doc => { setMyDoc(doc); })
                  .catch((e: any) => setFirestoreError(e?.message || 'Unknown error'));
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
          {lockHistory.slice(0, showAllHistory ? lockHistory.length : 3).map(event => (
            <View key={event.id} style={styles.historyRow}>
              <Text style={styles.historyLabel}>{event.label}</Text>
              <Text style={styles.historyTime}>{formatAge(event.timestamp)}</Text>
            </View>
          ))}
          {!showAllHistory && lockHistory.length > 3 && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllHistory(true)}>
              <Text style={styles.showMoreText}>Show More ({lockHistory.length - 3} more)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />

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
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
    headerLogo: {fontSize: 16, fontWeight: '700', color: c.text},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 24},
    optionCard: {backgroundColor: c.surface, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden'},
    optionCardInner: {flexDirection: 'row', alignItems: 'center', padding: 20},
    optionLeft: {flex: 1, paddingRight: 12},
    optionIconBox: {width: 44, height: 44, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 14},
    optionTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 8},
    optionDesc: {fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 12},
    optionLink: {fontSize: 13, fontWeight: '600', color: c.accent},
    optionGhostIcon: {opacity: 0.15},
    statusCard: {borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, backgroundColor: c.surface, borderColor: c.border},
    statusCardLocked: {backgroundColor: c.cardLocked, borderColor: c.cardLockedBorder},
    statusCardUnlocked: {backgroundColor: c.surface, borderColor: c.border},
    statusCardTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6},
    statusCardSub: {fontSize: 14, color: c.textSecondary, lineHeight: 21},
    appRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: c.inputBg, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: c.border},
    appRowSelected: {backgroundColor: c.accent + '15', borderColor: c.accent + '40'},
    appRowText: {fontSize: 15, fontWeight: '600', color: c.text, flex: 1, marginRight: 12},
    appRowTextSelected: {color: c.accent},
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
    codeCopy: {fontSize: 13, fontWeight: '600', color: c.accent},
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
    showMoreBtn: {paddingVertical: 10, alignItems: 'center'},
    showMoreText: {fontSize: 13, color: c.accent, fontWeight: '600'},
  });
}
