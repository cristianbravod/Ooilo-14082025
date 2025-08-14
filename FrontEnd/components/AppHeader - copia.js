import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const { user, userRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <View style={[
      styles.headerContainer,
      { 
        paddingTop: 15,
        paddingLeft: Math.max(insets.left, 16),
        paddingRight: Math.max(insets.right, 16)
      }
    ]}>

      <View style={styles.headerContent}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>¡Hola!</Text>
          <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
          <Text style={styles.userRole}>
            {userRole === 'admin' ? '👑 Administrador' : 
             userRole === 'mesero' ? '🍽️ Mesero' : 
             userRole === 'chef' ? '👨‍🍳 Chef' : '👤 Usuario'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowUserMenu(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <UserMenu visible={showUserMenu} onClose={() => setShowUserMenu(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingBottom: 10,
	zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flex: 1 },
  welcomeText: { fontSize: 14, color: '#7f8c8d', fontWeight: '500' },
  userName: { fontSize: 18, color: '#2c3e50', fontWeight: 'bold' },
  userRole: { fontSize: 14, color: '#95a5a6', fontWeight: '500' },
  menuButton: { padding: 8 },
});
