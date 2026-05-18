import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import UsageStatsModule, {AppUsage} from '../../native/UsageStatsModule';
import {useTheme, Colors} from '../../theme';

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type Period = 'today' | 'week';

export default function ScreenTimeScreen() {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [period, setPeriod] = useState<Period>('today');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<AppUsage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await UsageStatsModule.getUsageStats(period);
      setUsage(data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    UsageStatsModule.hasUsagePermission().then(granted => {
      setHasPermission(granted);
      if (granted) loadStats();
    });
  }, [loadStats]);

  useEffect(() => {
    if (hasPermission) loadStats();
  }, [period, hasPermission, loadStats]);

  const total = usage.reduce((sum, a) => sum + a.minutes, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      <Text style={styles.heading}>Screen Time</Text>
      <Text style={styles.subheading}>See where your time goes.</Text>

      {hasPermission === false && (
        <TouchableOpacity style={styles.permBanner} onPress={async () => {
          UsageStatsModule.openUsageSettings();
          setTimeout(async () => {
            const granted = await UsageStatsModule.hasUsagePermission();
            setHasPermission(granted);
            if (granted) loadStats();
          }, 2000);
        }}>
          <Text style={styles.permTitle}>Usage Access not enabled</Text>
          <Text style={styles.permBody}>Tap here → find GeoBlock → enable "Permit usage access" to see real screen time data.</Text>
        </TouchableOpacity>
      )}

      {hasPermission && (
        <>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total {period === 'today' ? 'today' : 'this week'}</Text>
            {loading
              ? <ActivityIndicator color="#fff" style={{marginVertical: 8}} />
              : <Text style={styles.totalValue}>{formatTime(total)}</Text>}
            <Text style={styles.totalSub}>Across all apps</Text>
          </View>

          <View style={styles.segmentRow}>
            {(['today', 'week'] as Period[]).map(p => (
              <TouchableOpacity key={p} style={[styles.segment, period === p && styles.segmentActive]} onPress={() => setPeriod(p)}>
                <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
                  {p === 'today' ? 'Today' : 'This Week'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {usage.length === 0 && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No usage data for this period.</Text>
            </View>
          ) : (
            <View style={styles.section}>
              {usage.map((app, i) => {
                const pct = total > 0 ? Math.round((app.minutes / total) * 100) : 0;
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
                          <Text style={styles.appTime}>{formatTime(app.minutes)}</Text>
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
          )}
        </>
      )}

      {hasPermission === null && <ActivityIndicator color={colors.accent} style={{marginTop: 40}} />}
    </ScrollView>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, paddingBottom: 40},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 20},
    permBanner: {backgroundColor: c.warningBg, borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: c.warningBorder},
    permTitle: {color: c.warning, fontSize: 13, fontWeight: '700', marginBottom: 4},
    permBody: {color: c.warningText, fontSize: 12, lineHeight: 18},
    totalCard: {backgroundColor: c.accent, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 20},
    totalLabel: {fontSize: 13, color: '#a5b4fc', marginBottom: 4},
    totalValue: {fontSize: 44, fontWeight: '800', color: '#fff'},
    totalSub: {fontSize: 13, color: '#a5b4fc', marginTop: 4},
    segmentRow: {flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4, marginBottom: 20},
    segment: {flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10},
    segmentActive: {backgroundColor: c.accent},
    segmentText: {fontSize: 14, color: c.textSecondary, fontWeight: '600'},
    segmentTextActive: {color: '#fff'},
    section: {backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border},
    appRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
    appIcon: {width: 38, height: 38, borderRadius: 10, backgroundColor: c.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12},
    appIconText: {fontSize: 16, fontWeight: '700', color: c.text},
    appInfo: {flex: 1},
    appTopRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
    appName: {fontSize: 14, fontWeight: '600', color: c.text},
    appTime: {fontSize: 14, color: c.textSecondary},
    barBg: {height: 4, backgroundColor: c.surfaceSecondary, borderRadius: 4},
    barFill: {height: 4, backgroundColor: c.accent, borderRadius: 4},
    separator: {height: 1, backgroundColor: c.border},
    empty: {alignItems: 'center', paddingTop: 40},
    emptyText: {color: c.textMuted, fontSize: 14},
  });
}
