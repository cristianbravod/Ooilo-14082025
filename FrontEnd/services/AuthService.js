// services/AuthService.js - ACTUALIZADO para usar ApiService
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

class AuthService {
  constructor() {
    console.log('?? AuthService inicializado - usando ApiService centralizado');
  }

  // ?? LOGIN
  async login(email, password) {
    try {
      console.log('?? Intentando login para:', email);
      
      // Usar ApiService para el login
      const response = await ApiService.login(email, password);
      
      console.log('? Login exitoso a trav谷s de ApiService');
      return response;
      
    } catch (error) {
      console.error('? Error en AuthService login:', error.message);
      
      // Mejorar el mensaje de error para el usuario
      let userMessage = 'Error de conexi車n';
      
      if (error.message.includes('Invalid credentials')) {
        userMessage = 'Email o contrase?a incorrectos';
      } else if (error.message.includes('HTTP 400')) {
        userMessage = 'Credenciales inv芍lidas';
      } else if (error.message.includes('HTTP 404')) {
        userMessage = 'Usuario no encontrado';
      } else if (error.message.includes('HTTP 500')) {
        userMessage = 'Error del servidor. Intenta m芍s tarde';
      } else if (error.message.includes('Servidor no disponible')) {
        userMessage = 'No hay conexi車n al servidor. Verifica tu internet';
      }
      
      throw new Error(userMessage);
    }
  }

  // ?? REGISTRO
  async register(userData) {
    try {
      console.log('?? Intentando registro para:', userData.email);
      
      // Validar datos antes de enviar
      if (!userData.email || !userData.password || !userData.nombre) {
        throw new Error('Faltan datos obligatorios');
      }
      
      if (userData.password.length < 6) {
        throw new Error('La contrase?a debe tener al menos 6 caracteres');
      }
      
      // Usar ApiService para el registro
      const response = await ApiService.register(userData);
      
      console.log('? Registro exitoso a trav谷s de ApiService');
      return response;
      
    } catch (error) {
      console.error('? Error en AuthService register:', error.message);
      
      // Mejorar el mensaje de error para el usuario
      let userMessage = 'Error de registro';
      
      if (error.message.includes('User already exists')) {
        userMessage = 'Ya existe un usuario con este email';
      } else if (error.message.includes('HTTP 400')) {
        userMessage = 'Datos de registro inv芍lidos';
      } else if (error.message.includes('HTTP 500')) {
        userMessage = 'Error del servidor. Intenta m芍s tarde';
      } else if (error.message.includes('Servidor no disponible')) {
        userMessage = 'No hay conexi車n al servidor. Verifica tu internet';
      } else if (error.message.includes('Faltan datos') || error.message.includes('contrase?a')) {
        userMessage = error.message; // Mantener mensajes de validaci車n
      }
      
      throw new Error(userMessage);
    }
  }

  // ?? VERIFICAR TOKEN
  async verifyToken() {
    try {
      console.log('?? Verificando token...');
      
      // Verificar si existe token localmente
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      // Usar ApiService para verificar token
      const response = await ApiService.verifyToken();
      
      console.log('? Token verificado exitosamente');
      return response;
      
    } catch (error) {
      console.error('? Error verificando token:', error.message);
      
      // Si el token es inv芍lido, limpiar storage
      if (error.message.includes('Invalid token') || error.message.includes('HTTP 401')) {
        await this.logout();
      }
      
      throw error;
    }
  }

  // ?? LOGOUT
  async logout() {
    try {
      console.log('?? Cerrando sesi車n...');
      
      // Usar ApiService para logout (limpia AsyncStorage)
      await ApiService.logout();
      
      console.log('? Sesi車n cerrada exitosamente');
      return true;
      
    } catch (error) {
      console.error('? Error en logout:', error.message);
      
      // Aunque falle, intentar limpiar storage local
      try {
        await AsyncStorage.multiRemove(['authToken', 'user']);
        console.log('? Storage local limpiado como fallback');
      } catch (storageError) {
        console.error('? Error limpiando storage:', storageError);
      }
      
      return false;
    }
  }

  // ?? OBTENER USUARIO ACTUAL
  async getCurrentUser() {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        console.log('?? Usuario actual:', user.nombre);
        return user;
      }
      return null;
    } catch (error) {
      console.error('? Error obteniendo usuario actual:', error);
      return null;
    }
  }

  // ?? OBTENER TOKEN
  async getToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('? Error obteniendo token:', error);
      return null;
    }
  }

  // ?? VERIFICAR SI EST芍 LOGUEADO
  async isLoggedIn() {
    try {
      const token = await this.getToken();
      return !!token; // Convierte a boolean
    } catch (error) {
      console.error('? Error verificando login status:', error);
      return false;
    }
  }

  // ?? CAMBIAR USUARIO (switch user)
  async switchUser() {
    try {
      console.log('?? Cambiando usuario...');
      
      // Logout del usuario actual
      await this.logout();
      
      console.log('? Usuario cambiado - listo para nuevo login');
      return true;
      
    } catch (error) {
      console.error('? Error cambiando usuario:', error);
      return false;
    }
  }

  // ?? REFRESCAR TOKEN (si fuera necesario en el futuro)
  async refreshToken() {
    try {
      console.log('?? Refrescando token...');
      
      // Por ahora, re-verificar el token existente
      const response = await this.verifyToken();
      
      console.log('? Token refrescado');
      return response;
      
    } catch (error) {
      console.error('? Error refrescando token:', error);
      throw error;
    }
  }

  // ?? LIMPIAR DATOS DE AUTENTICACI車N
  async clearAuthData() {
    try {
      await AsyncStorage.multiRemove(['authToken', 'user']);
      console.log('? Datos de autenticaci車n limpiados');
    } catch (error) {
      console.error('? Error limpiando datos de auth:', error);
    }
  }

  // ?? OBTENER ESTADO DE CONEXI車N
  getConnectionStatus() {
    return ApiService.getConnectionStatus();
  }

  // ?? HEALTH CHECK
  async testConnection() {
    try {
      const response = await ApiService.healthCheck();
      return response;
    } catch (error) {
      console.error('? Error en test de conexi車n:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const authService = new AuthService();
export default authService;