<?php
require_once '../config.php';

// ==========================================
// CLASE PARA MANEJO DEL MENÚ
// ==========================================

class MenuAPI {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Obtiene el menú completo con filtro de vigencia
     */
    public function getMenuCompleto() {
        $cacheKey = 'menu_completo';
        $cachedData = getCacheData($cacheKey);
        
        if ($cachedData !== null) {
            return $cachedData;
        }
        
        try {
            // Query que une menu_items y platos especiales con filtro de disponibilidad
            $sql = "
                SELECT 
                    mi.id,
                    mi.nombre,
                    mi.descripcion,
                    mi.precio,
                    mi.disponible,
                    mi.vegetariano,
                    mi.picante,
                    mi.ingredientes,
                    mi.tiempo_preparacion,
                    mi.imagen,
                    c.nombre as categoria_nombre,
                    false as es_especial
                FROM menu_items mi
                INNER JOIN categorias c ON mi.categoria_id = c.id
                WHERE c.activo = true
                
                UNION ALL
                
                SELECT 
                    pe.id,
                    pe.nombre,
                    pe.descripcion,
                    pe.precio,
                    pe.disponible,
                    pe.vegetariano,
                    pe.picante,
                    pe.ingredientes,
                    pe.tiempo_preparacion,
                    pe.imagen,
                    'Platos Especiales' as categoria_nombre,
                    true as es_especial
                FROM platos_especiales pe
                WHERE pe.disponible = true
                AND   pe.vigente = true
                ORDER BY categoria_nombre, nombre
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $productos = $stmt->fetchAll();
            
            // Aplicar filtro adicional de vigencia y disponibilidad
            $productosValidos = filterValidProducts($productos);
            
            // Convertir tipos de datos para JavaScript
            foreach ($productosValidos as &$producto) {
                $producto['precio'] = (float) $producto['precio'];
                $producto['disponible'] = (bool) $producto['disponible'];
                $producto['vigente'] = (bool) $producto['vigente'];
                $producto['vegetariano'] = (bool) $producto['vegetariano'];
                $producto['picante'] = (bool) $producto['picante'];
                $producto['es_especial'] = (bool) $producto['es_especial'];
            }
            
            setCacheData($cacheKey, $productosValidos);
            logMessage("Menú completo obtenido: " . count($productosValidos) . " productos válidos");
            
            return $productosValidos;
            
        } catch (Exception $e) {
            logMessage("Error obteniendo menú completo: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene el menú agrupado por categorías
     */
    public function getMenuPorCategorias() {
        $cacheKey = 'menu_categorias';
        $cachedData = getCacheData($cacheKey);
        
        if ($cachedData !== null) {
            return $cachedData;
        }
        
        try {
            // Obtener productos normales por categoría
            $sqlCategorias = "
                SELECT 
                    c.id,
                    c.nombre,
                    c.descripcion,
                    c.activo
                FROM categorias c
                WHERE c.activo = 1
                ORDER BY c.nombre
            ";
            
            $stmt = $this->db->prepare($sqlCategorias);
            $stmt->execute();
            $categorias = $stmt->fetchAll();
            
            $menuPorCategorias = [];
            
            foreach ($categorias as $categoria) {
                // Obtener productos de cada categoría (solo disponibles)
                $sqlProductos = "
                    SELECT 
                        mi.id,
                        mi.nombre,
                        mi.descripcion,
                        mi.precio,
                        mi.disponible,
                        mi.vegetariano,
                        mi.picante,
                        mi.ingredientes,
                        mi.tiempo_preparacion,
                        mi.imagen,
                        ? as categoria_nombre,
                        false as es_especial
                    FROM menu_item mi
                    WHERE mi.categoria_id = ?
                    ORDER BY mi.nombre
                ";
                
                $stmtProductos = $this->db->prepare($sqlProductos);
                $stmtProductos->execute([$categoria['nombre'], $categoria['id']]);
                $productos = $stmtProductos->fetchAll();
                
                // Filtrar productos válidos
                $productosValidos = filterValidProducts($productos);
                
                // Convertir tipos de datos
                foreach ($productosValidos as &$producto) {
                    $producto['precio'] = (float) $producto['precio'];
                    $producto['disponible'] = (bool) $producto['disponible'];
                    $producto['vigente'] = (bool) $producto['vigente'];
                    $producto['vegetariano'] = (bool) $producto['vegetariano'];
                    $producto['picante'] = (bool) $producto['picante'];
                    $producto['es_especial'] = (bool) $producto['es_especial'];
                }
                
                if (count($productosValidos) > 0) {
                    $menuPorCategorias[] = [
                        'id' => $categoria['id'],
                        'nombre' => $categoria['nombre'],
                        'descripcion' => $categoria['descripcion'],
                        'activo' => (bool) $categoria['activo'],
                        'items' => $productosValidos
                    ];
                }
            }
            
            setCacheData($cacheKey, $menuPorCategorias);
            logMessage("Menú por categorías obtenido: " . count($menuPorCategorias) . " categorías");
            
            return $menuPorCategorias;
            
        } catch (Exception $e) {
            logMessage("Error obteniendo menú por categorías: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene solo los platos especiales
     */
    public function getPlatosEspeciales() {
        $cacheKey = 'platos_especiales';
        $cachedData = getCacheData($cacheKey);
        
        if ($cachedData !== null) {
            return $cachedData;
        }
        
        try {
            $sql = "
                SELECT 
                    pe.id,
                    pe.nombre,
                    pe.descripcion,
                    pe.precio,
                    pe.disponible,
                    pe.vegetariano,
                    pe.picante,
                    pe.ingredientes,
                    pe.tiempo_preparacion,
                    pe.imagen,
                    pe.fecha_inicio,
                    pe.fecha_fin,
                    'Platos Especiales' as categoria_nombre,
                    true as es_especial
                FROM platos_especiales pe
				WHERE pe.vigente = true
                ORDER BY pe.nombre
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $platosEspeciales = $stmt->fetchAll();
            
            // Filtrar productos válidos
            $platosValidos = filterValidProducts($platosEspeciales);
            
            // Convertir tipos de datos
            foreach ($platosValidos as &$plato) {
                $plato['precio'] = (float) $plato['precio'];
                $plato['disponible'] = (bool) $plato['disponible'];
                $plato['vigente'] = (bool) $plato['vigente'];
                $plato['vegetariano'] = (bool) $plato['vegetariano'];
                $plato['picante'] = (bool) $plato['picante'];
                $plato['es_especial'] = (bool) $plato['es_especial'];
            }
            
            setCacheData($cacheKey, $platosValidos);
            logMessage("Platos especiales obtenidos: " . count($platosValidos) . " platos válidos");
            
            return $platosValidos;
            
        } catch (Exception $e) {
            logMessage("Error obteniendo platos especiales: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Obtiene el menú público completo (formato web)
     */
    public function getMenuPublico() {
        try {
            $categorias = $this->getMenuPorCategorias();
            $platosEspeciales = $this->getPlatosEspeciales();
            $restaurante = getRestaurantInfo();
            
            $menuPublico = [
                'success' => true,
                'timestamp' => date('Y-m-d H:i:s'),
                'categorias' => $categorias,
                'platos_especiales' => $platosEspeciales,
                'restaurante' => $restaurante,
                'stats' => [
                    'total_categorias' => count($categorias),
                    'total_platos_especiales' => count($platosEspeciales),
                    'total_productos' => array_sum(array_map(function($cat) {
                        return count($cat['items']);
                    }, $categorias)) + count($platosEspeciales)
                ]
            ];
            
            logMessage("Menú público generado exitosamente");
            return $menuPublico;
            
        } catch (Exception $e) {
            logMessage("Error generando menú público: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * Limpia el cache del menú
     */
    public function limpiarCache() {
        $cacheFiles = [
            'cache/menu_completo.json',
            'cache/menu_categorias.json',
            'cache/platos_especiales.json'
        ];
        
        foreach ($cacheFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
        
        logMessage("Cache del menú limpiado");
    }
}

// ==========================================
// MANEJO DE PETICIONES
// ==========================================

try {
    $menuAPI = new MenuAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    $requestUri = $_SERVER['REQUEST_URI'];
    
    // Extraer la ruta después de /api/
    $path = parse_url($requestUri, PHP_URL_PATH);
    $pathParts = explode('/', trim($path, '/'));
    
    // Determinar el endpoint solicitado
    if (isset($pathParts[1])) {
        $endpoint = $pathParts[1];
    } else {
        $endpoint = 'menu';
    }
    
    logMessage("Petición recibida: $method $endpoint");
    
    switch ($method) {
        case 'GET':
            switch ($endpoint) {
                case 'menu':
                    // Endpoint principal: /api/menu
                    $menuCompleto = $menuAPI->getMenuCompleto();
                    sendJSONResponse($menuCompleto);
                    break;
                
                case 'menu-publico':
                    // Endpoint web: /api/menu-publico
                    $menuPublico = $menuAPI->getMenuPublico();
                    sendJSONResponse($menuPublico);
                    break;
                
                case 'platos-especiales':
                    // Endpoint especiales: /api/platos-especiales
                    $platosEspeciales = $menuAPI->getPlatosEspeciales();
                    sendJSONResponse($platosEspeciales);
                    break;
                
                case 'categorias':
                    // Endpoint categorías: /api/categorias
                    $categorias = $menuAPI->getMenuPorCategorias();
                    sendJSONResponse($categorias);
                    break;
                
                default:
                    sendErrorResponse('Endpoint no encontrado: ' . $endpoint, 404);
                    break;
            }
            break;
        
        case 'POST':
            switch ($endpoint) {
                case 'limpiar-cache':
                    // Endpoint para limpiar cache: POST /api/limpiar-cache
                    $menuAPI->limpiarCache();
                    sendJSONResponse([
                        'success' => true,
                        'message' => 'Cache limpiado exitosamente',
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                    break;
                
                default:
                    sendErrorResponse('Endpoint POST no encontrado: ' . $endpoint, 404);
                    break;
            }
            break;
        
        default:
            sendErrorResponse('Método no permitido: ' . $method, 405);
            break;
    }
    
} catch (Exception $e) {
    logMessage("Error en API: " . $e->getMessage(), 'ERROR');
    sendErrorResponse('Error interno del servidor: ' . $e->getMessage(), 500);
}
?>