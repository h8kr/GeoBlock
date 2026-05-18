export type LockMode = 'partner' | 'self' | 'none';

export interface BlockedApp {
  id: string;
  packageName: string;
  appName: string;
  icon?: string;
  isBlocked: boolean;
}

export interface LocationRule {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  blockedAppIds: string[];
  isActive: boolean;
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
