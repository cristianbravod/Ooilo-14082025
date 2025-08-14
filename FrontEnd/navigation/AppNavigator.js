// navigation/AppNavigator.js - VERSIÓN CORREGIDA COMPLETA
import React from 'react';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import GestionMesas from '../screens/GestionMesas';

// ✅ IMPORTACIONES SEGURAS DE SAFE AREA
let useSafeAreaInsets;
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible, usando fallback');
  useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
}

// ✅ IMPORTACIONES DE COMPONENTES
import Pedidos from "../components/Pedidos";
import Carta from "../components/Carta";
import PlatoEspecial from "../components/PlatoEspecial";
import Informes from "../components/Informes";
import GeneradorQR from "../components/GeneradorQR";

const Tab = createBottomTabNavigator();

export default function AppNavigator({
  menu,
  setMenu,
  pedidos,
  setPedidos,
  platosEspeciales,
  setPlatosEspeciales,
  ventas,
  setVentas,
  nuevoProducto,
  setNuevoProducto,
  modoEdicion,
  setModoEdicion,
  categorias,
  setCategorias
}) {
  // ✅ USO SEGURO DE SAFE AREA INSETS
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    if (useSafeAreaInsets) {
      insets = useSafeAreaInsets();
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets en Navigator');
  }

  // ✅ VALIDAR QUE INSETS SON NÚMEROS
  const safeInsets = {
    top: typeof insets.top === 'number' ? insets.top : 0,
    bottom: typeof insets.bottom === 'number' ? insets.bottom : 0,
    left: typeof insets.left === 'number' ? insets.left : 0,
    right: typeof insets.right === 'number' ? insets.right : 0,
  };

  // ✅ CONFIGURACIÓN DINÁMICA DE TAB BAR CON VALIDACIÓN
  const getTabBarStyle = () => {
    const isSmallDevice = Platform.OS === 'android' && Platform.Version < 29;
    
    return {
      backgroundColor: '#fff',
      borderTopColor: '#e1e8ed',
      borderTopWidth: 1,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      height: Platform.select({
        ios: isSmallDevice ? 70 : 80,
        android: isSmallDevice ? 55 : 60,
      }),
      paddingBottom: Platform.select({
        ios: Math.max(safeInsets.bottom, 5), // ✅ VALIDADO: Solo números
        android: 5,
      }),
      paddingTop: 5,
    };
  };

  // ✅ FUNCIÓN PARA MANEJO SEGURO DE ICONOS
  const getTabBarIcon = (route, focused, color, size) => {
    // ✅ VALIDAR QUE size ES SIEMPRE UN NÚMERO
    const iconSize = typeof size === 'number' && size > 0 ? size : 24;
    
    // ✅ MAPA DE ICONOS (SOLO STRINGS VÁLIDOS)
    const iconMap = {
      Pedidos: focused ? 'restaurant' : 'restaurant-outline',
      Menu: focused ? 'book' : 'book-outline',
      Especiales: focused ? 'star' : 'star-outline',
      Informes: focused ? 'bar-chart' : 'bar-chart-outline',
      QR: focused ? 'qr-code' : 'qr-code-outline',
    };

    const iconName = iconMap[route.name];
    
    // ✅ VALIDACIÓN ADICIONAL DEL ICONO
    if (!iconName) {
      console.warn(`⚠️ Icono no encontrado para la ruta: ${route.name}`);
      return <Ionicons name="alert-circle-outline" size={iconSize} color={color} />;
    }

    return <Ionicons name={iconName} size={iconSize} color={color} />;
  };

  return (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Pedidos: focused ? 'restaurant' : 'restaurant-outline',
            Menu: focused ? 'book' : 'book-outline',
            Especiales: focused ? 'star' : 'star-outline',
            Mesas: focused ? 'grid' : 'grid-outline',  // ✅ NUEVA PESTAÑA
            Informes: focused ? 'bar-chart' : 'bar-chart-outline',
            QR: focused ? 'qr-code' : 'qr-code-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: getTabBarStyle(),
        tabBarLabelStyle: {
          fontSize: 11,  // ✅ Reducir tamaño para acomodar más pestañas
          fontWeight: '500',
        },
        tabBarHideOnKeyboard: Platform.OS === 'android',
      })}
      initialRouteName="Pedidos"
    >
      <Tab.Screen 
        name="Pedidos"
        options={{
          title: 'Pedidos',
          tabBarBadge: pedidos?.length > 0 ? pedidos.length : undefined,
        }}
      >
        {(props) => (
          <Pedidos
            {...props}
            menu={menu}
            pedidos={pedidos}
            setPedidos={setPedidos}
            platosEspeciales={platosEspeciales}
            ventas={ventas}
            setVentas={setVentas}
          />
        )}
      </Tab.Screen>

      <Tab.Screen 
        name="Menu"
        options={{
          title: 'Menú',
          tabBarBadge: menu?.length > 0 ? menu.length : undefined,
        }}
      >
        {(props) => (
          <Carta
            {...props}
            menu={menu}
            setMenu={setMenu}
            nuevoProducto={nuevoProducto}
            setNuevoProducto={setNuevoProducto}
            modoEdicion={modoEdicion}
            setModoEdicion={setModoEdicion}
            categorias={categorias}
            setCategorias={setCategorias}
          />
        )}
      </Tab.Screen>

      <Tab.Screen 
        name="Especiales"
        options={{
          title: 'Especiales',
          tabBarBadge: platosEspeciales?.length > 0 ? platosEspeciales.length : undefined,
        }}
      >
        {(props) => (
          <PlatoEspecial
            {...props}
            platosEspeciales={platosEspeciales}
            setPlatosEspeciales={setPlatosEspeciales}
          />
        )}
      </Tab.Screen>

      {/* ✅ NUEVA PESTAÑA DE GESTIÓN DE MESAS */}
      <Tab.Screen 
        name="Mesas"
        component={GestionMesas}
        options={{
          title: 'Mesas',
        }}
      />

      <Tab.Screen 
        name="Informes"
        options={{
          title: 'Informes',
        }}
      >
        {(props) => <Informes {...props} ventas={ventas} />}
      </Tab.Screen>

      <Tab.Screen 
        name="QR" 
        component={GeneradorQR}
        options={{
          title: 'Código QR',
        }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

}