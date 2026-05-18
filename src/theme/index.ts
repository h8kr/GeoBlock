import {useAppContext} from '../store/AppContext';

export const darkColors = {
  background: '#0f0f0f',
  surface: '#1c1c1c',
  surfaceSecondary: '#2a2a2a',
  border: '#2a2a2a',
  borderSubtle: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  textFaint: '#444444',
  accent: '#4f46e5',
  accentSoft: '#a5b4fc',
  danger: '#ef4444',
  dangerBg: '#2d1515',
  dangerBorder: '#7f1d1d',
  dangerText: '#fca5a5',
  warning: '#fbbf24',
  warningBg: '#2d1a00',
  warningBorder: '#92400e',
  warningText: '#d97706',
  success: '#4ade80',
  successBg: '#14532d',
  cardLocked: '#1e1b4b',
  cardLockedBorder: '#4f46e5',
  statusBar: 'light-content' as const,
  tabBar: '#0f0f0f',
  tabBarBorder: '#1c1c1c',
  inputBg: '#0f0f0f',
  modalOverlay: 'rgba(0,0,0,0.7)',
  locationButton: '#1e3a5f',
  locationButtonBorder: '#2a5298',
  locationButtonText: '#60a5fa',
};

export const lightColors = {
  background: '#f7f7f7',
  surface: '#ffffff',
  surfaceSecondary: '#f0f0f0',
  border: '#e5e5e5',
  borderSubtle: '#eeeeee',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#aaaaaa',
  textFaint: '#cccccc',
  accent: '#4f46e5',
  accentSoft: '#6366f1',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#dc2626',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#b45309',
  success: '#16a34a',
  successBg: '#f0fdf4',
  cardLocked: '#eef2ff',
  cardLockedBorder: '#4f46e5',
  statusBar: 'dark-content' as const,
  tabBar: '#ffffff',
  tabBarBorder: '#e5e5e5',
  inputBg: '#f7f7f7',
  modalOverlay: 'rgba(0,0,0,0.5)',
  locationButton: '#eff6ff',
  locationButtonBorder: '#bfdbfe',
  locationButtonText: '#2563eb',
};

export type Colors = typeof darkColors;

export function useTheme() {
  const {store} = useAppContext();
  const colors = store.theme === 'light' ? lightColors : darkColors;
  return {colors, theme: store.theme, toggleTheme: store.toggleTheme};
}
