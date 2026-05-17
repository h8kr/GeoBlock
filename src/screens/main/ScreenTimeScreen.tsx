import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Placeholder data — will be replaced by native UsageStatsManager module
const MOCK_USAGE = [
  {appName: 'Instagram', packageName: 'com.instagram.android', minutesToday: 87},
  {appName: 'YouTube', packageName: 'com.google.android.youtube', minutesToday: 54},
  {appName: 'TikTok', packageName: 'com.zhiliaoapp.musically', minutesToday: 43},
  {appName: 'X (Twitter)', packageName: 'com.twitter.android', minutesToday: 31},
  {appName: 'Reddit', packageName: 'com.reddit.frontpage', minutesToday: 22},
  {appName: 'Discord', packageName: 'com.discord', minutesToday: 15},
];

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const TOTAL_MOCK = MOCK_USAGE.reduce((sum, a) => sum + a.minutesToday, 0);

type Period = 'today' | 'week';

export default function ScreenTimeScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('today');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <Text style={styles.heading}>Screen Time</Text>
      <Text style={styles.subheading}>See where your time goes.</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total today</Text>
        <Text style={styles.totalValue}>{formatTime(TOTAL_MOCK)}</Text>
        <Text style={styles.totalSub}>Across all apps</Text>
      </View>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, period === 'today' && styles.segmentActive]}
          onPress={() => setPeriod('today')}>
          <Text style={[styles.segmentText, period === 'today' && styles.segmentTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, period === 'week' && styles.segmentActive]}
          onPress={() => setPeriod('week')}>
          <Text style={[styles.segmentText, period === 'week' && styles.segmentTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        {MOCK_USAGE.map((app, i) => {
          const pct = Math.round((app.minutesToday / TOTAL_MOCK) * 100);
          return (
            <View key={app.packageName}>
              {i > 0 && <View style={styles.separator} />}
              <View style={styles.appRow}>
                <View style={styles.appIcon}>
                  <Text style={styles.appIconText}>{app.appName[0]}</Text>
                </View>
                <View style={styles.appInfo}>
                  <View style={styles.appTopRow}>
                    <Text style={styles.appName}>{app.appName}</Text>
                    <Text style={styles.appTime}>{formatTime(app.minutesToday)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, {width: `${pct}%`}]} />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.permissionNote}>
        <Text style={styles.permissionNoteText}>
          Usage data requires the "Usage Access" permission on Android. Grant it in Settings to see real data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  content: {paddingHorizontal: 20, paddingBottom: 40},
  heading: {fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4},
  subheading: {fontSize: 14, color: '#888', marginBottom: 20},
  totalCard: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {fontSize: 13, color: '#a5b4fc', marginBottom: 4},
  totalValue: {fontSize: 44, fontWeight: '800', color: '#fff'},
  totalSub: {fontSize: 13, color: '#a5b4fc', marginTop: 4},
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segment: {flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10},
  segmentActive: {backgroundColor: '#4f46e5'},
  segmentText: {fontSize: 14, color: '#888', fontWeight: '600'},
  segmentTextActive: {color: '#fff'},
  section: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 16,
  },
  appRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {fontSize: 16, fontWeight: '700', color: '#fff'},
  appInfo: {flex: 1},
  appTopRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
  appName: {fontSize: 14, fontWeight: '600', color: '#fff'},
  appTime: {fontSize: 14, color: '#888'},
  barBg: {height: 4, backgroundColor: '#2a2a2a', borderRadius: 4},
  barFill: {height: 4, backgroundColor: '#4f46e5', borderRadius: 4},
  separator: {height: 1, backgroundColor: '#2a2a2a'},
  permissionNote: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  permissionNoteText: {fontSize: 12, color: '#555', textAlign: 'center', lineHeight: 18},
});
