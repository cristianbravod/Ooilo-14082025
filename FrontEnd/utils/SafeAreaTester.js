// utils/SafeAreaTester.js - Componente para validar implementación
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  ScrollView,
  Platform,
  Dimensions 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export function SafeAreaTester() {
  const [showModal, setShowModal] = useState(false);
  const [testScenario, setTestScenario] = useState('header');
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  if (!__DEV__) return null; // Solo en desarrollo

  const TestScenarios = {
    header: 'Test Header',
    modal: 'Test Modal', 
    scroll: 'Test ScrollView',
    landscape: 'Test Landscape'
  };

  const renderTestContent = () => {
    switch (testScenario) {
      case 'header':
        return (
          <SafeAreaView style={styles.testContainer} edges={['top', 'left', 'right']}>
            <View style={[styles.testHeader, {
              paddingTop: Math.max(insets.top, 20),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16)
            }]}>
              <Text style={styles.testHeaderText}>Header Test</Text>
              <Text style={styles.testSubtext}>
                Should respect notch/status bar
              </Text>
            </View>
            
            <View style={styles.testContent}>
              <Text style={styles.testTitle}>Safe Area Insets:</Text>
              <Text style={styles.testInfo}>Top: {insets.top}px</Text>
              <Text style={styles.testInfo}>Bottom: {insets.bottom}px</Text>
              <Text style={styles.testInfo}>Left: {insets.left}px</Text>
              <Text style={styles.testInfo}>Right: {insets.right}px</Text>
              <Text style={styles.testInfo}>Screen: {width}x{height}</Text>
              <Text style={styles.testInfo}>Platform: {Platform.OS}</Text>
              
              <View style={styles.testIndicators}>
                <View style={[styles.indicator, { backgroundColor: insets.top > 20 ? '#4CAF50' : '#FF5722' }]}>
                  <Text style={styles.indicatorText}>
                    {insets.top > 20 ? '✓ Has Notch/Dynamic Island' : '○ Regular Status Bar'}
                  </Text>
                </View>
                
                <View style={[styles.indicator, { backgroundColor: insets.bottom > 0 ? '#4CAF50' : '#FF5722' }]}>
                  <Text style={styles.indicatorText}>
                    {insets.bottom > 0 ? '✓ Has Home Indicator' : '○ Physical Home Button'}
                  </Text>
                </View>
                
                <View style={[styles.indicator, { backgroundColor: (insets.left > 0 || insets.right > 0) ? '#4CAF50' : '#2196F3' }]}>
                  <Text style={styles.indicatorText}>
                    {(insets.left > 0 || insets.right > 0) ? '✓ Landscape/Rounded Corners' : '○ Portrait Mode'}
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        );
        
      case 'scroll':
        return (
          <SafeAreaView style={styles.testContainer} edges={[]}>
            <ScrollView 
              style={styles.testScroll}
              contentContainerStyle={{
                paddingTop: Math.max(insets.top, 20),
                paddingBottom: Math.max(insets.bottom, 20),
                paddingHorizontal: Math.max(insets.left, insets.right, 16)
              }}
              contentInsetAdjustmentBehavior="automatic"
            >
              <Text style={styles.testTitle}>ScrollView Test</Text>
              <Text style={styles.testSubtext}>Content should not be cut off</Text>
              
              {Array.from({ length: 20 }, (_, i) => (
                <View key={i} style={styles.scrollItem}>
                  <Text style={styles.scrollItemText}>Item {i + 1}</Text>
                  <Text style={styles.scrollItemSubtext}>
                    This content should be fully visible
                  </Text>
                </View>
              ))}
              
              <View style={styles.scrollFooter}>
                <Text style={styles.testInfo}>
                  Bottom padding: {Math.max(insets.bottom, 20)}px
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        );
        
      default:
        return (
          <View style={styles.testContent}>
            <Text style={styles.testTitle}>Selecciona un test</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.testerContainer}>
      {/* Botón flotante para activar tester */}
      <TouchableOpacity 
        style={styles.testerButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="bug" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal de testing */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Header del modal */}
          <View style={[styles.modalHeader, {
            paddingTop: Math.max(insets.top, 20),
            paddingHorizontal: Math.max(insets.left, insets.right, 16)
          }]}>
            <Text style={styles.modalTitle}>SafeArea Tester</Text>
            <TouchableOpacity 
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Selector de test */}
          <View style={styles.testSelector}>
            {Object.entries(TestScenarios).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.testButton,
                  testScenario === key && styles.testButtonActive
                ]}
                onPress={() => setTestScenario(key)}
              >
                <Text style={[
                  styles.testButtonText,
                  testScenario === key && styles.testButtonTextActive
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenido del test */}
          <View style={styles.testArea}>
            {renderTestContent()}
          </View>

          {/* Info adicional */}
          <View style={[styles.testFooter, {
            paddingBottom: Math.max(insets.bottom, 20),
            paddingHorizontal: Math.max(insets.left, insets.right, 16)
          }]}>
            <Text style={styles.footerText}>
              Device: {Platform.OS} {Platform.Version}
            </Text>
            <Text style={styles.footerText}>
              Screen: {width}x{height}
            </Text>
            <Text style={styles.footerText}>
              SafeArea: {insets.top}|{insets.right}|{insets.bottom}|{insets.left}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Checklist de validación automática
export function SafeAreaValidator() {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  const validations = [
    {
      name: 'SafeArea Provider',
      test: () => insets !== undefined,
      message: 'SafeAreaProvider está configurado'
    },
    {
      name: 'Top Inset',
      test: () => insets.top >= 0,
      message: `Top inset: ${insets.top}px`
    },
    {
      name: 'Bottom Inset', 
      test: () => insets.bottom >= 0,
      message: `Bottom inset: ${insets.bottom}px`
    },
    {
      name: 'Screen Dimensions',
      test: () => width > 0 && height > 0,
      message: `Screen: ${width}x${height}`
    },
    {
      name: 'Device Type Detection',
      test: () => {
        const hasNotch = insets.top > 20;
        const hasHomeIndicator = insets.bottom > 0;
        return hasNotch || hasHomeIndicator || Platform.OS === 'android';
      },
      message: 'Device characteristics detected'
    }
  ];

  if (!__DEV__) return null;

  return (
    <View style={styles.validatorContainer}>
      <Text style={styles.validatorTitle}>SafeArea Validation</Text>
      {validations.map((validation, index) => (
        <View key={index} style={styles.validationItem}>
          <Ionicons 
            name={validation.test() ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={validation.test() ? "#4CAF50" : "#FF5722"} 
          />
          <Text style={[
            styles.validationText,
            { color: validation.test() ? "#4CAF50" : "#FF5722" }
          ]}>
            {validation.name}: {validation.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Tester Button
  testerContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 9999,
  },
  testerButton: {
    backgroundColor: '#FF5722',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },

  // Test Selector
  testSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  testButtonActive: {
    backgroundColor: '#2196F3',
  },
  testButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  testButtonTextActive: {
    color: '#fff',
  },

  // Test Area
  testArea: {
    flex: 1,
  },
  testContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  testHeader: {
    backgroundColor: '#2196F3',
    paddingVertical: 20,
  },
  testHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  testSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  testContent: {
    flex: 1,
    padding: 20,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  testInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Indicators
  testIndicators: {
    marginTop: 20,
  },
  indicator: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Scroll Test
  testScroll: {
    flex: 1,
  },
  scrollItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrollItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  scrollItemSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollFooter: {
    padding: 20,
    alignItems: 'center',
  },

  // Footer
  testFooter: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Validator
  validatorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 15,
    zIndex: 9998,
  },
  validatorTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  validationText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
});
