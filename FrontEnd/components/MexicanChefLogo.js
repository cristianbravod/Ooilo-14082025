// components/MexicanChefLogo.js - VERSIÓN COMPLETA CORREGIDA
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ✅ IMPORTAR UTILIDADES DEL TEMA
import { ThemeUtils } from '../theme/theme';

const MexicanChefLogo = ({ size = 120 }) => {
  // ✅ VALIDAR QUE size ES UN NÚMERO
  const logoSize = ThemeUtils.getNumericValue(size, 120);
  const dynamicStyles = getStyles(logoSize);

  return (
    <View style={[styles.logoContainer, { 
      width: logoSize, 
      height: logoSize * 0.9 
    }]}>
      {/* Fondo principal con esquinas redondeadas */}
      <View style={[styles.mainBackground, dynamicStyles.mainBackground]}>
        
        {/* Decoraciones superiores */}
        <View style={styles.topDecorations}>
          {/* Calavera en la parte superior */}
          <View style={[styles.skull, dynamicStyles.skull]}>
            <View style={[styles.skullEye, dynamicStyles.skullEye]} />
            <View style={[styles.skullEye, dynamicStyles.skullEye, { marginLeft: logoSize * 0.01 }]} />
            <View style={[styles.skullMouth, dynamicStyles.skullMouth]} />
          </View>
          
          {/* Flores decorativas */}
          <View style={[styles.flower, styles.leftFlower, dynamicStyles.flower]}>
            <Text style={[styles.flowerText, dynamicStyles.flowerText]}>✿</Text>
          </View>
          <View style={[styles.flower, styles.rightFlower, dynamicStyles.flower]}>
            <Text style={[styles.flowerText, dynamicStyles.flowerText]}>✿</Text>
          </View>
          
          {/* Puntos decorativos */}
          <View style={[styles.decorDot, styles.dot1, dynamicStyles.decorDot]} />
          <View style={[styles.decorDot, styles.dot2, dynamicStyles.decorDot]} />
          <View style={[styles.decorDot, styles.dot3, dynamicStyles.decorDot]} />
          <View style={[styles.decorDot, styles.dot4, dynamicStyles.decorDot]} />
        </View>

        {/* Cara del chef */}
        <View style={[styles.chefFace, dynamicStyles.chefFace]}>
          {/* Ojos */}
          <View style={styles.eyes}>
            <View style={[styles.eye, dynamicStyles.eye]}>
              <View style={[styles.eyePupil, dynamicStyles.eyePupil]} />
              <View style={[styles.eyeShine, dynamicStyles.eyeShine]} />
            </View>
            <View style={[styles.eye, dynamicStyles.eye]}>
              <View style={[styles.eyePupil, dynamicStyles.eyePupil]} />
              <View style={[styles.eyeShine, dynamicStyles.eyeShine]} />
            </View>
          </View>
          
          {/* Nariz */}
          <View style={[styles.nose, dynamicStyles.nose]} />
          
          {/* Boca */}
          <View style={[styles.mouth, dynamicStyles.mouth]}>
            <View style={[styles.smile, dynamicStyles.smile]} />
          </View>
        </View>

        {/* Tacos del chef */}
        <View style={[styles.tacoContainer, dynamicStyles.tacoContainer]}>
          {/* Taco 1 */}
          <View style={[styles.taco, dynamicStyles.taco, { left: logoSize * 0.05 }]}>
            <View style={[styles.tortilla, dynamicStyles.tortilla]} />
            <View style={[styles.filling, dynamicStyles.filling]} />
            <View style={[styles.lettuce, dynamicStyles.lettuce]} />
          </View>
          
          {/* Taco 2 */}
          <View style={[styles.taco, dynamicStyles.taco, { right: logoSize * 0.05 }]}>
            <View style={[styles.tortilla, dynamicStyles.tortilla]} />
            <View style={[styles.filling, dynamicStyles.filling]} />
            <View style={[styles.lettuce, dynamicStyles.lettuce]} />
          </View>
        </View>

        {/* Elementos decorativos inferiores */}
        <View style={styles.bottomDecorations}>
          {/* Flores inferiores */}
          <View style={[styles.flower, styles.bottomLeftFlower, dynamicStyles.flower]}>
            <Text style={[styles.flowerText, dynamicStyles.flowerText]}>🌺</Text>
          </View>
          <View style={[styles.flower, styles.bottomRightFlower, dynamicStyles.flower]}>
            <Text style={[styles.flowerText, dynamicStyles.flowerText]}>🌺</Text>
          </View>
          
          {/* Elementos vegetales */}
          <View style={[styles.leaf, styles.leftLeaf, dynamicStyles.leaf]}>
            <Text style={[styles.leafText, dynamicStyles.leafText]}>🌿</Text>
          </View>
          <View style={[styles.leaf, styles.rightLeaf, dynamicStyles.leaf]}>
            <Text style={[styles.leafText, dynamicStyles.leafText]}>🌿</Text>
          </View>
        </View>
      </View>
      
      {/* Borde naranja exterior */}
      <View style={[styles.outerBorder, dynamicStyles.outerBorder]} />
    </View>
  );
};

