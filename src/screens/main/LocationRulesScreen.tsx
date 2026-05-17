import React, {useState} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppContext} from '../../store/AppContext';
import type {LocationRule} from '../../types';

function RuleCard({
  rule,
  onToggle,
  onDelete,
  isLocked,
}: {
  rule: LocationRule;
  onToggle: () => void;
  onDelete: () => void;
  isLocked: boolean;
}) {
  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <Text style={styles.ruleName}>{rule.name}</Text>
        <Switch
          value={rule.isActive}
          onValueChange={onToggle}
          trackColor={{false: '#2a2a2a', true: '#4f46e5'}}
          thumbColor={rule.isActive ? '#fff' : '#888'}
          disabled={isLocked}
        />
      </View>
      <Text style={styles.ruleMeta}>
        {rule.blockedAppIds.length} app{rule.blockedAppIds.length !== 1 ? 's' : ''} blocked •{' '}
        {rule.radiusMeters}m radius
      </Text>
      <Text style={styles.ruleCoords}>
        {rule.latitude.toFixed(4)}, {rule.longitude.toFixed(4)}
      </Text>
      {!isLocked && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LocationRulesScreen() {
  const {store} = useAppContext();
  const insets = useSafeAreaInsets();
  const {locationRules, updateLocationRules, selfLock, lockMode, partner} = store;
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');

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

  function addRule() {
    if (!newName.trim()) return;
    // In production, use device GPS for coordinates
    const rule: LocationRule = {
      id: Date.now().toString(),
      name: newName.trim(),
      latitude: 0,
      longitude: 0,
      radiusMeters: 200,
      blockedAppIds: [],
      isActive: true,
    };
    updateLocationRules([...locationRules, rule]);
    setNewName('');
    setShowModal(false);
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + 16}]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Location Rules</Text>
          <Text style={styles.subheading}>Block apps in specific places.</Text>
        </View>
        {!isLocked && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

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
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRule(rule.id)}
              onDelete={() => deleteRule(rule.id)}
              isLocked={isLocked}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
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
              Location will be set to your current GPS position. You can assign specific apps to
              block after creating the rule.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addRule}>
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
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
  deleteButton: {marginTop: 10, alignSelf: 'flex-start'},
  deleteText: {color: '#f87171', fontSize: 13, fontWeight: '600'},
  empty: {alignItems: 'center', paddingTop: 60, paddingHorizontal: 20},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 10},
  emptySub: {fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16},
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
});
