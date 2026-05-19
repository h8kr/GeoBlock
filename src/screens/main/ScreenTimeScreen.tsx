import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import UsageStatsModule, {AppUsage} from '../../native/UsageStatsModule';
import {useTheme, Colors} from '../../theme';
import {useAppContext} from '../../store/AppContext';
import SettingsModal from '../../components/SettingsModal';
import type {BlockingSession} from '../../types';

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMs(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return '<1m';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type Period = 'today' | 'week';

export default function ScreenTimeScreen() {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {store} = useAppContext();
  const {blockingSessions} = store;
  const [period, setPeriod] = useState<Period>('today');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<AppUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
  const socialApps = ['TikTok', 'Instagram', 'Twitter', 'Facebook', 'Snapchat', 'YouTube'];
  const socialMinutes = usage.filter(a => socialApps.some(s => a.appName.includes(s))).reduce((sum, a) => sum + a.minutes, 0);

  // Time saved calculation
  const savedByApp = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const cutoff = period === 'today' ? startOfDay.getTime() : now - 7 * 24 * 60 * 60 * 1000;
    const map: Record<string, {appName: string; totalMs: number}> = {};
    blockingSessions.forEach((s: BlockingSession) => {
      if (s.endTime < cutoff) return;
      const start = Math.max(s.startTime, cutoff);
      const duration = Math.max(0, s.endTime - start);
      if (!map[s.packageName]) map[s.packageName] = {appName: s.appName, totalMs: 0};
      map[s.packageName].totalMs += duration;
    });
    return Object.values(map).sort((a, b) => b.totalMs - a.totalMs);
  }, [blockingSessions, period]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 12}]}>
      {/* GeoBlock Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="security" size={20} color={colors.accent} />
          <Text style={styles.headerLogo}>GeoBlock</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={{padding: 4}}>
          <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

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
          {/* Total card */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total {period === 'today' ? 'today' : 'this week'}</Text>
            <View style={styles.totalValueRow}>
              {loading
                ? <ActivityIndicator color="#fff" style={{marginVertical: 8}} />
                : <Text style={styles.totalValue}>{formatTime(total)}</Text>}
              <MaterialIcons name="trending-up" size={22} color="rgba(255,255,255,0.6)" style={{marginLeft: 8, marginTop: 4}} />
            </View>
            <View style={styles.totalBar} />
          </View>

          {/* Period toggle */}
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
            <>
              <Text style={styles.sectionTitle}>Top usage</Text>
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

              {/* Usage Insight card */}
              {socialMinutes > 0 && (
                <View style={styles.insightCard}>
                  <View style={styles.insightIcon}>
                    <MaterialIcons name="lightbulb" size={20} color="#f59e0b" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>Usage Insight</Text>
                    <Text style={styles.insightBody}>
                      Your social media usage is up today. Consider setting a lock rule for your current location.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* Time Saved section */}
      <Text style={[styles.sectionTitle, {marginTop: 24}]}>Time Saved</Text>
      {savedByApp.length === 0 ? (
        <View style={styles.savedEmpty}>
          <MaterialIcons name="shield" size={28} color={colors.textMuted} style={{marginBottom: 8}} />
          <Text style={styles.savedEmptyText}>
            No blocking data yet. Enter a geofenced zone to start tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          {savedByApp.map((item, i) => (
            <View key={item.appName}>
              {i > 0 && <View style={styles.separator} />}
              <View style={styles.savedRow}>
                <View style={styles.appIcon}>
                  <Text style={styles.appIconText}>{item.appName[0]}</Text>
                </View>
                <Text style={styles.savedAppName}>{item.appName}</Text>
                <View style={styles.savedBadge}>
                  <MaterialIcons name="lock" size={12} color={colors.accent} style={{marginRight: 4}} />
                  <Text style={styles.savedTime}>{formatMs(item.totalMs)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {hasPermission === null && <ActivityIndicator color={colors.accent} style={{marginTop: 40}} />}

      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </ScrollView>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, paddingBottom: 40},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
    headerLogo: {fontSize: 16, fontWeight: '700', color: c.text},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary, marginBottom: 20},
    permBanner: {backgroundColor: c.warningBg, borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: c.warningBorder},
    permTitle: {color: c.warning, fontSize: 13, fontWeight: '700', marginBottom: 4},
    permBody: {color: c.warningText, fontSize: 12, lineHeight: 18},
    totalCard: {backgroundColor: c.accent, borderRadius: 16, padding: 22, marginBottom: 20},
    totalLabel: {fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6},
    totalValueRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
    totalValue: {fontSize: 44, fontWeight: '800', color: '#fff'},
    totalBar: {height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3},
    segmentRow: {flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4, marginBottom: 24},
    segment: {flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10},
    segmentActive: {backgroundColor: c.surfaceSecondary},
    segmentText: {fontSize: 14, fontWeight: '600', color: c.textSecondary},
    segmentTextActive: {color: c.text},
    sectionTitle: {fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12},
    section: {backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16},
    appRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12},
    appIcon: {width: 40, height: 40, borderRadius: 10, backgroundColor: c.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12},
    appIconText: {fontSize: 16, fontWeight: '700', color: c.text},
    appInfo: {flex: 1},
    appTopRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
    appName: {fontSize: 14, fontWeight: '600', color: c.text},
    appTime: {fontSize: 14, color: c.textSecondary},
    barBg: {height: 3, backgroundColor: c.surfaceSecondary, borderRadius: 3},
    barFill: {height: 3, backgroundColor: c.accent, borderRadius: 3},
    separator: {height: 1, backgroundColor: c.border},
    empty: {alignItems: 'center', paddingTop: 40},
    emptyText: {color: c.textMuted, fontSize: 14},
    insightCard: {flexDirection: 'row', backgroundColor: '#1c1400', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#3d2800', alignItems: 'flex-start', marginBottom: 4},
    insightIcon: {width: 36, height: 36, borderRadius: 10, backgroundColor: '#3d2800', justifyContent: 'center', alignItems: 'center', marginRight: 12},
    insightContent: {flex: 1},
    insightTitle: {fontSize: 13, fontWeight: '700', color: '#f59e0b', marginBottom: 4},
    insightBody: {fontSize: 13, color: '#d97706', lineHeight: 19},
    savedEmpty: {backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginBottom: 16},
    savedEmptyText: {fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20},
    savedRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12},
    savedAppName: {flex: 1, fontSize: 14, fontWeight: '600', color: c.text},
    savedBadge: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5},
    savedTime: {fontSize: 13, fontWeight: '700', color: c.accent},
  });
}
