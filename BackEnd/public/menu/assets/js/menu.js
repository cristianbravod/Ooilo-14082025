// ==========================================
// RENDERIZADO DINÁMICO DEL MENÚ
// ==========================================

function renderMenuDinamico(menuItems) {
    const container = document.getElementById('menu-container');
    
    if (!Array.isArray(menuItems) || menuItems.length === 0) {
        container.innerHTML = '<p class="p-4 text-center text-[#80726b]">No hay productos disponibles en este momento.</p>';
        return;
    }
    
    console.log('🔄 Renderizando menú dinámico con ' + menuItems.length + ' productos...');
    
    // ✅ CORRECCIÓN: Usar las funciones definidas correctamente
    const productosValidos = menuItems.filter(function(item) {
        const esValido = esProductoMostrable(item);
        
        if (!esValido) {
            console.log('⚠️ Producto excluido:', item.nombre, {
                vigente: esProductoVigente(item),
                disponible: esProductoDisponible(item)
            });
        }
        
        return esValido;
    });
    
    console.log('✅ Productos válidos después del filtro: ' + productosValidos.length);
    
    // Si no hay productos válidos, mostrar mensaje
    if (productosValidos.length === 0) {
        container.innerHTML = '<div class="p-8 text-center">' +
            '<div class="text-6xl mb-4">🍽️</div>' +
            '<h3 class="text-xl font-bold text-[#161413] mb-2">No hay productos disponibles</h3>' +
            '<p class="text-[#80726b]">Estamos actualizando nuestro menú. Por favor, vuelve pronto.</p>' +
            '</div>';
        return;
    }
    
    // Agrupar productos por categoría
    const categorias = {};
    productosValidos.forEach(function(item) {
        const categoria = (item.categoria_nombre || item.categoria || 'Sin Categoría').trim();
        
        if (!categorias[categoria]) {
            categorias[categoria] = {
                nombre: categoria,
                items: [],
                activa: true
            };
        }
        
        categorias[categoria].items.push(item);
    });
    
    // Filtrar categorías que tienen al menos un producto
    const categoriasConProductos = Object.values(categorias).filter(function(cat) {
        return cat.items.length > 0;
    });
    
    console.log('📁 Categorías con productos: ' + categoriasConProductos.map(function(cat) {
        return cat.nombre + ' (' + cat.items.length + ' items)';
    }).join(', '));
    
    // Ordenar categorías alfabéticamente
    categoriasConProductos.sort(function(a, b) {
        return a.nombre.localeCompare(b.nombre);
    });
    
    // Mapeo de emojis por categoría
    const emojiMap = {
        'Entradas': '🥗',
        'Platos Principales': '🍽️',
        'Tacos': '🌮',
        'Pizzas': '🍕',
        'Postres': '🍰',
        'Bebidas': '🥤',
        'Bebidas Calientes': '☕',
        'Bebidas Frías': '🥤',
        'Ensaladas': '🥗',
        'Carnes': '🥩',
        'Pescados': '🐟',
        'Vegetariano': '🌱',
        'Vegano': '🌿',
        'Comida': '🍴',
        'Especiales': '⭐',
        'Sin Categoría': '📦'
    };
    
    let categoriasHTML = '';
    let totalProductosMostrados = 0;
    
    // Renderizar cada categoría
    categoriasConProductos.forEach(function(categoria) {
        const emoji = emojiMap[categoria.nombre] || '🍴';
        
        console.log('📁 Renderizando: ' + emoji + ' ' + categoria.nombre + ' (' + categoria.items.length + ' productos)');
        
        // Header de la categoría
        categoriasHTML += '<div class="categoria-section" data-categoria="' + categoria.nombre + '">';
        categoriasHTML += '<h2 class="text-[#161413] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">';
        categoriasHTML += emoji + ' ' + categoria.nombre;
        categoriasHTML += '<span class="categoria-count text-sm text-[#80726b] font-normal ml-2">(' + categoria.items.length + ')</span>';
        categoriasHTML += '</h2>';
        
        // Items de la categoría
        categoria.items.forEach(function(item) {
            categoriasHTML += createMenuItem(item);
            totalProductosMostrados++;
        });
        
        categoriasHTML += '</div>';
    });
    
    container.innerHTML = categoriasHTML;
    
    // Log del resultado final
    console.log('✅ Menú renderizado exitosamente:');
    console.log('   📁 ' + categoriasConProductos.length + ' categorías mostradas');
    console.log('   🍽️ ' + totalProductosMostrados + ' productos mostrados');
    console.log('   📋 Categorías: ' + categoriasConProductos.map(function(c) { return c.nombre; }).join(', '));
}

