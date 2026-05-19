import {NativeModules} from 'react-native';

const {GeofenceModule} = NativeModules;

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface GeofenceRule {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  blockedPackages: string[];
  schedule?: {days: number[]; startTime: string; endTime: string};
}

export default {
  getCurrentLocation(): Promise<Coords> {
    return GeofenceModule.getCurrentLocation();
  },
  updateGeofences(rules: GeofenceRule[]): Promise<void> {
    return GeofenceModule.updateGeofences(JSON.stringify(rules));
  },
};
