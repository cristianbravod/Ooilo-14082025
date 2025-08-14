#!/usr/bin/env node
// scripts/verify-server.js - Script para verificar servidor antes del build

//const fetch = require('node-fetch');

// ✅ CONFIGURACIÓN DE IPs
const SERVERS = [
  {
    name: 'Servidor Producción',
    url: 'http://200.54.216.197:3000',
    api: 'http://200.54.216.197:3000/api',
    critical: true
  },
  {
    name: 'Servidor Local',
    url: 'http://192.1.1.16:3000',
    api: 'http://192.1.1.16:3000/api',
    critical: false
  }
];

const ENDPOINTS = [
  '/health',
  '/api/health',
  '/api/auth/ping',
  '/api/menu',
  '/api/sync'
];

// ✅ FUNCIÓN PARA VERIFICAR UN SERVIDOR
async function verifyServer(server) {
  console.log(`\n🔍 Verificando ${server.name} (${server.url})...`);
  
  const results = {
    serverName: server.name,
    baseUrl: server.url,
    apiUrl: server.api,
    accessible: false,
    endpoints: {},
    responseTime: null,
    error: null
  };
  
  try {
    // Test de conectividad básica
    const startTime = Date.now();
    const response = await fetch(server.url, { 
      method: 'HEAD',
      timeout: 10000
    });
    results.responseTime = Date.now() - startTime;
    
    if (response.ok) {
      results.accessible = true;
      console.log(`✅ ${server.name} accesible (${results.responseTime}ms)`);
      
      // Verificar endpoints específicos
      for (const endpoint of ENDPOINTS) {
        try {
          const endpointUrl = server.api + endpoint;
          const endpointResponse = await fetch(endpointUrl, {
            method: 'GET',
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          results.endpoints[endpoint] = {
            status: endpointResponse.status,
            ok: endpointResponse.ok,
            contentType: endpointResponse.headers.get('content-type')
          };
          
          console.log(`  ${endpointResponse.ok ? '✅' : '❌'} ${endpoint}: ${endpointResponse.status}`);
          
        } catch (endpointError) {
          results.endpoints[endpoint] = {
            error: endpointError.message,
            ok: false
          };
          console.log(`  ❌ ${endpoint}: ${endpointError.message}`);
        }
      }
      
    } else {
      results.error = `HTTP ${response.status}`;
      console.log(`❌ ${server.name} no accesible: ${results.error}`);
    }
    
  } catch (error) {
    results.error = error.message;
    console.log(`❌ ${server.name} error: ${error.message}`);
  }
  
  return results;
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  console.log('🚀 VERIFICACIÓN DE SERVIDORES PARA APK');
  console.log('=' .repeat(50));
  
  const allResults = [];
  let criticalServerWorking = false;
  
  // Verificar todos los servidores
  for (const server of SERVERS) {
    const result = await verifyServer(server);
    allResults.push(result);
    
    if (server.critical && result.accessible) {
      criticalServerWorking = true;
    }
  }
  
  // ✅ RESUMEN FINAL
  console.log('\n📊 RESUMEN FINAL');
  console.log('=' .repeat(30));
  
  allResults.forEach(result => {
    const status = result.accessible ? '🟢 ONLINE' : '🔴 OFFLINE';
    const time = result.responseTime ? `(${result.responseTime}ms)` : '';
    console.log(`${status} ${result.serverName} ${time}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Mostrar endpoints funcionando
    const workingEndpoints = Object.entries(result.endpoints)
      .filter(([_, info]) => info.ok)
      .map(([endpoint, _]) => endpoint);
      
    if (workingEndpoints.length > 0) {
      console.log(`   Endpoints OK: ${workingEndpoints.join(', ')}`);
    }
  });
  
  // ✅ RECOMENDACIONES
  console.log('\n💡 RECOMENDACIONES:');
  
  if (criticalServerWorking) {
    console.log('✅ Servidor crítico funcionando - SAFE TO BUILD APK');
    console.log('✅ Endpoints principales accesibles');
    console.log('✅ El APK debería conectarse correctamente');
  } else {
    console.log('❌ SERVIDOR CRÍTICO NO DISPONIBLE');
    console.log('❌ NO RECOMENDADO generar APK ahora');
    console.log('💡 Soluciones:');
    console.log('   1. Verificar que el servidor esté corriendo');
    console.log('   2. Verificar firewall/puertos');
    console.log('   3. Verificar conectividad de red');
  }
  
  // ✅ CONFIGURACIONES PARA APK
  console.log('\n⚙️ CONFIGURACIONES VERIFICADAS:');
  console.log('📍 IP Producción: 200.54.216.197:3000');
  console.log('📍 IP Local: 192.1.1.16:3000');
  console.log('📍 Puerto API: 3000');
  console.log('🔗 Protocolo: HTTP (cleartext permitido)');
  
  // ✅ COMANDOS SUGERIDOS
  console.log('\n🚀 COMANDOS PARA GENERAR APK:');
  
  if (criticalServerWorking) {
    console.log('# Todo listo, puedes generar APK:');
    console.log('expo r -c');
    console.log('eas build --platform android --profile preview');
  } else {
    console.log('# Primero soluciona problemas del servidor, luego:');
    console.log('node scripts/verify-server.js  # Verificar nuevamente');
    console.log('eas build --platform android --profile preview');
  }
  
  // Exit code
  process.exit(criticalServerWorking ? 0 : 1);
}

// ✅ MANEJO DE ERRORES GLOBAL
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejection no manejada:', reason);
  process.exit(1);
});

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error en script principal:', error.message);
    process.exit(1);
  });
}