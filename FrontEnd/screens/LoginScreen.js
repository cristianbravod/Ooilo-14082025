// screens/LoginScreen.js - VERSIÓN ACTUALIZADA CON SAFE AREA
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// ✅ IMPORTAR SAFE AREA
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import MexicanChefLogo from '../components/MexicanChefLogo';

export default function LoginScreen() {
  // ✅ USAR SAFE AREA INSETS
  const insets = useSafeAreaInsets();
  
  const { login, loading, error } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Limpiar formulario al montar
  useEffect(() => {
    setFormData({ email: '', password: '' });
  }, []);

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    try {
      await login(formData.email.trim(), formData.password);
    } catch (err) {
      // El error ya se maneja en el contexto de Auth
      console.log('Error en login:', err.message);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleQuickLogin = (userType) => {
    const credentials = {
      admin: { email: 'admin@restaurant.com', password: 'admin123' },
      mesero: { email: 'mesero@restaurant.com', password: 'mesero123' },
      chef: { email: 'chef@restaurant.com', password: 'chef123' }
    };

    const creds = credentials[userType];
    setFormData(creds);
    
    setTimeout(() => {
      login(creds.email, creds.password);
    }, 100);
  };

  return (
    <View style={[
      styles.container,
      { paddingTop: Math.max(insets.top, 20) }
    ]}>
      {/* ✅ STATUS BAR CONFIGURADO */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent={true}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: Math.max(insets.bottom, 20) }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header con logo */}
          <View style={styles.header}>
            <MexicanChefLogo size={120} />
            <Text style={styles.appTitle}>Mi Restaurante</Text>
            <Text style={styles.appSubtitle}>Sistema de Gestión</Text>
          </View>

          {/* Formulario de login */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email"
                  placeholderTextColor="#95a5a6"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Campo Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor="#95a5a6"
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#7f8c8d" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de login */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!formData.email || !formData.password || loading) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={!formData.email || !formData.password || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                  <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o accede como</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Botones de acceso rápido */}
            <View style={styles.quickLoginContainer}>
              <TouchableOpacity
                style={[styles.quickLoginButton, styles.adminButton]}
                onPress={() => handleQuickLogin('admin')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.quickLoginText}>Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickLoginButton, styles.meseroButton]}
                onPress={() => handleQuickLogin('mesero')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={18} color="#fff" />
                <Text style={styles.quickLoginText}>Mesero</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickLoginButton, styles.chefButton]}
                onPress={() => handleQuickLogin('chef')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="flame" size={18} color="#fff" />
                <Text style={styles.quickLoginText}>Chef</Text>
              </TouchableOpacity>
            </View>

            {/* Información adicional */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                💡 Usa los botones de acceso rápido para probar diferentes roles
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Restaurante App v2.0</Text>
            <Text style={styles.footerSubtext}>
              Sistema de gestión integral
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  
  keyboardContainer: {
    flex: 1,
  },
  
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  
  appSubtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    marginTop: 8,
    textAlign: 'center',
  },

  // Formulario
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 30,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f2',
    borderColor: '#fcd5d5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },

  // Inputs
  inputContainer: {
    marginBottom: 20,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
  
  inputIcon: {
    marginRight: 12,
  },
  
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 15,
  },
  
  passwordToggle: {
    padding: 5,
    marginLeft: 10,
  },

  // Botón principal
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Separador
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  
  separatorText: {
    color: '#7f8c8d',
    fontSize: 14,
    marginHorizontal: 15,
  },

  // Botones de acceso rápido
  quickLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  quickLoginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  
  adminButton: {
    backgroundColor: '#e74c3c',
  },
  
  meseroButton: {
    backgroundColor: '#3498db',
  },
  
  chefButton: {
    backgroundColor: '#f39c12',
  },
  
  quickLoginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Info
  infoContainer: {
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  
  infoText: {
    color: '#2980b9',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 'auto',
  },
  
  footerText: {
    color: '#bdc3c7',
    fontSize: 16,
    fontWeight: '600',
  },
  
  footerSubtext: {
    color: '#95a5a6',
    fontSize: 14,
    marginTop: 4,
  },
});