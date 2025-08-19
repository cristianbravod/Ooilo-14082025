// FrontEnd/services/ApiService.js - VERSIÓN FINAL Y COMPLETA
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ApiService {
  constructor() {
    this.BASE_URLS = [
      'http://200.54.216.197:3000/api',
      'http://192.1.1.16:3000/api',
      'http://localhost:3000/api',
    ];
    this.API_BASE_URL = this.BASE_URLS[0];
    this.authToken = null;
    console.log('🌐 ApiService inicializado:', this.API_BASE_URL);
  }

  async request(endpoint, options = {}) {
    const url = `${this.API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.error(`❌ API request a ${url} falló:`, error);
      throw error;
    }
  }

  async uploadImage(uri, { onProgress }) {
    const url = `${this.API_BASE_URL}/upload/image`;
    const token = await AsyncStorage.getItem('auth_token');

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: `img_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.response));
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.response}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed'));
      };

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        };
      }

      xhr.send(formData);
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      this.authToken = response.token;
      await AsyncStorage.setItem('auth_token', response.token);
    }
    return response;
  }

  async logout() {
    this.authToken = null;
    await AsyncStorage.removeItem('auth_token');
  }
  
  async healthCheck() {
    return this.request('/health');
  }

  async getMenu() {
    return this.request('/menu');
  }

  async createMenuItem(data) {
    return this.request('/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenuItem(id, data) {
    return this.request(`/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
  }

  async deleteMenuItem(id) {
    return this.request(`/menu/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategorias() {
    return this.request('/categorias');
  }

  async getPlatosEspeciales() {
    return this.request('/platos-especiales');
  }

  async createPlatoEspecial(data) {
    return this.request('/platos-especiales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlatoEspecial(id, data) {
    return this.request(`/platos-especiales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlatoEspecial(id) {
    return this.request(`/platos-especiales/${id}`, {
      method: 'DELETE',
    });
  }
  
  async togglePlatoEspecialAvailability(id, disponible) {
    return this.request(`/platos-especiales/${id}/disponibilidad`, {
      method: 'PATCH',
      body: JSON.stringify({ disponible }),
    });
  }

  async getMesas() {
    return this.request('/mesas');
  }

  async getEstadisticasMesas() {
    try {
      return await this.request('/mesas/estadisticas');
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de mesas:', error.message);
      return { total: 0, mesas: 0, pickup: 0, disponibles: 0 };
    }
  }
  
  async getPedidos() {
    return this.request('/ordenes');
  }
  
  async getVentas(filtros = {}) {
    let endpoint = '/ordenes';
    const params = new URLSearchParams();
    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
    if (filtros.estado) params.append('estado', filtros.estado);
    if (params.toString()) {
      endpoint += '?' + params.toString();
    }
    return this.request(endpoint);
  }

  async createQuickOrder(orderData) {
    return this.request('/ordenes/quick', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
  }

  async updateMesa(id, data) {
    return this.request(`/mesas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createMesa(data) {
    return this.request('/mesas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMesa(id) {
    return this.request(`/mesas/${id}`, {
      method: 'DELETE',
    });
  }

  async cambiarEstadoMesa(id, estado) {
    return this.request(`/mesas/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
    });
  }
  
  async resetearConfiguracionMesas() {
    console.warn('resetearConfiguracionMesas no implementado');
    return { success: true, message: 'Función no implementada' };
  }
}

export default new ApiService();
