export type LockMode = 'partner' | 'self' | 'none';

export interface BlockedApp {
  id: string;
  packageName: string;
  appName: string;
  icon?: string;
  isBlocked: boolean;
}

export interface BlockSchedule {
  days: number[];       // 0=Sun 1=Mon … 6=Sat
  startTime: string;    // "HH:MM" 24h
  endTime: string;      // "HH:MM" 24h
}

export interface LocationRule {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  blockedAppIds: string[];
  isActive: boolean;
  schedule?: BlockSchedule;
}

export interface BlockingSession {
  id: string;
  packageName: string;
  appName: string;
  zoneId: string;
  zoneName: string;
  startTime: number;
  endTime: number;
}

export interface SelfLock {
  isLocked: boolean;
  unlockRequestedAt: number | null; // timestamp
  unlockDelayMs: number; // default 3600000 (1 hour)
}

export interface Partner {
  uid: string;
  displayName: string;
  email: string;
  isLockingYou: boolean;
  blockedPackages: string[]; // packages your partner chose to block on YOUR device
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  lockMode: LockMode;
  selfLock: SelfLock;
  partner: Partner | null;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  ScreenTime: undefined;
  LocationRules: undefined;
  Partner: undefined;
};

export interface LockEvent {
  id: string;
  type: string;
  label: string;
  timestamp: number;
}
