import React, {useState, useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {getAuth} from '@react-native-firebase/auth';
import {useAppContext} from '../store/AppContext';
import {useTheme, Colors} from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({visible, onClose}: Props) {
  const {store, onSignOut} = useAppContext();
  const {colors, theme, toggleTheme} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {lockMode, selfLock, partner} = store;
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const isLocked =
    lockMode !== 'none' &&
    (selfLock.isLocked || (!!partner && partner.isLockingYou && partner.blockedPackages.length > 0));

  async function handleSignOut() {
    if (isLocked) {
      Alert.alert(
        'Sign Out Blocked',
        'You cannot sign out while your settings are locked. Disable your lock first.',
      );
      return;
    }
    onClose();
    onSignOut();
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await getAuth().currentUser?.updatePassword(newPassword);
      Alert.alert('Done', 'Password updated successfully.');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Re-login and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Settings</Text>

          {/* Theme toggle */}
          <TouchableOpacity style={styles.row} onPress={toggleTheme}>
            <View style={styles.rowLeft}>
              <MaterialIcons
                name={theme === 'dark' ? 'dark-mode' : 'light-mode'}
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.rowLabel}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <MaterialIcons name="swap-horiz" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Change password */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowPasswordForm(p => !p)}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>Change Password</Text>
            </View>
            <MaterialIcons
              name={showPasswordForm ? 'expand-less' : 'expand-more'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={styles.passwordForm}>
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleChangePassword}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Sign out */}
          <TouchableOpacity style={[styles.row, styles.signOutRow]} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="logout" size={20} color={colors.danger} />
              <Text style={[styles.rowLabel, {color: isLocked ? colors.textMuted : colors.danger}]}>
                Sign Out{isLocked ? ' (locked)' : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.modalOverlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 36,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: c.text,
    },
    signOutRow: {
      borderBottomWidth: 0,
      marginTop: 4,
    },
    passwordForm: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: 15,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    closeBtn: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 10,
    },
    closeBtnText: {
      fontSize: 14,
      color: c.textMuted,
      fontWeight: '600',
    },
  });
}
