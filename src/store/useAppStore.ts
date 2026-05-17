import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BlockingModule from '../native/BlockingModule';
import GeofenceModule from '../native/GeofenceModule';
import type {BlockedApp, LocationRule, SelfLock, LockMode, Partner} from '../types';

const STORAGE_KEYS = {
  BLOCKED_APPS: 'geoblock_blocked_apps',
  LOCATION_RULES: 'geoblock_location_rules',
  SELF_LOCK: 'geoblock_self_lock',
  LOCK_MODE: 'geoblock_lock_mode',
};

const DEFAULT_SELF_LOCK: SelfLock = {
  isLocked: false,
  unlockRequestedAt: null,
  unlockDelayMs: 3600000,
};

export function useAppStore() {
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [locationRules, setLocationRules] = useState<LocationRule[]>([]);
  const [selfLock, setSelfLock] = useState<SelfLock>(DEFAULT_SELF_LOCK);
  const [lockMode, setLockMode] = useState<LockMode>('none');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  async function loadFromStorage() {
    try {
      const [appsJson, rulesJson, lockJson, modeJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_APPS),
        AsyncStorage.getItem(STORAGE_KEYS.LOCATION_RULES),
        AsyncStorage.getItem(STORAGE_KEYS.SELF_LOCK),
        AsyncStorage.getItem(STORAGE_KEYS.LOCK_MODE),
      ]);
      if (appsJson) {
        const apps: BlockedApp[] = JSON.parse(appsJson);
        setBlockedApps(apps);
        BlockingModule.setBlockedApps(apps.filter(a => a.isBlocked).map(a => a.packageName));
      }
      if (rulesJson) setLocationRules(JSON.parse(rulesJson));
      if (lockJson) setSelfLock(JSON.parse(lockJson));
      if (modeJson) setLockMode(JSON.parse(modeJson));
    } finally {
      setIsLoaded(true);
    }
  }

  async function updateBlockedApps(apps: BlockedApp[]) {
    setBlockedApps(apps);
    await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    BlockingModule.setBlockedApps(apps.filter(a => a.isBlocked).map(a => a.packageName));
  }

  async function updateLocationRules(rules: LocationRule[], allApps?: BlockedApp[]) {
    setLocationRules(rules);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_RULES, JSON.stringify(rules));
    const appsToUse = allApps ?? blockedApps;
    const geofenceRules = rules.map(r => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      radiusMeters: r.radiusMeters,
      isActive: r.isActive,
      blockedPackages: r.blockedAppIds
        .map(id => appsToUse.find(a => a.id === id)?.packageName)
        .filter((p): p is string => !!p),
    }));
    GeofenceModule.updateGeofences(geofenceRules).catch(() => {});
  }

  async function updateSelfLock(lock: SelfLock) {
    setSelfLock(lock);
    await AsyncStorage.setItem(STORAGE_KEYS.SELF_LOCK, JSON.stringify(lock));
  }

  async function updateLockMode(mode: LockMode) {
    setLockMode(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCK_MODE, JSON.stringify(mode));
  }

  // Returns ms remaining in unlock countdown, or 0 if unlocked/not requested
  function getUnlockCountdownMs(): number {
    if (!selfLock.unlockRequestedAt) return 0;
    const elapsed = Date.now() - selfLock.unlockRequestedAt;
    const remaining = selfLock.unlockDelayMs - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  async function requestSelfUnlock() {
    const updated: SelfLock = {...selfLock, unlockRequestedAt: Date.now()};
    await updateSelfLock(updated);
  }

  async function cancelSelfUnlock() {
    const updated: SelfLock = {...selfLock, unlockRequestedAt: null};
    await updateSelfLock(updated);
  }

  async function activateSelfLock() {
    const updated: SelfLock = {
      ...selfLock,
      isLocked: true,
      unlockRequestedAt: null,
    };
    await updateSelfLock(updated);
  }

  async function devResetLock() {
    await updateSelfLock(DEFAULT_SELF_LOCK);
    await updateLockMode('none');
  }

  return {
    blockedApps,
    locationRules,
    selfLock,
    lockMode,
    partner,
    isLoaded,
    setPartner,
    updateBlockedApps,
    updateLocationRules,
    updateSelfLock,
    updateLockMode,
    getUnlockCountdownMs,
    requestSelfUnlock,
    cancelSelfUnlock,
    activateSelfLock,
    devResetLock,
  };
}
