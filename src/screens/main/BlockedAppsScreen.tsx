import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppContext} from '../../store/AppContext';
import BlockingModule from '../../native/BlockingModule';
import InstalledAppsModule, {InstalledApp} from '../../native/InstalledAppsModule';
import {COMMON_APPS} from '../../store/apps';
import {darkColors, fonts} from '../../theme';
import type {BlockedApp} from '../../types';

const c = darkColors;

export default function BlockedAppsScreen() {
  const {store} = useAppContext();
  const insets = useSafeAreaInsets();
  const {blockedApps, updateBlockedApps, selfLock, lockMode, partner} = store;
  const [search, setSearch] = useState('');
  const [serviceEnabled, setServiceEnabled] = useState<boolean | null>(null);
  const [appList, setAppList] = useState<InstalledApp[]>(COMMON_APPS);

  useEffect(() => {
    BlockingModule.isAccessibilityServiceEnabled().then(setServiceEnabled);
    InstalledAppsModule.getInstalledApps()
      .then(apps => { if (apps.length > 0) setAppList(apps); })
      .catch(() => {}); // fall back to COMMON_APPS if native module not ready
  }, []);

  const isLocked =
    (lockMode === 'self' && selfLock.isLocked) ||
    (lockMode === 'partner' && !!partner?.isLockingYou);

  function getAppState(app: Omit<BlockedApp, 'isBlocked'>): BlockedApp {
    const existing = blockedApps.find(a => a.id === app.id);
    return existing ?? {...app, isBlocked: false};
  }

  function toggleApp(app: Omit<BlockedApp, 'isBlocked'>) {
    if (isLocked) {
      Alert.alert(
        'Locked',
        lockMode === 'partner'
          ? 'Your accountability partner has locked your settings.'
          : 'Your settings are locked. Request an unlock from the Lock screen.',
      );
      return;
    }
    const current = getAppState(app);
    const updated = blockedApps.some(a => a.id === app.id)
      ? blockedApps.map(a => (a.id === app.id ? {...a, isBlocked: !a.isBlocked} : a))
      : [...blockedApps, {...app, isBlocked: true}];
    updateBlockedApps(updated);
  }

  const filtered = appList.filter(a =>
    a.appName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top + 16}]}>
      <Text style={styles.heading}>Blocked Apps</Text>
      <Text style={styles.subheading}>
        Toggle apps to block. Blocks are enforced while active.
      </Text>

      {serviceEnabled === false && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => BlockingModule.openAccessibilitySettings()}>
          <Text style={styles.warningTitle}>Blocking is not active</Text>
          <Text style={styles.warningBody}>
            Tap here to enable GeoBlock in Accessibility Settings — this is what actually stops you from opening blocked apps.
          </Text>
        </TouchableOpacity>
      )}

      {isLocked && (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedText}>Settings are locked</Text>
        </View>
      )}

      <TextInput
        style={styles.search}
        placeholder="Search apps..."
        placeholderTextColor={c.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({item}) => {
          const state = getAppState(item);
          return (
            <View style={styles.row}>
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>{item.appName[0]}</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{item.appName}</Text>
                <Text style={styles.packageName}>{item.packageName}</Text>
              </View>
              <Switch
                value={state.isBlocked}
                onValueChange={() => toggleApp(item)}
                trackColor={{false: c.surfaceSecondary, true: c.accent}}
                thumbColor={state.isBlocked ? '#fff' : c.textMuted}
              />
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: c.background, paddingHorizontal: 20},
  heading: {fontSize: 28, fontWeight: '800', fontFamily: fonts.extrabold, color: c.text, marginBottom: 4},
  subheading: {fontSize: 14, fontFamily: fonts.regular, color: c.textSecondary, marginBottom: 16},
  warningBanner: {
    backgroundColor: c.warningBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.warningBorder,
  },
  warningTitle: {color: c.warning, fontSize: 13, fontWeight: '700', fontFamily: fonts.bold, marginBottom: 3},
  warningBody: {color: c.warningText, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17},
  lockedBanner: {
    backgroundColor: c.dangerBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.dangerBorder,
  },
  lockedText: {color: c.dangerText, fontSize: 13, fontWeight: '600', fontFamily: fonts.semibold, textAlign: 'center'},
  search: {
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    color: c.text,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  list: {paddingBottom: 40},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  appIconText: {fontSize: 18, fontWeight: '700', fontFamily: fonts.bold, color: c.text},
  appInfo: {flex: 1},
  appName: {fontSize: 15, fontWeight: '600', fontFamily: fonts.semibold, color: c.text},
  packageName: {fontSize: 11, fontFamily: fonts.regular, color: c.textMuted, marginTop: 2},
  separator: {height: 1, backgroundColor: c.borderSubtle},
});
