// services/ImageService.js - SERVICIO DE IMÁGENES COMPLETO CORREGIDO
import * as FileSystem from 'expo-file-system';

export default class ImageService {
  // ✅ CONFIGURACIÓN VALIDADA DE API
  static API_BASE = 'http://200.54.216.197:3000/api';

  // ✅ CONFIGURACIÓN DE CALIDADES DE IMAGEN (SOLO METADATOS, NO PARA PROPS DE ESTILO)
  static IMAGE_QUALITIES = {
    thumbnail: {
      suffix: '_thumb',
      maxWidth: 150,
      maxHeight: 150,
      quality: 0.7,
      description: 'Imagen pequeña para listas y previews'
    },
    medium: {
      suffix: '_med',
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.8,
      description: 'Imagen mediana para mostrar en la app'
    },
    large: {
      suffix: '_large',
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.9,
      description: 'Imagen grande para detalles y menú web'
    },
    original: {
      suffix: '',
      maxWidth: null,
      maxHeight: null,
      quality: 1.0,
      description: 'Imagen original sin procesar'
    }
  };

  /**
   * ✅ SUBIR IMAGEN USANDO FORMDATA (MÉTODO PRINCIPAL)
   * URLs devueltas como strings únicamente, nunca pasadas a props de estilo
   */
  static async uploadDirect(imageUri) {
    try {
      console.log('📤 Subiendo imagen directamente...');
      
      // Validar imagen antes de subir
      const validation = await this.validateImage(imageUri);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Crear FormData
      const formData = new FormData();
      
      // Obtener nombre del archivo
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      });

      console.log('📋 FormData preparado, enviando...');

