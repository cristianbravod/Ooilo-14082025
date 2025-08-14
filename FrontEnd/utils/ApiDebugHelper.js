// utils/ApiDebugHelper.js - Herramienta de diagnóstico para la API
import ApiService from '../services/ApiService';

export class ApiDebugHelper {
  
  static async diagnosticarAPI() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE API ===');
    
    const resultados = {
      servidor: null,
      endpoints: {},
      recomendaciones: []
    };

    // 1. Verificar conectividad básica
    try {
      const healthCheck = await ApiService.healthCheckSimple();
      resultados.servidor = healthCheck;
      console.log('🏥 Health Check:', healthCheck.success ? '✅ OK' : '❌ FAIL');
    } catch (error) {
      resultados.servidor = { success: false, error: error.message };
      console.log('🏥 Health Check: ❌ FAIL -', error.message);
    }

    // 2. Probar endpoints uno por uno
    const endpointsAPrueba = [
      { nombre: 'Menu', url: '/menu', metodo: 'GET' },
      { nombre: 'Categorías', url: '/categorias', metodo: 'GET' },
      { nombre: 'Platos Especiales', url: '/platos-especiales', metodo: 'GET' },
      { nombre: 'Órdenes', url: '/ordenes', metodo: 'GET' },
      { nombre: 'Reportes Test', url: '/reports/test', metodo: 'GET' },
    ];

    for (const endpoint of endpointsAPrueba) {
      try {
        console.log(`🔍 Probando ${endpoint.nombre}...`);
        
        const response = await fetch(`${ApiService.getBaseUrl()}${endpoint.url}`, {
          method: endpoint.metodo,
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });

        if (response.ok) {
          const data = await response.json();
          resultados.endpoints[endpoint.nombre] = {
            status: '✅ Disponible',
            code: response.status,
            dataType: Array.isArray(data) ? `Array(${data.length})` : typeof data
          };
          console.log(`✅ ${endpoint.nombre}: OK (${response.status})`);
        } else {
          resultados.endpoints[endpoint.nombre] = {
            status: '❌ Error HTTP',
            code: response.status,
            error: response.statusText
          };
          console.log(`❌ ${endpoint.nombre}: ERROR ${response.status} - ${response.statusText}`);
        }
      } catch (error) {
        resultados.endpoints[endpoint.nombre] = {
          status: '❌ No disponible',
          error: error.message
        };
        console.log(`❌ ${endpoint.nombre}: NO DISPONIBLE - ${error.message}`);
      }
    }

    // 3. Generar recomendaciones
    if (!resultados.servidor?.success) {
      resultados.recomendaciones.push('🔴 CRÍTICO: Servidor no responde. Verificar conexión de red y URL del servidor.');
    }

    if (resultados.endpoints['Platos Especiales']?.status.includes('❌')) {
      resultados.recomendaciones.push('⚠️ IMPORTANTE: Endpoint /platos-especiales no disponible. Verificar implementación en el backend.');
    }

    if (resultados.endpoints['Menu']?.status.includes('❌')) {
      resultados.recomendaciones.push('🔴 CRÍTICO: Endpoint /menu no disponible. La aplicación no funcionará correctamente.');
    }

    // 4. Mostrar resumen
    console.log('\n📋 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log('🌐 URL del servidor:', ApiService.getBaseUrl());
    console.log('🏥 Estado del servidor:', resultados.servidor?.success ? '✅ Online' : '❌ Offline');
    
    console.log('\n📡 Estado de endpoints:');
    Object.entries(resultados.endpoints).forEach(([nombre, info]) => {
      console.log(`  ${info.status} ${nombre}`);
    });

    if (resultados.recomendaciones.length > 0) {
      console.log('\n💡 Recomendaciones:');
      resultados.recomendaciones.forEach(rec => console.log(`  ${rec}`));
    }

    return resultados;
  }

