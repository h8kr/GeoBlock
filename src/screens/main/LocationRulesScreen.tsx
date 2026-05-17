import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  PermissionsAndroid,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppContext} from '../../store/AppContext';
import GeofenceModule from '../../native/GeofenceModule';
import {COMMON_APPS} from '../../store/apps';
import MapPicker from '../../components/MapPicker';
import type {LocationRule} from '../../types';

export default function LocationRulesScreen() {
  const {store} = useAppContext();
  const insets = useSafeAreaInsets();
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
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    ).then(setBgLocationGranted);
  }, []);

  const isLocked =
    (lockMode === 'self' && selfLock.isLocked) ||
    (lockMode === 'partner' && !!partner?.isLockingYou);

  function toggleRule(id: string) {
    if (isLocked) {
      Alert.alert('Locked', 'Your settings are locked.');
      return;
    }
    updateLocationRules(
      locationRules.map(r => (r.id === id ? {...r, isActive: !r.isActive} : r)),
    );
  }

  function deleteRule(id: string) {
    Alert.alert('Remove Rule', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateLocationRules(locationRules.filter(r => r.id !== id)),
      },
    ]);
  }

  function openAppsModal(rule: LocationRule) {
    setEditingRule(rule);
    setShowAppsModal(true);
  }

  function openEditModal(rule: LocationRule) {
    setEditingRule(rule);
    setEditName(rule.name);
    setEditRadius(String(rule.radiusMeters));
    setShowEditModal(true);
  }

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
    const updated = {
      ...editingRule,
      name: editName.trim() || editingRule.name,
      radiusMeters: isNaN(radius) || radius < 50 ? editingRule.radiusMeters : radius,
    };
    updateLocationRules(locationRules.map(r => (r.id === updated.id ? updated : r)));
    setShowEditModal(false);
  }

  function toggleAppForRule(appId: string) {
    if (!editingRule) return;
    const has = editingRule.blockedAppIds.includes(appId);
    const updated = {
      ...editingRule,
      blockedAppIds: has
        ? editingRule.blockedAppIds.filter(id => id !== appId)
        : [...editingRule.blockedAppIds, appId],
    };
    setEditingRule(updated);
    updateLocationRules(locationRules.map(r => (r.id === updated.id ? updated : r)));
  }

  async function addRule() {
    if (!newName.trim()) return;
    setLocating(true);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'GeoBlock needs your location to create a rule for this spot.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission denied', 'Location permission is required to create a location rule.');
        return;
      }
      const coords = await GeofenceModule.getCurrentLocation();
      const rule: LocationRule = {
        id: Date.now().toString(),
        name: newName.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters: 200,
        blockedAppIds: [],
        isActive: true,
      };
      updateLocationRules([...locationRules, rule]);
      setNewName('');
      setShowCreateModal(false);
    } catch (e: any) {
      Alert.alert('Could not get location', e.message ?? 'Try again.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + 16}]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Location Rules</Text>
          <Text style={styles.subheading}>Block apps in specific places.</Text>
        </View>
        {!isLocked && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {bgLocationGranted === false && (
        <TouchableOpacity
          style={styles.bgWarning}
          onPress={async () => {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            );
            const granted = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            );
            setBgLocationGranted(granted);
          }}>
          <Text style={styles.bgWarningTitle}>Background location not enabled</Text>
          <Text style={styles.bgWarningBody}>
            Geofences won't trigger unless you set location to "Allow all the time". Tap here, then choose that option.
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {locationRules.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No location rules yet</Text>
            <Text style={styles.emptySub}>
              Add a rule to block certain apps when you arrive at a location — like blocking
              social media at work or school.
            </Text>
          </View>
        ) : (
          locationRules.map(rule => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Switch
                  value={rule.isActive}
                  onValueChange={() => toggleRule(rule.id)}
                  trackColor={{false: '#2a2a2a', true: '#4f46e5'}}
                  thumbColor={rule.isActive ? '#fff' : '#888'}
                  disabled={isLocked}
                />
              </View>
              <Text style={styles.ruleMeta}>
                {rule.blockedAppIds.length} app{rule.blockedAppIds.length !== 1 ? 's' : ''} blocked · {rule.radiusMeters}m radius
              </Text>
              <Text style={styles.ruleCoords}>
                {rule.latitude.toFixed(4)}, {rule.longitude.toFixed(4)}
              </Text>
              <View style={styles.ruleActions}>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => openAppsModal(rule)}>
                  <Text style={styles.assignButtonText}>Apps</Text>
                </TouchableOpacity>
                {!isLocked && (
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => openEditModal(rule)}>
                    <Text style={styles.assignButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {!isLocked && (
                  <TouchableOpacity onPress={() => deleteRule(rule.id)}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create rule modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Location Rule</Text>
            <TextInput
              style={styles.input}
              placeholder="Rule name (e.g. Work, School)"
              placeholderTextColor="#555"
              value={newName}
              onChangeText={setNewName}
            />
            <Text style={styles.modalNote}>
              Your current GPS coordinates will be saved as the centre of this rule. Make sure you're at the location now.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addRule} disabled={locating}>
                {locating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalConfirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit rule modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Rule</Text>

            <TextInput
              style={styles.input}
              placeholder="Rule name"
              placeholderTextColor="#555"
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={styles.input}
              placeholder="Radius in metres (e.g. 200)"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={editRadius}
              onChangeText={setEditRadius}
            />

            {editingRule && (
              <Text style={styles.coordsDisplay}>
                📍 {editingRule.latitude.toFixed(5)}, {editingRule.longitude.toFixed(5)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowMapPicker(true)}>
              <Text style={styles.locationButtonText}>🗺️ Set on Map</Text>
            </TouchableOpacity>

            <View style={[styles.modalButtons, {marginTop: 12}]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={saveEditModal}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MapPicker
        visible={showMapPicker}
        initialLat={editingRule?.latitude}
        initialLng={editingRule?.longitude}
        onConfirm={onMapConfirm}
        onCancel={() => setShowMapPicker(false)}
      />

      {/* Assign apps modal */}
      <Modal visible={showAppsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.appsModalCard]}>
            <Text style={styles.modalTitle}>
              Apps blocked at "{editingRule?.name}"
            </Text>
            <Text style={styles.modalNote}>
              These apps will be blocked whenever you enter this location.
            </Text>
            <FlatList
              data={COMMON_APPS}
              keyExtractor={item => item.id}
              style={styles.appsList}
              renderItem={({item}) => {
                const assigned = editingRule?.blockedAppIds.includes(item.id) ?? false;
                return (
                  <TouchableOpacity
                    style={styles.appRow}
                    onPress={() => toggleAppForRule(item.id)}>
                    <View style={styles.appIcon}>
                      <Text style={styles.appIconText}>{item.appName[0]}</Text>
                    </View>
                    <Text style={styles.appName}>{item.appName}</Text>
                    <Switch
                      value={assigned}
                      onValueChange={() => toggleAppForRule(item.id)}
                      trackColor={{false: '#2a2a2a', true: '#4f46e5'}}
                      thumbColor={assigned ? '#fff' : '#888'}
                    />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <TouchableOpacity
              style={styles.modalConfirm}
              onPress={() => setShowAppsModal(false)}>
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f', paddingHorizontal: 20},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heading: {fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4},
  subheading: {fontSize: 14, color: '#888'},
  addButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  addButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
  list: {paddingBottom: 40},
  ruleCard: {
    backgroundColor: '#1c1c1c',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  ruleHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  ruleName: {fontSize: 16, fontWeight: '700', color: '#fff'},
  ruleMeta: {fontSize: 13, color: '#888', marginTop: 6},
  ruleCoords: {fontSize: 11, color: '#444', marginTop: 2},
  ruleActions: {flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16},
  assignButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  assignButtonText: {color: '#4f46e5', fontSize: 13, fontWeight: '600'},
  deleteText: {color: '#f87171', fontSize: 13, fontWeight: '600'},
  empty: {alignItems: 'center', paddingTop: 60, paddingHorizontal: 20},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 10},
  emptySub: {fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  modalCard: {
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  appsModalCard: {maxHeight: '80%'},
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12},
  input: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
  },
  modalNote: {fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 20},
  modalButtons: {flexDirection: 'row', gap: 10},
  modalCancel: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {color: '#888', fontWeight: '600'},
  modalConfirm: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalConfirmText: {color: '#fff', fontWeight: '700'},
  appsList: {marginBottom: 16},
  appRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {fontSize: 16, fontWeight: '700', color: '#fff'},
  appName: {flex: 1, fontSize: 14, fontWeight: '600', color: '#fff'},
  separator: {height: 1, backgroundColor: '#2a2a2a'},
  bgWarning: {
    backgroundColor: '#1c1400',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#854d0e',
  },
  bgWarningTitle: {color: '#fbbf24', fontSize: 13, fontWeight: '700', marginBottom: 3},
  bgWarningBody: {color: '#92400e', fontSize: 12, lineHeight: 17},
  coordsDisplay: {fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 12},
  locationButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a5298',
  },
  locationButtonText: {color: '#60a5fa', fontWeight: '600', fontSize: 14},
});
