import {NativeModules} from 'react-native';

const {BlockingModule} = NativeModules;

export default {
  setBlockedApps(packages: string[]) {
    BlockingModule.setBlockedApps(packages);
  },
  isAccessibilityServiceEnabled(): Promise<boolean> {
    return BlockingModule.isAccessibilityServiceEnabled();
  },
  openAccessibilitySettings() {
    BlockingModule.openAccessibilitySettings();
  },
};