  // Función específica para probar platos especiales
  static async probarPlatosEspeciales() {
    console.log('⭐ === DIAGNÓSTICO ESPECÍFICO: PLATOS ESPECIALES ===');
    
    const pruebas = {
      get: null,
      post: null,
      endpoints_alternativos: []
    };

    // Probar GET /platos-especiales
    try {
      console.log('🔍 Probando GET /platos-especiales...');
      const response = await ApiService.getPlatosEspeciales();
      pruebas.get = {
        status: '✅ Funciona',
        data: Array.isArray(response) ? `Array con ${response.length} items` : typeof response,
        response: response
      };
      console.log('✅ GET /platos-especiales: OK');
    } catch (error) {
      pruebas.get = {
        status: '❌ Error',
        error: error.message
      };
      console.log('❌ GET /platos-especiales: ERROR -', error.message);
    }

    // Si falla, probar endpoints alternativos
    if (pruebas.get?.status.includes('❌')) {
      const endpointsAlternativos = [
        '/menu/especiales',
        '/especiales',
        '/platos/especiales',
        '/menu?categoria=especiales'
      ];

      for (const endpoint of endpointsAlternativos) {
        try {
          console.log(`🔍 Probando endpoint alternativo: ${endpoint}...`);
          const response = await fetch(`${ApiService.getBaseUrl()}${endpoint}`);
          if (response.ok) {
            const data = await response.json();
            pruebas.endpoints_alternativos.push({
              endpoint,
              status: '✅ Disponible',
              data: Array.isArray(data) ? `Array(${data.length})` : typeof data
            });
            console.log(`✅ ${endpoint}: Disponible`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint}: No disponible`);
        }
      }
    }

    return pruebas;
  }

  // Función para crear datos de prueba
  static async crearDatosDePrueba() {
    console.log('🧪 === CREANDO DATOS DE PRUEBA ===');
    
    const datosPrueba = {
      nombre: "Plato Especial de Prueba",
      precio: 15000,
      descripcion: "Plato creado automáticamente para pruebas",
      disponible: true,
      vegetariano: false,
      picante: false,
      tiempo_preparacion: 30,
      imagen_url: "https://via.placeholder.com/300x200?text=Plato+Especial"
    };

    try {
      console.log('📝 Intentando crear plato especial de prueba...');
      const response = await ApiService.createPlatoEspecial(datosPrueba);
      console.log('✅ Plato especial de prueba creado:', response);
      return { success: true, data: response };
    } catch (error) {
      console.log('❌ Error creando plato especial de prueba:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Función para verificar estructura de datos
  static verificarEstructuraDatos(platosEspeciales) {
    console.log('🔍 === VERIFICANDO ESTRUCTURA DE DATOS ===');
    
    if (!Array.isArray(platosEspeciales)) {
      console.log('❌ Los datos no son un array');
      return false;
    }

    if (platosEspeciales.length === 0) {
      console.log('⚠️ Array vacío - no hay platos especiales');
      return true;
    }

    const primerPlato = platosEspeciales[0];
    const camposEsperados = ['id', 'nombre', 'precio', 'descripcion', 'disponible'];
    const camposOpcionales = ['vegetariano', 'picante', 'tiempo_preparacion', 'imagen_url', 'fecha_fin'];
    
    console.log('📋 Estructura del primer plato:', primerPlato);
    
    const camposFaltantes = camposEsperados.filter(campo => !(campo in primerPlato));
    if (camposFaltantes.length > 0) {
      console.log('❌ Campos faltantes:', camposFaltantes);
      return false;
    }

    const camposOpcionalesPresentes = camposOpcionales.filter(campo => campo in primerPlato);
    console.log('✅ Campos opcionales presentes:', camposOpcionalesPresentes);

    console.log('✅ Estructura de datos válida');
    return true;
  }

  // Función completa de diagnóstico y solución
  static async diagnosticarYSolucionar() {
    console.log('🚀 === DIAGNÓSTICO COMPLETO Y SOLUCIONES ===');
    
    const resultados = {
      diagnostico: null,
      solucionesAplicadas: [],
      recomendacionesFinales: []
    };

    // 1. Diagnóstico básico
    resultados.diagnostico = await this.diagnosticarAPI();

    // 2. Si el servidor está online pero faltan endpoints
    if (resultados.diagnostico.servidor?.success) {
      // Probar platos especiales específicamente
      const pruebaEspeciales = await this.probarPlatosEspeciales();
      
      if (pruebaEspeciales.get?.status.includes('❌')) {
        resultados.recomendacionesFinales.push(
          '🔧 SOLUCIÓN: El endpoint /platos-especiales no existe. Opciones:'
        );
        resultados.recomendacionesFinales.push(
          '   1. Implementar endpoint en el backend'
        );
        resultados.recomendacionesFinales.push(
          '   2. Usar endpoint alternativo si existe'
        );
        resultados.recomendacionesFinales.push(
          '   3. Deshabilitar funcionalidad temporalmente'
        );

        // Verificar endpoints alternativos
        if (pruebaEspeciales.endpoints_alternativos.length > 0) {
          resultados.recomendacionesFinales.push(
            `✅ Endpoints alternativos encontrados: ${pruebaEspeciales.endpoints_alternativos.map(e => e.endpoint).join(', ')}`
          );
        }
      }
    } else {
      resultados.recomendacionesFinales.push(
        '🔴 PROBLEMA CRÍTICO: Servidor no accesible. Verificar:'
      );
      resultados.recomendacionesFinales.push(
        '   1. Conexión a internet'
      );
      resultados.recomendacionesFinales.push(
        '   2. URL del servidor (actualmente: ' + ApiService.getBaseUrl() + ')'
      );
      resultados.recomendacionesFinales.push(
        '   3. Estado del servidor backend'
      );
    }

    // 3. Mostrar resultados finales
    console.log('\n🎯 === RESULTADOS FINALES ===');
    resultados.recomendacionesFinales.forEach(rec => console.log(rec));

    return resultados;
  }
}

// Función helper rápida para usar en componentes
export async function debugApiRapido() {
  console.log('⚡ Diagnóstico rápido de API...');
  
  try {
    const health = await ApiService.healthCheckSimple();
    const platosTest = await ApiService.getPlatosEspeciales();
    
    console.log('✅ Resultado:', {
      servidor: health.success ? 'OK' : 'FAIL',
      platosEspeciales: Array.isArray(platosTest) ? `${platosTest.length} items` : 'ERROR'
    });
    
    return {
      servidorOK: health.success,
      platosEspecialesOK: Array.isArray(platosTest),
      datosPlatos: platosTest
    };
    
  } catch (error) {
    console.log('❌ Error en diagnóstico rápido:', error.message);
    return {
      servidorOK: false,
      platosEspecialesOK: false,
      error: error.message
    };
  }
}

// Exportar por defecto para uso fácil
export default ApiDebugHelper;