import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Modal, PermissionsAndroid, ActivityIndicator, FlatList} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {useAppContext} from '../../store/AppContext';
import {useTheme, Colors} from '../../theme';
import GeofenceModule from '../../native/GeofenceModule';
import {COMMON_APPS} from '../../store/apps';
import MapPicker from '../../components/MapPicker';
import type {LocationRule} from '../../types';

export default function LocationRulesScreen() {
  const {store} = useAppContext();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {locationRules, updateLocationRules, selfLock, lockMode, partner} = store;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRule, setEditingRule] = useState<LocationRule | null>(null);
  const [editName, setEditName] = useState('');
  const [editRadius, setEditRadius] = useState('');
  const [newName, setNewName] = useState('');
  const [locating, setLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [bgLocationGranted, setBgLocationGranted] = useState<boolean | null>(null);

  useEffect(() => {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION).then(setBgLocationGranted);
  }, []);

  const isLocked = (lockMode === 'self' && selfLock.isLocked) || (lockMode === 'partner' && !!partner?.isLockingYou);
  const activeRules = locationRules.filter(r => r.isActive);

  function toggleRule(id: string) {
    if (isLocked) { Alert.alert('Locked', 'Your settings are locked.'); return; }
    updateLocationRules(locationRules.map(r => (r.id === id ? {...r, isActive: !r.isActive} : r)));
  }

  function deleteRule(id: string) {
    Alert.alert('Remove Rule', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: () => updateLocationRules(locationRules.filter(r => r.id !== id))},
    ]);
  }

  function openAppsModal(rule: LocationRule) { setEditingRule(rule); setShowAppsModal(true); }
  function openEditModal(rule: LocationRule) { setEditingRule(rule); setEditName(rule.name); setEditRadius(String(rule.radiusMeters)); setShowEditModal(true); }

  function onMapConfirm(lat: number, lng: number) {
    if (!editingRule) return;
    const updated = {...editingRule, latitude: lat, longitude: lng};
    setEditingRule(updated);
    updateLocationRules(locationRules.map(r => (r.id === updated.id ? updated : r)));
    setShowMapPicker(false);
  }

  function saveEditModal() {
    if (!editingRule) return;
    const radius = parseInt(editRadius, 10);
    const updated = {...editingRule, name: editName.trim() || editingRule.name, radiusMeters: isNaN(radius) || radius < 50 ? editingRule.radiusMeters : radius};
    updateLocationRules(locationRules.map(r => (r.id === updated.id ? updated : r)));
    setShowEditModal(false);
  }

  function toggleAppForRule(appId: string) {
    if (!editingRule) return;
    const has = editingRule.blockedAppIds.includes(appId);
    const updated = {...editingRule, blockedAppIds: has ? editingRule.blockedAppIds.filter(id => id !== appId) : [...editingRule.blockedAppIds, appId]};
    setEditingRule(updated);
    updateLocationRules(locationRules.map(r => (r.id === updated.id ? updated : r)));
  }

  async function addRule() {
    if (!newName.trim()) return;
    setLocating(true);
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {title: 'Location Permission', message: 'GeoBlock needs your location to create a rule for this spot.', buttonPositive: 'Allow', buttonNegative: 'Cancel'});
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('Permission denied', 'Location permission is required to create a location rule.'); return; }
      const coords = await GeofenceModule.getCurrentLocation();
      const rule: LocationRule = {id: Date.now().toString(), name: newName.trim(), latitude: coords.latitude, longitude: coords.longitude, radiusMeters: 200, blockedAppIds: [], isActive: true};
      updateLocationRules([...locationRules, rule]);
      setNewName(''); setShowCreateModal(false);
    } catch (e: any) {
      Alert.alert('Could not get location', e.message ?? 'Try again.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      {/* GeoBlock Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="security" size={20} color={colors.accent} />
          <Text style={styles.headerLogo}>GeoBlock</Text>
        </View>
        <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
      </View>

      {/* Page heading + Add button */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.heading}>Location Rules</Text>
          <Text style={styles.subheading}>Block apps in specific places.</Text>
        </View>
        {!isLocked && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <MaterialIcons name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {bgLocationGranted === false && (
        <TouchableOpacity style={styles.bgWarning} onPress={async () => {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
          const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
          setBgLocationGranted(granted);
        }}>
          <Text style={styles.bgWarningTitle}>Background location not enabled</Text>
          <Text style={styles.bgWarningBody}>Geofences won't trigger unless you set location to "Allow all the time". Tap here to fix.</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {locationRules.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No location rules yet</Text>
            <Text style={styles.emptySub}>Add a rule to block certain apps when you arrive at a location.</Text>
          </View>
        ) : (
          locationRules.map(rule => (
            <View key={rule.id} style={[styles.ruleCard, rule.isActive && styles.ruleCardActive]}>
              {/* Name + toggle */}
              <View style={styles.ruleHeader}>
                <View style={styles.ruleNameRow}>
                  <MaterialIcons name="work" size={18} color={rule.isActive ? colors.accent : colors.textMuted} style={{marginRight: 8}} />
                  <Text style={styles.ruleName}>{rule.name}</Text>
                </View>
                <Switch
                  value={rule.isActive}
                  onValueChange={() => toggleRule(rule.id)}
                  trackColor={{false: colors.surfaceSecondary, true: colors.accent}}
                  thumbColor="#fff"
                  disabled={isLocked}
                />
              </View>

              {/* Radius */}
              <View style={styles.radiusRow}>
                <MaterialIcons name="navigation" size={13} color={colors.textMuted} style={{marginRight: 4}} />
                <Text style={styles.radiusText}>{rule.radiusMeters}m radius</Text>
              </View>

              {/* Chips */}
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <MaterialIcons name="apps" size={12} color={colors.textSecondary} style={{marginRight: 4}} />
                  <Text style={styles.chipText}>{rule.blockedAppIds.length} app{rule.blockedAppIds.length !== 1 ? 's' : ''} blocked</Text>
                </View>
                <View style={styles.chip}>
                  <MaterialIcons name="access-time" size={12} color={colors.textSecondary} style={{marginRight: 4}} />
                  <Text style={styles.chipText}>Always</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.ruleActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openAppsModal(rule)}>
                  <MaterialIcons name="apps" size={14} color={colors.textSecondary} style={{marginRight: 4}} />
                  <Text style={styles.actionBtnText}>Apps</Text>
                </TouchableOpacity>
                {!isLocked && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(rule)}>
                    <MaterialIcons name="edit" size={14} color={colors.textSecondary} style={{marginRight: 4}} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {!isLocked && (
                  <TouchableOpacity style={styles.trashBtn} onPress={() => deleteRule(rule.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Live enforcement map card */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardInner}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE ENFORCEMENT</Text>
            </View>
            <View style={styles.mapPinContainer}>
              <MaterialIcons name="location-on" size={32} color={colors.accent} />
            </View>
            <Text style={styles.mapCardTitle}>Current Zone: {activeRules[0]?.name ?? 'None'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Location Rule</Text>
            <TextInput style={styles.input} placeholder="Rule name (e.g. Work, School)" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
            <Text style={styles.modalNote}>Your current GPS coordinates will be saved as the centre of this rule.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addRule} disabled={locating}>
                {locating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Rule</Text>
            <TextInput style={styles.input} placeholder="Rule name" placeholderTextColor={colors.textMuted} value={editName} onChangeText={setEditName} />
            <TextInput style={styles.input} placeholder="Radius in metres (e.g. 200)" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={editRadius} onChangeText={setEditRadius} />
            {editingRule && <Text style={styles.coordsDisplay}>📍 {editingRule.latitude.toFixed(5)}, {editingRule.longitude.toFixed(5)}</Text>}
            <TouchableOpacity style={styles.locationButton} onPress={() => setShowMapPicker(true)}>
              <Text style={styles.locationButtonText}>🗺️ Set on Map</Text>
            </TouchableOpacity>
            <View style={[styles.modalButtons, {marginTop: 12}]}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={saveEditModal}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MapPicker visible={showMapPicker} initialLat={editingRule?.latitude} initialLng={editingRule?.longitude} onConfirm={onMapConfirm} onCancel={() => setShowMapPicker(false)} />

      {/* Apps Modal */}
      <Modal visible={showAppsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.appsModalCard]}>
            <Text style={styles.modalTitle}>Apps blocked at "{editingRule?.name}"</Text>
            <Text style={styles.modalNote}>These apps will be blocked whenever you enter this location.</Text>
            <FlatList
              data={COMMON_APPS}
              keyExtractor={item => item.id}
              style={styles.appsList}
              renderItem={({item}) => {
                const assigned = editingRule?.blockedAppIds.includes(item.id) ?? false;
                return (
                  <TouchableOpacity style={styles.appRow} onPress={() => toggleAppForRule(item.id)}>
                    <View style={styles.appIcon}><Text style={styles.appIconText}>{item.appName[0]}</Text></View>
                    <Text style={styles.appName}>{item.appName}</Text>
                    <Switch value={assigned} onValueChange={() => toggleAppForRule(item.id)} trackColor={{false: colors.surfaceSecondary, true: colors.accent}} thumbColor={assigned ? '#fff' : colors.textSecondary} />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <TouchableOpacity style={styles.modalConfirm} onPress={() => setShowAppsModal(false)}>
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background, paddingHorizontal: 20},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
    headerLogo: {fontSize: 16, fontWeight: '700', color: c.text},
    titleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20},
    heading: {fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4},
    subheading: {fontSize: 14, color: c.textSecondary},
    addButton: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 4, marginTop: 4},
    addButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
    list: {paddingBottom: 40},
    ruleCard: {backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border},
    ruleCardActive: {backgroundColor: '#1e1b4b', borderColor: c.accent},
    ruleHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
    ruleNameRow: {flexDirection: 'row', alignItems: 'center'},
    ruleName: {fontSize: 16, fontWeight: '700', color: c.text},
    radiusRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
    radiusText: {fontSize: 13, color: c.textSecondary},
    chipRow: {flexDirection: 'row', gap: 8, marginBottom: 14},
    chip: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceSecondary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5},
    chipText: {fontSize: 12, color: c.textSecondary},
    ruleActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
    actionBtn: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: c.border},
    actionBtnText: {color: c.textSecondary, fontSize: 13, fontWeight: '600'},
    trashBtn: {marginLeft: 'auto' as any, padding: 6},
    empty: {alignItems: 'center', paddingTop: 60, paddingHorizontal: 20},
    emptyTitle: {fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 10},
    emptySub: {fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22},
    mapCard: {height: 160, backgroundColor: '#0d1117', borderRadius: 16, overflow: 'hidden', marginTop: 4, borderWidth: 1, borderColor: '#1e293b'},
    mapCardInner: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    liveBadge: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79,70,229,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16},
    liveDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginRight: 6},
    liveBadgeText: {fontSize: 11, fontWeight: '700', color: c.accent, letterSpacing: 1},
    mapPinContainer: {marginBottom: 8},
    mapCardTitle: {fontSize: 14, fontWeight: '700', color: '#fff'},
    modalOverlay: {flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'flex-end'},
    modalCard: {backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24},
    appsModalCard: {maxHeight: '80%'},
    modalTitle: {fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 12},
    input: {backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, marginBottom: 12},
    modalNote: {fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 20},
    modalButtons: {flexDirection: 'row', gap: 10},
    modalCancel: {flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
    modalCancelText: {color: c.textSecondary, fontWeight: '600'},
    modalConfirm: {flex: 1, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
    modalConfirmText: {color: '#fff', fontWeight: '700'},
    appsList: {marginBottom: 16},
    appRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
    appIcon: {width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12},
    appIconText: {fontSize: 16, fontWeight: '700', color: c.text},
    appName: {flex: 1, fontSize: 14, fontWeight: '600', color: c.text},
    separator: {height: 1, backgroundColor: c.border},
    bgWarning: {backgroundColor: c.warningBg, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.warningBorder},
    bgWarningTitle: {color: c.warning, fontSize: 13, fontWeight: '700', marginBottom: 3},
    bgWarningBody: {color: c.warningText, fontSize: 12, lineHeight: 17},
    coordsDisplay: {fontSize: 12, color: c.textMuted, textAlign: 'center', marginBottom: 12},
    locationButton: {backgroundColor: c.locationButton, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: c.locationButtonBorder},
    locationButtonText: {color: c.locationButtonText, fontWeight: '600', fontSize: 14},
  });
}