      // Enviar al servidor
      console.log('URL:', `${this.API_BASE}/upload/direct`);
      const response = await fetch(`${this.API_BASE}/upload/direct`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload directo falló: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload directo exitoso:', result.fileName);
      
      // ✅ ESTRUCTURA DE RESPUESTA CORREGIDA - SOLO STRINGS PARA URLs
      return {
        success: true,
        fileName: result.fileName,
        urls: result.urls || {},
        metadata: result.metadata || {},
        
        // ✅ URLs CLARAMENTE SEPARADAS COMO STRINGS (NUNCA PARA PROPS DE ESTILO)
        thumbnailUrl: this.ensureString(result.urls?.thumbnail),
        mediumUrl: this.ensureString(result.urls?.medium), 
        largeUrl: this.ensureString(result.urls?.large),
        originalUrl: this.ensureString(result.urls?.original),
        
        // URL por defecto para mostrar en la app
        defaultUrl: this.ensureString(
          result.urls?.medium || 
          result.urls?.large || 
          result.urls?.thumbnail || 
          imageUri
        ),
        
        method: 'direct'
      };

    } catch (error) {
      console.error('❌ Error en upload directo:', error);
      return {
        success: false,
        error: error.message,
        // Fallback a URI local
        defaultUrl: this.ensureString(imageUri),
        thumbnailUrl: this.ensureString(imageUri),
        mediumUrl: this.ensureString(imageUri),
        largeUrl: this.ensureString(imageUri),
        originalUrl: this.ensureString(imageUri),
      };
    }
  }

  /**
   * ✅ PROCESAR IMAGEN BASE64 COMO FALLBACK
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
      
      // ✅ ESTRUCTURA DE RESPUESTA CORREGIDA
      return {
        success: true,
        fileName: result.fileName,
        urls: result.urls || {},
        metadata: result.metadata || {},
        
        // ✅ URLs COMO STRINGS ÚNICAMENTE
        thumbnailUrl: this.ensureString(result.urls?.thumbnail),
        mediumUrl: this.ensureString(result.urls?.medium),
        largeUrl: this.ensureString(result.urls?.large),
        originalUrl: this.ensureString(result.urls?.original),
        
        defaultUrl: this.ensureString(
          result.urls?.medium || 
          result.urls?.large || 
          result.urls?.thumbnail || 
          imageUri
        ),
        
        method: 'base64'
      };

    } catch (error) {
      console.error('❌ Error en Base64 upload:', error);
      return {
        success: false,
        error: error.message,
        // Fallback a URI local
        defaultUrl: this.ensureString(imageUri),
        thumbnailUrl: this.ensureString(imageUri),
        mediumUrl: this.ensureString(imageUri),
        largeUrl: this.ensureString(imageUri),
        originalUrl: this.ensureString(imageUri),
      };
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL DE UPLOAD CON FALLBACK AUTOMÁTICO
   */
  static async uploadImage(imageUri) {
    try {
      console.log('🚀 Iniciando upload de imagen...');
      
      // Intentar upload directo primero
      let result = await this.uploadDirect(imageUri);
      
      // Si falla, intentar con Base64
      if (!result.success) {
        console.log('⚠️ Upload directo falló, intentando Base64...');
        result = await this.uploadBase64(imageUri);
      }

      return result;
      
    } catch (error) {
      console.error('❌ Error general en upload de imagen:', error);
      return { 
        success: false, 
        error: error.message,
        defaultUrl: this.ensureString(imageUri),
        thumbnailUrl: this.ensureString(imageUri),
        mediumUrl: this.ensureString(imageUri),
        largeUrl: this.ensureString(imageUri),
        originalUrl: this.ensureString(imageUri),
      };
    }
  }

  /**
   * ✅ OBTENER INFORMACIÓN DE UNA IMAGEN
   */
  static async getImageInfo(fileName) {
    try {
      if (!fileName || typeof fileName !== 'string') {
        throw new Error('Nombre de archivo inválido');
      }

      const response = await fetch(`${this.API_BASE}/upload/info/${fileName}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        ...data,
        success: true,
        // ✅ ASEGURAR QUE LAS URLs SON STRINGS
        urls: data.urls || {},
        thumbnailUrl: this.ensureString(data.urls?.thumbnail),
        mediumUrl: this.ensureString(data.urls?.medium),
        largeUrl: this.ensureString(data.urls?.large),
        originalUrl: this.ensureString(data.urls?.original),
      };
    } catch (error) {
      console.error('❌ Error obteniendo info de imagen:', error);
      return { 
        success: false, 
        error: error.message,
        urls: {},
        thumbnailUrl: '',
        mediumUrl: '',
        largeUrl: '',
        originalUrl: '',
      };
    }
  }

  /**
   * ✅ LISTAR TODAS LAS IMÁGENES DISPONIBLES
   */
  static async listImages() {
    try {
      const response = await fetch(`${this.API_BASE}/upload/list`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ✅ ASEGURAR QUE TODAS LAS URLs EN LA LISTA SON STRINGS
      if (data.images && Array.isArray(data.images)) {
        data.images = data.images.map(image => ({
          ...image,
          thumbnailUrl: this.ensureString(image.urls?.thumbnail),
          mediumUrl: this.ensureString(image.urls?.medium),
          largeUrl: this.ensureString(image.urls?.large),
          originalUrl: this.ensureString(image.urls?.original),
        }));
      }

      return data;
    } catch (error) {
      console.error('❌ Error listando imágenes:', error);
      return { 
        success: false, 
        error: error.message,
        images: []
      };
    }
  }

  /**
   * ✅ ELIMINAR IMAGEN DEL SERVIDOR
   */
  static async deleteImage(fileName) {
    try {
      if (!fileName || typeof fileName !== 'string') {
        throw new Error('Nombre de archivo inválido');
      }

      const response = await fetch(`${this.API_BASE}/upload/delete/${fileName}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error eliminando imagen:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ TEST DE CONECTIVIDAD CON EL SERVIDOR
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
   * ✅ VALIDAR IMAGEN ANTES DEL UPLOAD
   */
  static async validateImage(imageUri) {
    try {
      if (!imageUri || typeof imageUri !== 'string') {
        return { valid: false, error: 'URI de imagen inválida' };
      }

      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'El archivo no existe' };
      }

      // ✅ VALIDACIÓN: Asegurar que size es un número
      const fileSize = this.ensureNumber(fileInfo.size, 0);
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (fileSize > maxSize) {
        return { 
          valid: false, 
          error: `Archivo demasiado grande (${Math.round(fileSize / 1024 / 1024)}MB). Máximo 10MB.` 
        };
      }

      if (fileSize === 0) {
        return { valid: false, error: 'El archivo está vacío' };
      }

      return { valid: true, size: fileSize };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * ✅ CONFIGURAR BASE URL DINÁMICAMENTE
   */
  static setApiBase(baseUrl) {
    if (typeof baseUrl === 'string' && baseUrl.trim()) {
      this.API_BASE = baseUrl.trim();
      console.log('🔧 API Base actualizada:', this.API_BASE);
    } else {
      console.warn('⚠️ Base URL inválida, manteniendo la actual');
    }
  }

  /**
   * ✅ OBTENER CONFIGURACIÓN ACTUAL
   */
  static getConfig() {
    return {
      apiBase: this.API_BASE,
      maxSize: '10MB',
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      availableQualities: Object.keys(this.IMAGE_QUALITIES),
      qualitySettings: this.IMAGE_QUALITIES,
    };
  }

  /**
   * ✅ UTILIDAD PARA OBTENER URL SEGURA
   * Evita pasar strings como "large" a propiedades que esperan números
   */
  static getSafeImageUrl(imageData, quality = 'medium') {
    if (!imageData) return '';
    
    // Si es string, devolver directamente
    if (typeof imageData === 'string') {
      return this.ensureString(imageData);
    }
    
    // Si es objeto con URLs
    if (imageData.urls && typeof imageData.urls === 'object') {
      const qualityUrl = imageData.urls[quality];
      if (qualityUrl) {
        return this.ensureString(qualityUrl);
      }
    }
    
    // Buscar en propiedades directas del objeto
    const directUrl = imageData[`${quality}Url`] || 
                      imageData.defaultUrl || 
                      imageData.mediumUrl || 
                      imageData.largeUrl || 
                      imageData.thumbnailUrl;
    
    return this.ensureString(directUrl);
  }

  /**
   * ✅ UTILIDAD PARA ASEGURAR QUE UN VALOR ES STRING
   */
  static ensureString(value) {
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  /**
   * ✅ UTILIDAD PARA ASEGURAR QUE UN VALOR ES NÚMERO
   */
  static ensureNumber(value, fallback = 0) {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    return fallback;
  }

  /**
   * ✅ OBTENER METADATOS DE CALIDAD (SOLO PARA INFORMACIÓN, NO PARA ESTILOS)
   */
  static getQualityMetadata(quality = 'medium') {
    const qualityData = this.IMAGE_QUALITIES[quality];
    if (!qualityData) {
      console.warn(`⚠️ Calidad de imagen desconocida: ${quality}`);
      return this.IMAGE_QUALITIES.medium;
    }
    return qualityData;
  }

  /**
   * ✅ GENERAR NOMBRE DE ARCHIVO ÚNICO
   */
  static generateFileName(prefix = 'image', extension = 'jpg') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }
}
