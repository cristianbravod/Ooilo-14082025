// components/LoadingScreen.js - VERSIÓN COMPLETA CORREGIDA
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MexicanChefLogo from './MexicanChefLogo';

// ✅ IMPORTAR TEMA CORREGIDO
import { IconSizes, ThemeUtils } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function LoadingScreen({ 
  type = 'normal', // 'normal', 'coldstart', 'sync', 'error', 'initialization', 'data'
  message,
  subtitle,
  progress = 0,
  onRetry,
  showRetry = false,
  useIcons = true, // Permite deshabilitar iconos si las fuentes no están listas
}) {
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [dots, setDots] = useState('');
  const [progressAnim] = useState(new Animated.Value(0));

  // ✅ VALIDAR INSETS COMO NÚMEROS
  const safeInsets = {
    top: typeof insets.top === 'number' ? insets.top : 0,
    bottom: typeof insets.bottom === 'number' ? insets.bottom : 0,
    left: typeof insets.left === 'number' ? insets.left : 0,
    right: typeof insets.right === 'number' ? insets.right : 0,
  };

  // Animación de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Animación de puntos suspensivos
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Animación de progreso
  useEffect(() => {
    if (progress > 0) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  // ✅ CONFIGURACIÓN POR TIPO CON VALIDACIÓN
  const getConfig = () => {
    const configs = {
      normal: {
        title: 'Cargando...',
        defaultMessage: 'Preparando la experiencia',
        backgroundColor: ['#2c3e50', '#34495e'],
        accentColor: '#e74c3c',
        iconColor: '#e74c3c',
        icon: 'restaurant',
      },
      coldstart: {
        title: 'Despertando servidor',
        defaultMessage: 'Iniciando servicios',
        backgroundColor: ['#8e44ad', '#9b59b6'],
        accentColor: '#f39c12',
        iconColor: '#f39c12',
        icon: 'cloud-upload',
      },
      sync: {
        title: 'Sincronizando',
        defaultMessage: 'Actualizando datos',
        backgroundColor: ['#2980b9', '#3498db'],
        accentColor: '#27ae60',
        iconColor: '#27ae60',
        icon: 'sync',
      },
      error: {
        title: 'Modo Offline',
        defaultMessage: 'Sin conexión al servidor',
        backgroundColor: ['#c0392b', '#e74c3c'],
        accentColor: '#f39c12',
        iconColor: '#f39c12',
        icon: 'cloud-offline',
      },
      initialization: {
        title: 'Inicializando',
        defaultMessage: 'Preparando aplicación',
        backgroundColor: ['#16a085', '#1abc9c'],
        accentColor: '#f1c40f',
        iconColor: '#f1c40f',
        icon: 'construct',
      },
      data: {
        title: 'Cargando datos',
        defaultMessage: 'Obteniendo información',
        backgroundColor: ['#d35400', '#e67e22'],
        accentColor: '#27ae60',
        iconColor: '#27ae60',
        icon: 'download',
      }
    };

    return configs[type] || configs.normal;
  };

  const config = getConfig();

  // ✅ ESTILOS DINÁMICOS CON VALIDACIÓN NUMÉRICA
  const getDynamicStyles = () => {
    return StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: ThemeUtils.getNumericValue(20, 20),
        paddingTop: safeInsets.top,
        paddingBottom: safeInsets.bottom,
        backgroundColor: config.backgroundColor[0], // Color base
      },
      gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    });
  };

  const dynamicStyles = getDynamicStyles();

  return (
    <View style={dynamicStyles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo o Icono */}
        <View style={styles.logoContainer}>
          {type === 'normal' || type === 'data' ? (
            <MexicanChefLogo size={120} />
          ) : (
            useIcons ? (
              <View style={[styles.iconContainer, { borderColor: config.accentColor }]}>            
                <Ionicons 
                  name={config.icon} 
                  size={IconSizes['3xl']} // ✅ USAR VALOR NUMÉRICO VALIDADO
                  color={config.iconColor} 
                />
              </View>
            ) : (
              <MexicanChefLogo size={120} />
            )
          )}
        </View>

        {/* Título */}
        <Text style={[styles.title, { color: config.accentColor }]}>           
          {config.title}
        </Text>

        {/* Mensaje principal */}
        <Text style={styles.message}>
          {message || config.defaultMessage}{dots}
        </Text>

        {/* Subtítulo */}
        {subtitle && (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        )}

        {/* Barra de progreso */}
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: config.accentColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {ThemeUtils.getNumericValue(progress, 0).toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Indicador de carga */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator 
            size={IconSizes.xl} // ✅ USAR VALOR NUMÉRICO VALIDADO
            color={config.accentColor} 
            style={styles.loader}
          />
        </View>

        {/* Información adicional según el tipo */}
        {type === 'coldstart' && (
          <View style={styles.infoContainer}>
            {useIcons && <Ionicons name="information-circle-outline" size={IconSizes.md} color="#bdc3c7" />}
            <Text style={styles.infoText}>
              Los servidores gratuitos se duermen después de 15 minutos.
              Esto puede tardar 30-60 segundos.
            </Text>
          </View>
        )}

        {/* Botón de reintentar */}
        {type === 'error' && showRetry && onRetry && (
          <TouchableOpacity 
            style={[styles.retryButton, { borderColor: config.accentColor }]}
            onPress={onRetry}
          >
            {useIcons && <Ionicons name="refresh-outline" size={IconSizes.md} color={config.accentColor} />}
            <Text style={[styles.retryText, { color: config.accentColor }]}>Reintentar</Text>
          </TouchableOpacity>
        )}

        {/* Tips informativos */}
        {(type === 'normal' || type === 'initialization') && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipTitle}>💡 Mientras esperas:</Text>
            <Text style={styles.tipText}>• Verifica tu conexión a internet</Text>
            <Text style={styles.tipText}>• La primera carga puede tardar más</Text>
            <Text style={styles.tipText}>• Los datos se guardan localmente</Text>
          </View>
        )}
      </Animated.View>

      {/* Indicador de versión */}
      <View style={[styles.versionContainer, { bottom: safeInsets.bottom + 30 }]}>
        <Text style={styles.versionText}>v2.0.0 - SDK 51</Text>
        {type === 'error' && (
          <Text style={styles.statusText}>⚠️ Modo Offline</Text>
        )}
      </View>
    </View>
  );
}

