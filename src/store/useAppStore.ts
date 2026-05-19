import {useState, useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BlockingModule from '../native/BlockingModule';
import GeofenceModule from '../native/GeofenceModule';
import {COMMON_APPS} from './apps';
import type {BlockedApp, LocationRule, SelfLock, LockMode, Partner, LockEvent, BlockingSession} from '../types';

const STORAGE_KEYS = {
  BLOCKED_APPS: 'geoblock_blocked_apps',
  LOCATION_RULES: 'geoblock_location_rules',
  SELF_LOCK: 'geoblock_self_lock',
  LOCK_MODE: 'geoblock_lock_mode',
  LOCK_HISTORY: 'geoblock_lock_history',
  THEME: 'geoblock_theme',
  PARTNER: 'geoblock_partner',
  BLOCKING_SESSIONS: 'geoblock_blocking_sessions',
};

const DEFAULT_SELF_LOCK: SelfLock = {
  isLocked: false,
  unlockRequestedAt: null,
  unlockDelayMs: 3600000,
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isWithinSchedule(zone: LocationRule): boolean {
  if (!zone.schedule || zone.schedule.days.length === 0) return true;
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun
  const currentMins = now.getHours() * 60 + now.getMinutes();
  if (!zone.schedule.days.includes(currentDay)) return false;
  const [startH, startM] = zone.schedule.startTime.split(':').map(Number);
  const [endH, endM] = zone.schedule.endTime.split(':').map(Number);
  return currentMins >= startH * 60 + startM && currentMins <= endH * 60 + endM;
}

export function useAppStore(uid?: string) {
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [locationRules, setLocationRules] = useState<LocationRule[]>([]);
  const [selfLock, setSelfLock] = useState<SelfLock>(DEFAULT_SELF_LOCK);
  const [lockMode, setLockMode] = useState<LockMode>('none');
  const [partner, setPartnerState] = useState<Partner | null>(null);
  const [lockHistory, setLockHistory] = useState<LockEvent[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZone, setCurrentZone] = useState<LocationRule | null>(null);
  const [blockingSessions, setBlockingSessions] = useState<BlockingSession[]>([]);

  const locationRulesRef = useRef<LocationRule[]>([]);
  const currentZoneRef = useRef<LocationRule | null>(null);
  const sessionStartRef = useRef<Record<string, number>>({});

  useEffect(() => {
    locationRulesRef.current = locationRules;
  }, [locationRules]);

  useEffect(() => {
    loadFromStorage();
  }, [uid]);

  // Combine and push blocked apps to native module.
  // Zone packages are included here (JS-side enforcement) so blocking is immediate
  // when the dashboard detects a zone, without waiting for Android's Geofencing API event.
  useEffect(() => {
    if (!isLoaded) return;
    const partnerPackages = partner?.blockedPackages || [];
    const userPackages = blockedApps.filter(a => a.isBlocked).map(a => a.packageName);
    const zonePackages =
      currentZone && isWithinSchedule(currentZone)
        ? currentZone.blockedAppIds
            .map(id =>
              blockedApps.find(a => a.id === id)?.packageName ??
              COMMON_APPS.find(a => a.id === id)?.packageName,
            )
            .filter((p): p is string => !!p)
        : [];
    const allPackages = Array.from(new Set([...userPackages, ...partnerPackages, ...zonePackages]));
    BlockingModule.setBlockedApps(allPackages);
  }, [blockedApps, partner, isLoaded, currentZone]);

  // Zone polling — checks every 60 s, tracks blocking sessions
  useEffect(() => {
    if (!isLoaded) return;

    function handleZoneTransition(oldZone: LocationRule | null, newZone: LocationRule | null) {
      const now = Date.now();
      const newSessions: BlockingSession[] = [];

      if (oldZone) {
        oldZone.blockedAppIds.forEach(appId => {
          const app = COMMON_APPS.find(a => a.id === appId);
          if (!app) return;
          const startTime = sessionStartRef.current[app.packageName];
          if (startTime) {
            newSessions.push({
              id: `${startTime}_${app.packageName}`,
              packageName: app.packageName,
              appName: app.appName,
              zoneId: oldZone.id,
              zoneName: oldZone.name,
              startTime,
              endTime: now,
            });
            delete sessionStartRef.current[app.packageName];
          }
        });
      }

      if (newZone) {
        newZone.blockedAppIds.forEach(appId => {
          const app = COMMON_APPS.find(a => a.id === appId);
          if (!app) return;
          if (!sessionStartRef.current[app.packageName]) {
            sessionStartRef.current[app.packageName] = now;
          }
        });
      }

      if (newSessions.length > 0) {
        setBlockingSessions(prev => {
          const updated = [...newSessions, ...prev].slice(0, 500);
          AsyncStorage.setItem(getKey(STORAGE_KEYS.BLOCKING_SESSIONS), JSON.stringify(updated));
          return updated;
        });
      }
    }

    async function checkZone() {
      try {
        const {latitude, longitude} = await GeofenceModule.getCurrentLocation();
        const active = locationRulesRef.current.filter(r => r.isActive);
        const found =
          active.find(
            rule =>
              haversineDistance(latitude, longitude, rule.latitude, rule.longitude) <=
              rule.radiusMeters,
          ) ?? null;
        if (currentZoneRef.current?.id !== found?.id) {
          handleZoneTransition(currentZoneRef.current, found);
          currentZoneRef.current = found;
          setCurrentZone(found);
        }
      } catch {}
    }

    checkZone();
    const id = setInterval(checkZone, 60000);
    return () => clearInterval(id);
  }, [isLoaded]);

  const getKey = (baseKey: string) => {
    if (baseKey === STORAGE_KEYS.THEME) return baseKey;
    return uid ? `${baseKey}_${uid}` : baseKey;
  };

  async function setPartner(p: Partner | null) {
    setPartnerState(p);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.PARTNER), JSON.stringify(p));
  }

  async function loadFromStorage() {
    setPartnerState(null);
    try {
      const [appsJson, rulesJson, lockJson, modeJson, historyJson, themeJson, partnerJson, sessionsJson] = await Promise.all([
        AsyncStorage.getItem(getKey(STORAGE_KEYS.BLOCKED_APPS)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.LOCATION_RULES)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.SELF_LOCK)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.LOCK_MODE)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.LOCK_HISTORY)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.THEME)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.PARTNER)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.BLOCKING_SESSIONS)),
      ]);
      if (appsJson) {
        const apps: BlockedApp[] = JSON.parse(appsJson);
        setBlockedApps(apps);
      } else {
        setBlockedApps([]);
      }
      if (rulesJson) {
        const rules: LocationRule[] = JSON.parse(rulesJson);
        setLocationRules(rules);
        locationRulesRef.current = rules;
        const appsToUse: BlockedApp[] = appsJson ? JSON.parse(appsJson) : [];
        const geofenceRules = rules.map(r => ({
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          radiusMeters: r.radiusMeters,
          isActive: r.isActive,
          blockedPackages: r.blockedAppIds
            .map(id =>
              appsToUse.find(a => a.id === id)?.packageName ??
              COMMON_APPS.find(a => a.id === id)?.packageName,
            )
            .filter((p): p is string => !!p),
          schedule: r.schedule,
        }));
        GeofenceModule.updateGeofences(geofenceRules).catch(() => {});
      } else {
        setLocationRules([]);
        GeofenceModule.updateGeofences([]).catch(() => {});
      }
      if (lockJson) setSelfLock(JSON.parse(lockJson)); else setSelfLock(DEFAULT_SELF_LOCK);
      if (modeJson) setLockMode(JSON.parse(modeJson)); else setLockMode('none');
      if (historyJson) setLockHistory(JSON.parse(historyJson)); else setLockHistory([]);
      if (themeJson) setTheme(JSON.parse(themeJson));
      if (partnerJson) setPartnerState(JSON.parse(partnerJson)); else setPartnerState(null);
      if (sessionsJson) setBlockingSessions(JSON.parse(sessionsJson)); else setBlockingSessions([]);
    } finally {
      setIsLoaded(true);
    }
  }

  async function updateBlockedApps(apps: BlockedApp[]) {
    setBlockedApps(apps);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.BLOCKED_APPS), JSON.stringify(apps));
  }

  async function updateLocationRules(rules: LocationRule[], allApps?: BlockedApp[]) {
    setLocationRules(rules);
    locationRulesRef.current = rules;
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.LOCATION_RULES), JSON.stringify(rules));
    const appsToUse = allApps ?? blockedApps;
    const geofenceRules = rules.map(r => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      radiusMeters: r.radiusMeters,
      isActive: r.isActive,
      blockedPackages: r.blockedAppIds
        .map(id =>
          appsToUse.find(a => a.id === id)?.packageName ??
          COMMON_APPS.find(a => a.id === id)?.packageName,
        )
        .filter((p): p is string => !!p),
      schedule: r.schedule,
    }));
    GeofenceModule.updateGeofences(geofenceRules).catch(() => {});
  }

  async function updateSelfLock(lock: SelfLock) {
    setSelfLock(lock);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.SELF_LOCK), JSON.stringify(lock));
  }

  async function updateLockMode(mode: LockMode) {
    setLockMode(mode);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.LOCK_MODE), JSON.stringify(mode));
  }

  // Returns ms remaining in unlock countdown, or 0 if unlocked/not requested
  function getUnlockCountdownMs(): number {
    if (!selfLock.unlockRequestedAt) return 0;
    const elapsed = Date.now() - selfLock.unlockRequestedAt;
    const remaining = selfLock.unlockDelayMs - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  async function addLockEvent(type: string, label: string) {
    const event: LockEvent = {id: Date.now().toString(), type, label, timestamp: Date.now()};
    setLockHistory(prev => {
      const updated = [event, ...prev].slice(0, 50);
      AsyncStorage.setItem(getKey(STORAGE_KEYS.LOCK_HISTORY), JSON.stringify(updated));
      return updated;
    });
  }

  async function requestSelfUnlock() {
    const updated: SelfLock = {...selfLock, unlockRequestedAt: Date.now()};
    await updateSelfLock(updated);
    await addLockEvent('unlock_requested', 'Unlock countdown started');
  }

  async function cancelSelfUnlock() {
    const updated: SelfLock = {...selfLock, unlockRequestedAt: null};
    await updateSelfLock(updated);
    await addLockEvent('unlock_cancelled', 'Unlock request cancelled');
  }

  async function activateSelfLock() {
    const updated: SelfLock = {
      ...selfLock,
      isLocked: true,
      unlockRequestedAt: null,
    };
    await updateSelfLock(updated);
    await addLockEvent('self_lock_on', 'Self-lock activated');
  }

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem(getKey(STORAGE_KEYS.THEME), JSON.stringify(next));
  }

  async function devResetLock() {
    await updateSelfLock(DEFAULT_SELF_LOCK);
    await updateLockMode('none');
    await addLockEvent('dev_reset', 'DEV: All locks reset');
  }

  return {
    blockedApps,
    locationRules,
    selfLock,
    lockMode,
    partner,
    lockHistory,
    theme,
    toggleTheme,
    isLoaded,
    currentZone,
    blockingSessions,
    setPartner,
    addLockEvent,
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
