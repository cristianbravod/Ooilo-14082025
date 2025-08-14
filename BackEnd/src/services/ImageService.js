// services/ImageService.js - Servicio cliente adaptado para tu IP/Puerto
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export class ImageService {
  // ✅ Adaptar a tu configuración de servidor
  static API_BASE = 'http://192.168.1.16:3000/api';

  /**
   * Sube una imagen al servidor con procesamiento automático
   */
  static async uploadImage(imageUri, metadata = {}) {
    try {
      console.log('📤 Iniciando upload de imagen:', imageUri);

      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('El archivo de imagen no existe');
      }

      console.log('📁 Información del archivo:', {
        uri: imageUri,
        size: fileInfo.size,
        exists: fileInfo.exists
      });

      // Crear FormData para multipart upload
      const formData = new FormData();
      
      // Agregar imagen al FormData
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `image_${Date.now()}.jpg`,
      });

      // Agregar metadatos si los hay
      if (metadata.categoria) {
        formData.append('categoria', metadata.categoria);
      }
      if (metadata.tipo) {
        formData.append('tipo', metadata.tipo);
      }

      console.log('🚀 Enviando al servidor:', `${this.API_BASE}/upload/image`);

      // Hacer request al servidor
      const response = await fetch(`${this.API_BASE}/upload/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('📡 Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload falló: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload exitoso:', result.fileName);
      console.log('🖼️ URLs generadas:', Object.keys(result.urls));
      
      return {
        success: true,
        fileName: result.fileName,
        urls: result.urls,
        metadata: result.metadata,
        // URL por defecto para mostrar en la app (calidad media)
        defaultUrl: result.urls.medium,
        // URL de alta calidad para el menú web
        webUrl: result.urls.large,
        // URL de thumbnail para listas
        thumbnailUrl: result.urls.thumbnail,
        method: 'direct'
      };

    } catch (error) {
      console.error('❌ Error en upload directo:', error);
      return {
        success: false,
        error: error.message,
        defaultUrl: imageUri // Fallback a URI local
      };
    }
  }

  /**
   * Procesa imagen Base64 como fallback
   */
  static async uploadBase64(imageUri) {
    try {
      console.log('🔄 Convirtiendo a Base64 y subiendo...');
      
      // Convertir a Base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const base64Data = `data:image/jpeg;base64,${base64}`;

      console.log('📏 Tamaño Base64:', Math.round(base64Data.length / 1024), 'KB');

      // Enviar al servidor
      const response = await fetch(`${this.API_BASE}/upload/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data,
          fileName: `image_${Date.now()}.jpg`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Base64 upload falló: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Base64 upload exitoso:', result.fileName);
      
      return {
        success: true,
        fileName: result.fileName,
        urls: result.urls,
        defaultUrl: result.urls.medium,
        webUrl: result.urls.large,
        thumbnailUrl: result.urls.thumbnail,
        method: 'base64'
      };

    } catch (error) {
      console.error('❌ Error en Base64 upload:', error);
      return {
        success: false,
        error: error.message,
        defaultUrl: imageUri
      };
    }
  }

  /**
   * Método principal: intenta upload directo, fallback a Base64
   */
  static async processImage(imageUri, metadata = {}) {
    try {
      console.log('🎯 Iniciando procesamiento de imagen:', imageUri);
      
      // Intentar upload directo primero
      console.log('🚀 Intentando upload directo...');
      const directResult = await this.uploadImage(imageUri, metadata);
      
      if (directResult.success) {
        return {
          ...directResult,
          message: 'Imagen subida directamente al servidor'
        };
      }

      // Si falla, intentar Base64
      console.log('⚠️ Upload directo falló, intentando Base64...');
      const base64Result = await this.uploadBase64(imageUri);
      
      if (base64Result.success) {
        return {
          ...base64Result,
          message: 'Imagen convertida a Base64 y subida'
        };
      }

      // Si ambos fallan, usar URI local
      console.log('❌ Ambos métodos fallaron, usando URI local');
      return {
        success: false,
        method: 'local',
        defaultUrl: imageUri,
        message: 'No se pudo subir, usando almacenamiento local',
        warning: 'La imagen puede no estar disponible en el menú web'
      };

    } catch (error) {
      console.error('❌ Error en processImage:', error);
      return {
        success: false,
        method: 'error',
        defaultUrl: imageUri,
        error: error.message,
        message: 'Error procesando imagen'
      };
    }
  }

  /**
   * Elimina una imagen del servidor
   */
  static async deleteImage(fileName) {
    try {
      console.log('🗑️ Eliminando imagen del servidor:', fileName);
      
      const response = await fetch(`${this.API_BASE}/upload/${fileName}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Imagen eliminada del servidor:', fileName);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Error eliminando imagen:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene información de una imagen
   */
  static async getImageInfo(fileName) {
    try {
      const response = await fetch(`${this.API_BASE}/upload/info/${fileName}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Error obteniendo info de imagen:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todas las imágenes disponibles
   */
  static async listImages() {
    try {
      const response = await fetch(`${this.API_BASE}/upload/list`);
      return await response.json();
    } catch (error) {
      console.error('❌ Error listando imágenes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test de conectividad con el servidor
   */
  static async testConnection() {
    try {
      console.log('🔍 Probando conexión con servidor...');
      
      const response = await fetch(`${this.API_BASE.replace('/api', '')}/api/health`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Servidor accesible:', data);
        return { success: true, data };
      } else {
        console.log('⚠️ Servidor responde pero con error:', response.status);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validar imagen antes del upload
   */
  static async validateImage(imageUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'El archivo no existe' };
      }

      // Verificar tamaño (10MB máximo)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileInfo.size > maxSize) {
        return { 
          valid: false, 
          error: `Archivo demasiado grande (${Math.round(fileInfo.size / 1024 / 1024)}MB). Máximo 10MB.` 
        };
      }

      return { valid: true, size: fileInfo.size };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Configurar base URL dinámicamente
   */
  static setApiBase(baseUrl) {
    this.API_BASE = baseUrl;
    console.log('🔧 API Base actualizada:', this.API_BASE);
  }

  /**
   * Obtener configuración actual
   */
  static getConfig() {
    return {
      apiBase: this.API_BASE,
      maxSize: '10MB',
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      qualities: ['thumbnail', 'medium', 'large', 'original']
    };
  }
}