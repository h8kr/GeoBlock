import {useAppContext} from '../store/AppContext';

export const fonts = {
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  bold: 'Geist-Bold',
  extrabold: 'Geist-ExtraBold',
};

export const darkColors = {
  background: '#131313',
  surface: '#1c1b1b',
  surfaceSecondary: '#2a2a2a',
  border: '#464555',
  borderSubtle: '#2a2a2a',
  text: '#e5e2e1',
  textSecondary: '#c7c4d8',
  textMuted: '#918fa1',
  textFaint: '#464555',
  accent: '#4f46e5',
  accentSoft: '#c3c0ff',
  danger: '#ffb4ab',
  dangerBg: '#93000a',
  dangerBorder: '#690005',
  dangerText: '#ffdad6',
  warning: '#fbbf24',
  warningBg: '#2d1a00',
  warningBorder: '#92400e',
  warningText: '#d97706',
  success: '#4ade80',
  successBg: '#14532d',
  cardLocked: '#1e1b4b',
  cardLockedBorder: '#4f46e5',
  statusBar: 'light-content' as const,
  tabBar: '#131313',
  tabBarBorder: '#1c1b1b',
  inputBg: '#0e0e0e',
  modalOverlay: 'rgba(0,0,0,0.75)',
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
