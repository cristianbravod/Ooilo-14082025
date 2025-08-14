// screens/UserSettings.js - Configuración de usuario
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export default function UserSettings({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSave: true,
    soundEffects: true,
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nombre: user?.nombre || '',
    telefono: user?.telefono || '',
    direccion: user?.direccion || '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const saveProfile = async () => {
    try {
      const updatedUser = { ...user, ...profileData };
      await updateUser(updatedUser);
      setEditingProfile(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  const clearAppData = () => {
    Alert.alert(
      'Limpiar Datos',
      '¿Estás seguro que deseas eliminar todos los datos locales de la aplicación?\n\nEsto incluye:\n• Pedidos guardados\n• Configuraciones\n• Datos offline\n\nEsta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Datos Limpiados', 'Se han eliminado todos los datos locales');
              logout();
            } catch (error) {
              Alert.alert('Error', 'No se pudieron limpiar los datos');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#4a6ee0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Información del perfil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil de Usuario</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Ionicons name="person-circle" size={60} color="#4a6ee0" />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.nombre}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.rol || 'Usuario'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setEditingProfile(!editingProfile)}
              style={styles.editButton}
            >
              <Ionicons 
                name={editingProfile ? "close" : "pencil"} 
                size={20} 
                color="#4a6ee0" 
              />
            </TouchableOpacity>
          </View>

          {editingProfile && (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.nombre}
                  onChangeText={(text) => setProfileData({...profileData, nombre: text})}
                  placeholder="Nombre completo"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.telefono}
                  onChangeText={(text) => setProfileData({...profileData, telefono: text})}
                  placeholder="Número de teléfono"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.direccion}
                  onChangeText={(text) => setProfileData({...profileData, direccion: text})}
                  placeholder="Dirección"
                  multiline
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Configuraciones de la app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración de la App</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={24} color="#7f8c8d" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notificaciones</Text>
              <Text style={styles.settingDescription}>
                Recibir alertas de pedidos y actualizaciones
              </Text>
            </View>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => updateSetting('notifications', value)}
            trackColor={{ false: '#767577', true: '#4a6ee0' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color="#7f8c8d" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Modo Oscuro</Text>
              <Text style={styles.settingDescription}>
                Cambiar a tema oscuro (próximamente)
              </Text>
            </View>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => updateSetting('darkMode', value)}
            trackColor={{ false: '#767577', true: '#4a6ee0' }}
            disabled={true}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="save-outline" size={24} color="#7f8c8d" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Guardado Automático</Text>
              <Text style={styles.settingDescription}>
                Guardar cambios automáticamente
              </Text>
            </View>
          </View>
          <Switch
            value={settings.autoSave}
            onValueChange={(value) => updateSetting('autoSave', value)}
            trackColor={{ false: '#767577', true: '#4a6ee0' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="volume-medium-outline" size={24} color="#7f8c8d" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Efectos de Sonido</Text>
              <Text style={styles.settingDescription}>
                Sonidos para acciones de la app
              </Text>
            </View>
          </View>
          <Switch
            value={settings.soundEffects}
            onValueChange={(value) => updateSetting('soundEffects', value)}
            trackColor={{ false: '#767577', true: '#4a6ee0' }}
          />
        </View>
      </View>

      {/* Acciones de datos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestión de Datos</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="download-outline" size={24} color="#27ae60" />
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Exportar Datos</Text>
            <Text style={styles.actionDescription}>
              Descargar una copia de tus datos
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="sync-outline" size={24} color="#3498db" />
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Sincronizar</Text>
            <Text style={styles.actionDescription}>
              Actualizar datos con el servidor
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]}
          onPress={clearAppData}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, styles.dangerText]}>
              Limpiar Datos Locales
            </Text>
            <Text style={styles.actionDescription}>
              Eliminar todos los datos guardados
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* Información de la app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Versión de la App</Text>
          <Text style={styles.infoValue}>2.0.0</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Última Sincronización</Text>
          <Text style={styles.infoValue}>Hace 2 horas</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Modo de Conexión</Text>
          <Text style={styles.infoValue}>Online</Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 24,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: '#4a6ee0',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  editForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#4a6ee0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  dangerText: {
    color: '#e74c3c',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  bottomPadding: {
    height: 40,
  },
});