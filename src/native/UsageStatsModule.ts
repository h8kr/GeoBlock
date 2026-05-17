import {NativeModules} from 'react-native';

const {UsageStatsModule} = NativeModules;

export interface AppUsage {
  packageName: string;
  appName: string;
  minutes: number;
}

export default {
  hasUsagePermission(): Promise<boolean> {
    return UsageStatsModule.hasUsagePermission();
  },
  openUsageSettings(): void {
    UsageStatsModule.openUsageSettings();
  },
  getUsageStats(period: 'today' | 'week'): Promise<AppUsage[]> {
    return UsageStatsModule.getUsageStats(period);
  },
};