function renderPlatosEspeciales(platosEspeciales) {
    const section = document.getElementById('platos-especiales-section');
    const container = document.getElementById('platos-especiales-container');
    
    console.log('🌟 Procesando platos especiales: ' + platosEspeciales.length);
    
    if (!platosEspeciales || platosEspeciales.length === 0) {
        console.log('📝 No hay platos especiales para mostrar');
        section.style.display = 'none';
        return;
    }
    
    // ✅ CORRECCIÓN: Usar las funciones definidas correctamente
    const especialesValidos = platosEspeciales.filter(function(plato) {
        const esValido = esProductoMostrable(plato);
        
        if (!esValido) {
            console.log('⚠️ Plato especial excluido:', plato.nombre, {
                vigente: esProductoVigente(plato),
                disponible: esProductoDisponible(plato)
            });
        }
        
        return esValido;
    });
    
    console.log('✅ Platos especiales válidos: ' + especialesValidos.length);
    
    if (especialesValidos.length === 0) {
        console.log('📝 No hay platos especiales válidos para mostrar');
        section.style.display = 'none';
        return;
    }
    
    // Limpiar y crear contenido de platos especiales
    const especialesHTML = createPlatosEspeciales(especialesValidos);
    container.innerHTML = especialesHTML;
    section.style.display = 'block';
    
    console.log('✅ Sección de platos especiales renderizada: ' + especialesValidos.length + ' items');
}

