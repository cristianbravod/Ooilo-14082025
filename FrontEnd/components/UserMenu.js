// components/UserMenu.js - Menú de usuario con logout
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu({ visible, onClose }) {
  const { user, logout, switchUser, isOffline, userRole } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      `¿Estás seguro que deseas cerrar la sesión de ${user?.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              const success = await logout();
              if (success) {
                onClose();
                Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente');
              } else {
                Alert.alert('Error', 'No se pudo cerrar la sesión');
              }
            } catch (error) {
              Alert.alert('Error', 'Problema al cerrar sesión');
            }
            setLoggingOut(false);
          }
        }
      ]
    );
  };

  const handleSwitchUser = () => {
    Alert.alert(
      'Cambiar Usuario',
      '¿Deseas cambiar a otro usuario?\n\nEsto cerrará la sesión actual.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Cambiar Usuario',
          onPress: async () => {
            setLoggingOut(true);
            try {
              const success = await switchUser();
              if (success) {
                onClose();
                Alert.alert('Usuario Cambiado', 'Puedes iniciar sesión con otro usuario');
              } else {
                Alert.alert('Error', 'No se pudo cambiar de usuario');
              }
            } catch (error) {
              Alert.alert('Error', 'Problema al cambiar usuario');
            }
            setLoggingOut(false);
          }
        }
      ]
    );
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return 'shield-checkmark';
      case 'mesero':
        return 'restaurant';
      case 'chef':
        return 'flame';
      default:
        return 'person';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#e74c3c';
      case 'mesero':
        return '#3498db';
      case 'chef':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'mesero':
        return 'Mesero';
      case 'chef':
        return 'Chef';
      default:
        return 'Usuario';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* ✅ SAFE AREA PROVIDER PARA MODAL */}
      <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
        <TouchableOpacity 
          style={styles.touchableOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={[
              styles.menuContainer,
              {
                marginTop: Math.max(insets.top, 50),
                marginBottom: Math.max(insets.bottom, 50)
              }
            ]}>
            {/* Header del usuario */}
            <View style={styles.userHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons 
                  name="person-circle" 
                  size={50} 
                  color="#4a6ee0" 
                />
                {isOffline && (
                  <View style={styles.offlineBadge}>
                    <Ionicons name="cloud-offline" size={12} color="#fff" />
                  </View>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'Sin email'}</Text>
                
                <View style={styles.roleContainer}>
                  <Ionicons 
                    name={getRoleIcon(userRole)} 
                    size={16} 
                    color={getRoleColor(userRole)} 
                  />
                  <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>
                    {getRoleText(userRole)}
                  </Text>
                </View>
                
                {isOffline && (
                  <View style={styles.offlineIndicator}>
                    <Ionicons name="wifi-off" size={12} color="#e67e22" />
                    <Text style={styles.offlineText}>Modo Offline</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Divisor */}
            <View style={styles.divider} />

            {/* Opciones del menú */}
            <View style={styles.menuOptions}>
              
              {/* Información de la cuenta */}
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="information-circle-outline" size={20} color="#7f8c8d" />
                <Text style={styles.menuOptionText}>Información de cuenta</Text>
              </TouchableOpacity>

              {/* Configuraciones */}
              <TouchableOpacity style={styles.menuOption}>
                <Ionicons name="settings-outline" size={20} color="#7f8c8d" />
                <Text style={styles.menuOptionText}>Configuración</Text>
              </TouchableOpacity>

              {/* Cambiar usuario */}
              <TouchableOpacity 
                style={styles.menuOption}
                onPress={handleSwitchUser}
                disabled={loggingOut}
              >
                <Ionicons name="people-outline" size={20} color="#3498db" />
                <Text style={[styles.menuOptionText, { color: '#3498db' }]}>
                  Cambiar Usuario
                </Text>
              </TouchableOpacity>

              {/* Divisor */}
              <View style={styles.optionDivider} />

              {/* Cerrar sesión */}
              <TouchableOpacity 
                style={[styles.menuOption, styles.logoutOption]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <>
                    <ActivityIndicator size="small" color="#e74c3c" />
                    <Text style={[styles.menuOptionText, styles.logoutText]}>
                      Cerrando sesión...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                    <Text style={[styles.menuOptionText, styles.logoutText]}>
                      Cerrar Sesión
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Restaurant App v2.0
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  touchableOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxWidth: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  offlineBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e67e22',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: '#e67e22',
    marginLeft: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
  },
  menuOptions: {
    padding: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutOption: {
    backgroundColor: '#fdf2f2',
  },
  logoutText: {
    color: '#e74c3c',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 8,
    marginHorizontal: 15,
  },
  footer: {
    padding: 15,
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
});