// ✅ ESTILOS CON VALORES NUMÉRICOS VALIDADOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 350,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28, // ✅ VALOR NUMÉRICO VALIDADO
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  message: {
    fontSize: 16, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22, // ✅ VALOR NUMÉRICO VALIDADO
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18, // ✅ VALOR NUMÉRICO VALIDADO
  },
  progressContainer: {
    width: '100%',
    marginBottom: 25,
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 6, // ✅ VALOR NUMÉRICO VALIDADO
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#bdc3c7',
    fontWeight: '600',
  },
  loaderContainer: {
    marginVertical: 20,
  },
  loader: {
    transform: [{ scale: 1.2 }],
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    maxWidth: '90%',
  },
  infoText: {
    fontSize: 12, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#bdc3c7',
    marginLeft: 8,
    lineHeight: 16, // ✅ VALOR NUMÉRICO VALIDADO
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  retryText: {
    fontSize: 16, // ✅ VALOR NUMÉRICO VALIDADO
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsContainer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: 'rgba(205, 133, 63, 0.1)',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#CD853F',
  },
  tipTitle: {
    fontSize: 14, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#CD853F',
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#DEB887',
    marginBottom: 4,
    lineHeight: 16, // ✅ VALOR NUMÉRICO VALIDADO
  },
  versionContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12, // ✅ VALOR NUMÉRICO VALIDADO
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12, // ✅ VALOR NUMÉRICO VALIDADO
    color: '#e74c3c',
    fontWeight: '500',
  },
});