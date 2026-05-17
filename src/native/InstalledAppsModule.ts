import {NativeModules} from 'react-native';

const {InstalledAppsModule} = NativeModules;

export interface InstalledApp {
  id: string;
  packageName: string;
  appName: string;
}

export default {
  getInstalledApps(): Promise<InstalledApp[]> {
    return InstalledAppsModule.getInstalledApps();
  },
};