// ✅ FUNCIÓN PARA GENERAR ESTILOS DINÁMICOS CON VALIDACIÓN
const getStyles = (size) => {
  // ✅ ASEGURAR QUE size ES UN NÚMERO VÁLIDO
  const validSize = ThemeUtils.getNumericValue(size, 120);
  
  return {
    mainBackground: {
      width: validSize * 0.9,
      height: validSize * 0.8,
      borderRadius: validSize * 0.15,
    },
    outerBorder: {
      width: validSize,
      height: validSize * 0.9,
      borderRadius: validSize * 0.18,
      borderWidth: validSize * 0.03,
    },
    skull: {
      width: validSize * 0.12,
      height: validSize * 0.1,
    },
    skullEye: {
      width: validSize * 0.02,
      height: validSize * 0.02,
      borderRadius: validSize * 0.01,
    },
    skullMouth: {
      width: validSize * 0.06,
      height: validSize * 0.01,
      borderRadius: validSize * 0.005,
      marginTop: validSize * 0.01,
    },
    flower: {
      width: validSize * 0.08,
      height: validSize * 0.08,
    },
    flowerText: {
      fontSize: validSize * 0.06,
    },
    decorDot: {
      width: validSize * 0.015,
      height: validSize * 0.015,
      borderRadius: validSize * 0.0075,
    },
    chefFace: {
      width: validSize * 0.45,
      height: validSize * 0.4,
      borderRadius: validSize * 0.225,
    },
    eye: {
      width: validSize * 0.08,
      height: validSize * 0.08,
      borderRadius: validSize * 0.04,
    },
    eyePupil: {
      width: validSize * 0.04,
      height: validSize * 0.04,
      borderRadius: validSize * 0.02,
    },
    eyeShine: {
      width: validSize * 0.015,
      height: validSize * 0.015,
      borderRadius: validSize * 0.0075,
    },
    nose: {
      width: validSize * 0.008,
      height: validSize * 0.008,
      borderRadius: validSize * 0.004,
    },
    mouth: {
      width: validSize * 0.12,
      height: validSize * 0.03,
      borderRadius: validSize * 0.015,
    },
    smile: {
      width: validSize * 0.08,
      height: validSize * 0.015,
      borderRadius: validSize * 0.04,
    },
    tacoContainer: {
      width: validSize * 0.3,
      height: validSize * 0.15,
    },
    taco: {
      width: validSize * 0.12,
      height: validSize * 0.08,
    },
    tortilla: {
      width: validSize * 0.12,
      height: validSize * 0.08,
      borderRadius: validSize * 0.02,
    },
    filling: {
      width: validSize * 0.08,
      height: validSize * 0.04,
      borderRadius: validSize * 0.01,
    },
    lettuce: {
      width: validSize * 0.06,
      height: validSize * 0.02,
      borderRadius: validSize * 0.01,
    },
    hand: {
      width: validSize * 0.06,
      height: validSize * 0.08,
      borderRadius: validSize * 0.03,
    },
    leaf: {
      width: validSize * 0.06,
      height: validSize * 0.06,
    },
    leafText: {
      fontSize: validSize * 0.04,
    },
  };
};

// ✅ ESTILOS ESTÁTICOS CON VALORES NUMÉRICOS VALIDADOS
const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  outerBorder: {
    position: 'absolute',
    borderColor: '#D2691E',
    backgroundColor: 'transparent',
    zIndex: 0,
    top: 0,
  },
  mainBackground: {
    backgroundColor: '#2F2F2F',
    position: 'relative',
    zIndex: 1,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  
  // Decoraciones superiores
  topDecorations: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 5,
  },
  skull: {
    backgroundColor: '#D2691E',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  skullEye: {
    backgroundColor: '#2F2F2F',
    position: 'absolute',
    top: 2,
  },
  skullMouth: {
    backgroundColor: '#2F2F2F',
  },
  flower: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  leftFlower: {
    left: 15,
    top: -2,
  },
  rightFlower: {
    right: 15,
    top: -2,
  },
  bottomLeftFlower: {
    left: 10,
    bottom: 2,
  },
  bottomRightFlower: {
    right: 10,
    bottom: 2,
  },
  flowerText: {
    color: '#D2691E',
    fontWeight: 'bold',
  },
  decorDot: {
    backgroundColor: '#D2691E',
    position: 'absolute',
  },
  dot1: { left: 25, top: 8 },
  dot2: { right: 25, top: 8 },
  dot3: { left: 35, top: 15 },
  dot4: { right: 35, top: 15 },

  // Cara del chef
  chefFace: {
    backgroundColor: '#F5DEB3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 5,
  },
  eyes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '70%',
    marginBottom: 5,
  },
  eye: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eyePupil: {
    backgroundColor: '#2F2F2F',
  },
  eyeShine: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 2,
    left: 2,
  },
  nose: {
    backgroundColor: '#CD853F',
    marginBottom: 5,
  },
  mouth: {
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smile: {
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },

  // Tacos
  tacoContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 5,
  },
  taco: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tortilla: {
    backgroundColor: '#F4A460',
    position: 'absolute',
  },
  filling: {
    backgroundColor: '#8B4513',
    position: 'absolute',
    top: 2,
  },
  lettuce: {
    backgroundColor: '#228B22',
    position: 'absolute',
    top: 1,
  },

  // Decoraciones inferiores
  bottomDecorations: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginTop: 5,
  },
  leftLeaf: {
    left: 5,
    bottom: 0,
  },
  rightLeaf: {
    right: 5,
    bottom: 0,
  },
  leaf: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  leafText: {
    color: '#228B22',
    fontWeight: 'bold',
  },
});

export default MexicanChefLogo;