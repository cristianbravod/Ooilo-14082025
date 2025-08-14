// config/database.js - Configuración de base de datos PostgreSQL
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'postgres.ugcrigkvfejqlsoqnxxh',
  host: process.env.DB_HOST || 'aws-0-us-east-2.pooler.supabase.com',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 6543,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false,
  // Manejo de errores y timeouts
  statement_timeout: 30000,   // timeout de consultas: 30s
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 30000
};

console.log('🔧 Configuración de base de datos cargada:', {
  host: config.host,
  database: config.database,
  user: config.user,
  port: config.port,
  ssl: !!config.ssl
});

module.exports = config;