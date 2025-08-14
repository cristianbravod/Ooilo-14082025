<?php
// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ==========================================

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_NAME', 'nombre_base_datos');
define('DB_USER', 'usuario');
define('DB_PASS', 'contraseña');
define('DB_CHARSET', 'utf8mb4');

// ==========================================
// CONFIGURACIÓN DEL RESTAURANTE
// ==========================================

define('RESTAURANT_NAME', 'Ooilo Taqueria');
define('RESTAURANT_PHONE', '+56987654321');
define('RESTAURANT_ADDRESS', 'Av. Alemania 1234, Temuco, Chile');
define('RESTAURANT_HOURS', 'Vier: 17:00 - 20:00');
define('RESTAURANT_HOURS', 'Sab-Dom: 13:00 - 20:00');

// ==========================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ==========================================

// Configuración de CORS
define('CORS_ALLOWED_ORIGINS', '*');
define('CORS_ALLOWED_METHODS', 'GET, POST, PUT, DELETE, OPTIONS');
define('CORS_ALLOWED_HEADERS', 'Content-Type, Authorization, X-Requested-With');

// Configuración de cache
define('CACHE_ENABLED', true);
define('CACHE_DURATION', 300); // 5 minutos en segundos

// Configuración de logs
define('LOG_ENABLED', true);
define('LOG_FILE', 'logs/menu_app.log');

// Configuración de imágenes
define('IMAGE_UPLOAD_PATH', 'uploads/');
define('IMAGE_MAX_SIZE', 2097152); // 2MB
define('IMAGE_ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// ==========================================
// CONFIGURACIÓN DE DESARROLLO
// ==========================================

// Mostrar errores en desarrollo
if (in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1'])) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    define('DEBUG_MODE', true);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    define('DEBUG_MODE', false);
}

// ==========================================
// CLASE DE CONEXIÓN A BASE DE DATOS
// ==========================================

class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            if (DEBUG_MODE) {
                error_log("✅ Conexión a base de datos establecida");
            }
        } catch (PDOException $e) {
            error_log("❌ Error de conexión a base de datos: " . $e->getMessage());
            throw new Exception("Error de conexión a base de datos");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Configura las cabeceras CORS
 */
function setupCORS() {
    header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGINS);
    header('Access-Control-Allow-Methods: ' . CORS_ALLOWED_METHODS);
    header('Access-Control-Allow-Headers: ' . CORS_ALLOWED_HEADERS);
    header('Access-Control-Max-Age: 86400'); // 24 horas
    
    // Manejar peticiones OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

/**
 * Registra un mensaje en el log
 */
function logMessage($message, $level = 'INFO') {
    if (!LOG_ENABLED) return;
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    $logDir = dirname(LOG_FILE);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Envía una respuesta JSON
 */
function sendJSONResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Envía una respuesta de error
 */
function sendErrorResponse($message, $statusCode = 400) {
    logMessage("Error: $message", 'ERROR');
    sendJSONResponse([
        'success' => false,
        'error' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], $statusCode);
}

/**
 * Valida que un producto esté disponible (sin borrado lógico)
 */
function isProductValid($product) {
    // Solo verificar disponibilidad (no vigencia)
    $disponible = isset($product['disponible']) && 
                  ($product['disponible'] === true || 
                   $product['disponible'] === 1 || 
                   $product['disponible'] === '1' || 
                   $product['disponible'] === 'true');
    
    return $disponible;
}

/**
 * Filtra productos por disponibilidad
 */
function filterValidProducts($products) {
    if (!is_array($products)) {
        return [];
    }
    
    $validProducts = array_filter($products, 'isProductValid');
    
    if (DEBUG_MODE) {
        $totalCount = count($products);
        $validCount = count($validProducts);
        $filteredCount = $totalCount - $validCount;
        
        logMessage("Productos filtrados: $filteredCount de $totalCount eliminados (disponible=false)");
    }
    
    return array_values($validProducts); // Reindexar array
}

/**
 * Obtiene información del restaurante
 */
function getRestaurantInfo() {
    return [
        'nombre' => RESTAURANT_NAME,
        'telefono' => RESTAURANT_PHONE,
        'direccion' => RESTAURANT_ADDRESS,
        'horarios' => RESTAURANT_HOURS
    ];
}

/**
 * Verifica si el cache está disponible y válido
 */
function getCacheData($cacheKey) {
    if (!CACHE_ENABLED) return null;
    
    $cacheFile = "cache/{$cacheKey}.json";
    
    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        
        if ($cacheData && isset($cacheData['timestamp'])) {
            $age = time() - $cacheData['timestamp'];
            
            if ($age < CACHE_DURATION) {
                if (DEBUG_MODE) {
                    logMessage("Cache hit para: $cacheKey (edad: {$age}s)");
                }
                return $cacheData['data'];
            }
        }
    }
    
    return null;
}

/**
 * Guarda datos en cache
 */
function setCacheData($cacheKey, $data) {
    if (!CACHE_ENABLED) return;
    
    $cacheDir = 'cache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    
    $cacheFile = "$cacheDir/{$cacheKey}.json";
    $cacheData = [
        'timestamp' => time(),
        'data' => $data
    ];
    
    file_put_contents($cacheFile, json_encode($cacheData));
    
    if (DEBUG_MODE) {
        logMessage("Cache guardado para: $cacheKey");
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Configurar CORS para todas las respuestas
setupCORS();

// Log de inicialización
if (DEBUG_MODE) {
    logMessage("🍽️ Aplicación de menú iniciada - " . RESTAURANT_NAME);
}
?>