function createMenuItem(item, isSpecialItem) {
    isSpecialItem = isSpecialItem || false;
    
    const imageUrl = item.imagen_url || item.imagen || getDefaultImage();
    
    const isSpecial = isSpecialItem || 
                     item.es_especial || 
                     item.categoria_nombre === 'Platos Especiales';
    
    console.log('🖼️ Imagen para ' + item.nombre + ':', {
        imagen_url: item.imagen_url,
        imagen: item.imagen,
        imageUrl_final: imageUrl,
        es_especial: isSpecial
    });
    
    let html = '';
    html += '<div class="p-4" data-item-id="' + item.id + '">';
    html += '<div class="flex items-stretch justify-between gap-4 rounded-xl">';
    html += '<div class="flex flex-col gap-1 flex-[2_2_0px]">';
    html += '<div class="flex items-center flex-wrap">';
    html += '<p class="text-[#161413] text-base font-bold leading-tight">';
    html += item.nombre + ' - <span class="price">' + formatPrice(item.precio) + '</span>';
    html += '</p>';
    
    if (item.vegetariano) {
        html += '<span class="vegetarian-badge">🌱 Vegetariano</span>';
    }
    if (item.picante) {
        html += '<span class="spicy-badge">🌶️ Picante</span>';
    }
    
    html += '</div>';
    html += '<p class="text-[#80726b] text-sm font-normal leading-normal">';
    html += (item.descripcion || 'Deliciosa preparación de nuestra cocina');
    html += '</p>';
    
    if (item.ingredientes) {
        html += '<p class="text-[#95a5a6] text-xs mt-1">';
        html += '<strong>Ingredientes:</strong> ' + item.ingredientes;
        html += '</p>';
    }
    
    if (item.tiempo_preparacion) {
        html += '<p class="text-[#95a5a6] text-xs">';
        html += '⏱️ Tiempo de preparación: ' + item.tiempo_preparacion + ' min';
        html += '</p>';
    }
    
    html += '</div>';
    html += '<div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex-1 item-image"';
    html += ' style="background-image: url(\'' + imageUrl + '\');"';
    
    const safeNombre = item.nombre.replace(/'/g, '&apos;');
    const safeDescripcion = (item.descripcion || '').replace(/'/g, '&apos;');
    const safeIngredientes = (item.ingredientes || '').replace(/'/g, '&apos;');
    const safeTiempo = (item.tiempo_preparacion || '');
    
    html += ' onclick="openImageModal(\'' + item.id + '\', \'' + imageUrl + '\', \'' + safeNombre + '\', \'' + item.precio + '\', \'' + safeDescripcion + '\', ' + (item.vegetariano ? 'true' : 'false') + ', ' + (item.picante ? 'true' : 'false') + ', \'' + safeIngredientes + '\', \'' + safeTiempo + '\')"';
    html += ' title="Clic para ver en detalle">';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
}

function createPlatosEspeciales(platosEspeciales) {
    if (!platosEspeciales || platosEspeciales.length === 0) {
        return '';
    }

    // Rastrear IDs de platos especiales para evitar duplicados
    platosEspeciales.forEach(function(plato) {
        if (plato.id) {
            specialItemIds.add(plato.id);
        }
    });

    console.log('🌟 Platos especiales registrados: ' + Array.from(specialItemIds).join(', '));

    return platosEspeciales.map(function(plato) {
        return createMenuItem(plato, true);
    }).join('');
}

// ==========================================
// CARGA DE DATOS
// ==========================================

function cargarMenu() {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const mainContent = document.getElementById('main-content');

    // Mostrar loading
    loading.style.display = 'flex';
    errorMessage.style.display = 'none';
    mainContent.style.display = 'none';

    // Limpiar conjunto de platos especiales
    specialItemIds.clear();

    console.log('🔄 Cargando menú con sistema dinámico (UNION de tablas + filtro vigente)...');
    
    // Intentar cargar desde endpoint web primero
    fetch('/api/menu-publico')
        .then(function(response) {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Endpoint web no disponible');
        })
        .then(function(data) {
            if (data.success && data.categorias) {
                console.log('📊 Estructura web detectada (categorías agrupadas)');
                
                // Extraer todos los items de todas las categorías
                let menuItems = [];
                data.categorias.forEach(function(categoria) {
                    if (categoria.items && Array.isArray(categoria.items)) {
                        categoria.items.forEach(function(item) {
                            item.categoria_nombre = item.categoria_nombre || categoria.nombre;
                            item.es_especial = false;
                            menuItems.push(item);
                        });
                    }
                });
                
                const platosEspeciales = data.platos_especiales || [];
                const restauranteInfo = data.restaurante;
                
                console.log('📋 Estructura web procesada: ' + menuItems.length + ' items normales de ' + data.categorias.length + ' categorías + ' + platosEspeciales.length + ' especiales');
                
                procesarDatos(menuItems, platosEspeciales, restauranteInfo);
            } else {
                throw new Error('Estructura de datos no válida');
            }
        })
        .catch(function(error) {
            console.log('⚠️ Endpoint web no disponible, probando /api/menu (UNION)...');
            
            // Fallback al endpoint UNION
            fetch('/api/menu')
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (Array.isArray(data)) {
                        console.log('📊 Estructura UNION detectada (array con flag es_especial)');
                        
                        // Separar por flag es_especial
                        const platosEspeciales = data.filter(function(item) {
                            return item.es_especial === true;
                        });
                        const menuItems = data.filter(function(item) {
                            return item.es_especial !== true;
                        });
                        
                        console.log('📋 Estructura UNION procesada: ' + menuItems.length + ' items normales + ' + platosEspeciales.length + ' especiales');
                        
                        procesarDatos(menuItems, platosEspeciales, null);
                    } else {
                        throw new Error('Estructura de datos no reconocida');
                    }
                })
                .catch(function(secondError) {
                    console.error('❌ Error cargando menú dinámico:', secondError);
                    mostrarError(secondError.message);
                });
        });
}

function procesarDatos(menuItems, platosEspeciales, restauranteInfo) {
    // Log detallado de lo que se recibió
    console.log('📊 Datos recibidos (después de UNION):');
    console.log('   🍽️ Items del menú normal: ' + menuItems.length);
    console.log('   ⭐ Platos especiales: ' + platosEspeciales.length);
    console.log('   📦 Total productos: ' + (menuItems.length + platosEspeciales.length));
    
    // ✅ NUEVO: Analizar vigencia antes del filtrado
    console.log('🔍 Analizando vigencia de productos:');
    
    const menuVigentes = menuItems.filter(esProductoVigente);
    const menuNoVigentes = menuItems.filter(item => !esProductoVigente(item));
    const especialesVigentes = platosEspeciales.filter(esProductoVigente);
    const especialesNoVigentes = platosEspeciales.filter(item => !esProductoVigente(item));
    
    console.log('   🍽️ Menú normal - Vigentes: ' + menuVigentes.length + ' | No vigentes: ' + menuNoVigentes.length);
    console.log('   ⭐ Especiales - Vigentes: ' + especialesVigentes.length + ' | No vigentes: ' + especialesNoVigentes.length);
    
    // Mostrar productos eliminados lógicamente
    if (menuNoVigentes.length > 0) {
        console.log('🗑️ Productos del menú eliminados lógicamente:');
        menuNoVigentes.forEach(item => {
            console.log('  - ' + item.nombre + ' (vigente: ' + item.vigente + ')');
        });
    }
    
    if (especialesNoVigentes.length > 0) {
        console.log('🗑️ Platos especiales eliminados lógicamente:');
        especialesNoVigentes.forEach(item => {
            console.log('  - ' + item.nombre + ' (vigente: ' + item.vigente + ')');
        });
    }
    
    // Verificar que tenemos datos vigentes
    if (menuVigentes.length === 0 && especialesVigentes.length === 0) {
        console.warn('⚠️ No hay productos vigentes para mostrar');
        // Continuar con los datos originales para evitar pantalla vacía
    }
    
    // Renderizar platos especiales si los hay
    if (platosEspeciales.length > 0) {
        renderPlatosEspeciales(platosEspeciales);
        console.log('⭐ ' + platosEspeciales.length + ' platos especiales procesados (filtrado por vigencia aplicado)');
    } else {
        // Ocultar sección de especiales si no hay
        const section = document.getElementById('platos-especiales-section');
        if (section) {
            section.style.display = 'none';
        }
        console.log('📝 No hay platos especiales para mostrar');
    }
    
    // Renderizar menú principal de forma dinámica
    renderMenuDinamico(menuItems);
    
    // Actualizar información del restaurante
    updateRestaurantContact(restauranteInfo);
    
    // Actualizar timestamp
    document.getElementById('last-updated').textContent = 
        'Última actualización: ' + new Date().toLocaleString('es-CL');
    
    // Mostrar contenido
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    loading.style.display = 'none';
    mainContent.style.display = 'flex';
    
    console.log('✅ Menú dinámico cargado exitosamente con filtro de vigencia aplicado');
}

function mostrarError(mensaje) {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    loading.style.display = 'none';
    errorMessage.style.display = 'block';
    
    const errorText = errorMessage.querySelector('p');
    if (errorText) {
        errorText.textContent = 'Error: ' + mensaje + '. Por favor, inténtalo más tarde.';
    }
}

// ==========================================
// FUNCIÓN DE DEBUG PARA VERIFICAR FILTRADO
// ==========================================

function debugFiltradoVigente() {
    console.log('🔍 === DEBUG FILTRADO POR VIGENTE ===');
    
    fetch('/api/menu')
        .then(r => r.json())
        .then(data => {
            if (Array.isArray(data)) {
                console.log('📊 Total de productos en API: ' + data.length);
                
                // Analizar por vigencia
                const vigentes = data.filter(esProductoVigente);
                const noVigentes = data.filter(item => !esProductoVigente(item));
                
                console.log('✅ Productos vigentes: ' + vigentes.length);
                console.log('🗑️ Productos no vigentes (eliminados): ' + noVigentes.length);
                
                // Mostrar productos no vigentes
                if (noVigentes.length > 0) {
                    console.log('📋 Productos eliminados lógicamente:');
                    noVigentes.forEach(item => {
                        console.log('  - ' + item.nombre + ' (vigente: ' + item.vigente + ')');
                    });
                }
                
                // Analizar por disponibilidad
                const disponibles = vigentes.filter(esProductoDisponible);
                const noDisponibles = vigentes.filter(item => !esProductoDisponible(item));
                
                console.log('🟢 Productos vigentes Y disponibles: ' + disponibles.length);
                console.log('🔴 Productos vigentes pero NO disponibles: ' + noDisponibles.length);
                
                // Mostrar productos no disponibles
                if (noDisponibles.length > 0) {
                    console.log('📋 Productos vigentes pero no disponibles:');
                    noDisponibles.forEach(item => {
                        console.log('  - ' + item.nombre + ' (disponible: ' + item.disponible + ')');
                    });
                }
            }
        })
        .catch(error => {
            console.error('❌ Error en debug: ' + error.message);
        });
}

function debugFiltradoProductos() {
    console.log('🔍 === DEBUG FILTRADO DE PRODUCTOS ===');
    
    fetch('/api/menu')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            console.log('📊 Respuesta de /api/menu:');
            console.log('   📦 Tipo: ' + (Array.isArray(data) ? 'Array' : typeof data));
            console.log('   📊 Cantidad total: ' + (Array.isArray(data) ? data.length : 'N/A'));
            
            if (Array.isArray(data)) {
                console.log('🔍 Analizando productos:');
                
                // Análisis de vigencia
                const vigentes = data.filter(esProductoVigente);
                const noVigentes = data.filter(function(item) { return !esProductoVigente(item); });
                
                console.log('   ✅ Vigentes: ' + vigentes.length);
                console.log('   🗑️ No vigentes: ' + noVigentes.length);
                
                // Análisis de disponibilidad
                const disponibles = data.filter(esProductoDisponible);
                const noDisponibles = data.filter(function(item) { return !esProductoDisponible(item); });
                
                console.log('   🟢 Disponibles: ' + disponibles.length);
                console.log('   🔴 No disponibles: ' + noDisponibles.length);
                
                // Análisis combinado
                const mostrables = data.filter(esProductoMostrable);
                const noMostrables = data.filter(function(item) { return !esProductoMostrable(item); });
                
                console.log('   ✅ Mostrables (vigentes Y disponibles): ' + mostrables.length);
                console.log('   ❌ No mostrables: ' + noMostrables.length);
                
                // Mostrar productos no mostrables
                if (noMostrables.length > 0) {
                    console.log('📋 Productos no mostrables:');
                    noMostrables.forEach(function(item) {
                        console.log('  - ' + item.nombre + ' (vigente: ' + item.vigente + ', disponible: ' + item.disponible + ')');
                    });
                }
                
                // Análisis por categorías
                const categorias = {};
                mostrables.forEach(function(item) {
                    const cat = item.categoria_nombre || item.categoria || 'Sin categoría';
                    if (!categorias[cat]) categorias[cat] = 0;
                    categorias[cat]++;
                });
                
                console.log('📁 Productos mostrables por categoría:');
                Object.entries(categorias).forEach(function(entry) {
                    console.log('  - ' + entry[0] + ': ' + entry[1] + ' productos');
                });
            }
        })
        .catch(function(error) {
            console.error('❌ Error en debug: ' + error.message);
        });
}

// ==========================================
// NAVEGACIÓN MÓVIL
// ==========================================

function setActiveNavItem(clickedItem) {
    // Remover active de todos los items
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(function(item) {
        item.classList.remove('active');
    });
    
    // Agregar active al item clickeado
    clickedItem.classList.add('active');
}