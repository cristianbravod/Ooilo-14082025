// ===================================================================
// 3. MODIFICACIONES A LOS COMPONENTES EXISTENTES
// ===================================================================

// hooks/useImageUpload.js - Hook personalizado para manejo de imágenes
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageService from '../services/ImageService';

export const useImageUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrls, setImageUrls] = useState(null);

  const requestPermissions = useCallback(async () => {
    try {
      const [cameraResult, mediaResult] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync()
      ]);
      
      return cameraResult.status === 'granted' && mediaResult.status === 'granted';
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  }, []);

  const processImageUpload = useCallback(async (imageUri, metadata = {}) => {
    try {
      setUploadingImage(true);
      console.log('📤 Procesando imagen:', imageUri);

      const result = await ImageService.processImage(imageUri, metadata);
      
      if (result.success) {
        setSelectedImage(result.defaultUrl);
        setImageUrls(result.urls);
        setImageError(false);
        
        Alert.alert('✅ Éxito', result.message);
        
        return {
          success: true,
          imageUrl: result.defaultUrl,
          webUrl: result.webUrl,
          thumbnailUrl: result.thumbnailUrl,
          fileName: result.fileName,
          urls: result.urls
        };
      } else {
        setSelectedImage(result.defaultUrl);
        setImageError(true);
        
        if (result.warning) {
          Alert.alert('⚠️ Advertencia', result.warning);
        } else {
          Alert.alert('❌ Error', result.message || 'No se pudo procesar la imagen');
        }
        
        return {
          success: false,
          imageUrl: result.defaultUrl,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Error en upload:', error);
      setImageError(true);
      Alert.alert('❌ Error', 'Error procesando la imagen');
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const takePhoto = useCallback(async (metadata = {}) => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara y galería.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        return await processImageUpload(result.assets[0].uri, metadata);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error tomando foto:', error);
      Alert.alert('❌ Error', 'No se pudo tomar la foto');
      return null;
    }
  }, [processImageUpload, requestPermissions]);

  const selectFromGallery = useCallback(async (metadata = {}) => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos de galería.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        return await processImageUpload(result.assets[0].uri, metadata);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error seleccionando imagen:', error);
      Alert.alert('❌ Error', 'No se pudo seleccionar la imagen');
      return null;
    }
  }, [processImageUpload, requestPermissions]);

  const showImageOptions = useCallback((metadata = {}) => {
    const options = [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📷 Tomar Foto', onPress: () => takePhoto(metadata) },
      { text: '🖼️ Galería', onPress: () => selectFromGallery(metadata) }
    ];

    if (selectedImage) {
      options.push({ 
        text: '🗑️ Eliminar', 
        onPress: clearImage, 
        style: 'destructive' 
      });
    }

    Alert.alert('Imagen del Producto', 'Selecciona una opción:', options);
  }, [selectedImage, takePhoto, selectFromGallery]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImageUrls(null);
    setImageError(false);
  }, []);

  const setImageFromUrl = useCallback((url) => {
    setSelectedImage(url);
    setImageError(false);
  }, []);

  return {
    selectedImage,
    uploadingImage,
    imageError,
    imageUrls,
    takePhoto,
    selectFromGallery,
    showImageOptions,
    clearImage,
    setImageFromUrl,
    processImageUpload
  };
};
