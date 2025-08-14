// services/MenuService.js - Gestión completa del menú con sincronización
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

class MenuService {
  constructor() {
    this.syncInterval = null;
    this.lastSyncTime = null;
  }

  // 📥 Cargar menú desde backend con cache
  async loadMenu() {
    try {
      console.log('📥 Cargando menú desde backend...');
      
      // Intentar cargar desde servidor
      const menu = await ApiService.syncMenu();
      
      // Procesar items para formato consistente
      const processedMenu = menu.map(item => ({
        id: item.id,
        nombre: item.nombre || '',
        precio: parseFloat(item.precio) || 0,
        categoria: this.mapCategoriaFromBackend(item.categoria_id, item.categoria),
        descripcion: item.descripcion || '',
        disponible: Boolean(item.disponible),
        vegetariano: Boolean(item.vegetariano),
        picante: Boolean(item.picante),
        imagen: item.imagen || null,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      this.lastSyncTime = new Date();
      console.log('✅ Menú cargado:', processedMenu.length, 'items');
      
      return processedMenu;
      
    } catch (error) {
      console.error('❌ Error cargando menú:', error);
      
      // Fallback: cargar desde cache local
      return await this.loadMenuFromCache();
    }
  }

  // 📱 Cargar menú desde cache local
  async loadMenuFromCache() {
    try {
      const cachedMenu = await AsyncStorage.getItem('menu_cache');
      const lastSync = await AsyncStorage.getItem('menu_last_sync');
      
      if (cachedMenu) {
        console.log('📱 Cargando menú desde cache local');
        const menu = JSON.parse(cachedMenu);
        
        if (lastSync) {
          const syncDate = new Date(lastSync);
          console.log('⏰ Última sincronización:', syncDate.toLocaleString());
        }
        
        return menu;
      } else {
        console.log('📝 No hay cache, creando menú por defecto');
        return this.getDefaultMenu();
      }
    } catch (error) {
      console.error('❌ Error cargando cache:', error);
      return this.getDefaultMenu();
    }
  }

  // 🍽️ Menú por defecto
  getDefaultMenu() {
    return [
      {
        id: 'default-1',
        nombre: 'Hamburguesa Clásica',
        precio: 3500,
        categoria: 'Comida',
        descripcion: 'Hamburguesa con carne, lechuga, tomate y queso',
        disponible: true,
        vegetariano: false,
        picante: false
      },
      {
        id: 'default-2',
        nombre: 'Papas Fritas',
        precio: 2000,
        categoria: 'Comida',
        descripcion: 'Papas fritas crujientes',
        disponible: true,
        vegetariano: true,
        picante: false
      },
      {
        id: 'default-3',
        nombre: 'Coca Cola',
        precio: 1500,
        categoria: 'Bebida',
        descripcion: 'Bebida gaseosa 500ml',
        disponible: true,
        vegetariano: true,
        picante: false
      }
    ];
  }

  // ➕ Crear nuevo item en el menú
  async createMenuItem(itemData, userRole) {
    try {
      if (userRole !== 'admin') {
        throw new Error('Solo los administradores pueden agregar items al menú');
      }

      console.log('➕ Creando nuevo item:', itemData.nombre);

      // Preparar datos para el backend
      const backendData = {
        nombre: itemData.nombre,
        precio: parseFloat(itemData.precio),
        categoria_id: this.mapCategoriaToBackend(itemData.categoria),
        descripcion: itemData.descripcion || '',
        disponible: itemData.disponible !== false,
        vegetariano: Boolean(itemData.vegetariano),
        picante: Boolean(itemData.picante),
        imagen: itemData.imagen || null
      };

      // Crear en backend
      const newItem = await ApiService.createMenuItem(backendData);
      
      // Procesar respuesta del backend
      const processedItem = {
        id: newItem.id,
        nombre: newItem.nombre,
        precio: parseFloat(newItem.precio),
        categoria: this.mapCategoriaFromBackend(newItem.categoria_id, itemData.categoria),
        descripcion: newItem.descripcion,
        disponible: Boolean(newItem.disponible),
        vegetariano: Boolean(newItem.vegetariano),
        picante: Boolean(newItem.picante),
        imagen: newItem.imagen,
        created_at: newItem.created_at,
        updated_at: newItem.updated_at
      };

      console.log('✅ Item creado exitosamente:', processedItem.nombre);
      
      // Actualizar cache local
      await this.updateMenuCache();
      
      return processedItem;
      
    } catch (error) {
      console.error('❌ Error creando item:', error);
      throw error;
    }
  }

  // ✏️ Actualizar item del menú
  async updateMenuItem(id, itemData, userRole) {
    try {
      if (userRole !== 'admin') {
        throw new Error('Solo los administradores pueden editar el menú');
      }

      console.log('✏️ Actualizando item:', id);

      // Preparar datos para el backend
      const backendData = {
        nombre: itemData.nombre,
        precio: parseFloat(itemData.precio),
        categoria_id: this.mapCategoriaToBackend(itemData.categoria),
        descripcion: itemData.descripcion || '',
        disponible: itemData.disponible !== false,
        vegetariano: Boolean(itemData.vegetariano),
        picante: Boolean(itemData.picante),
        imagen: itemData.imagen || null
      };

      // Actualizar en backend
      const updatedItem = await ApiService.updateItem(id, backendData, false);
      
      // Procesar respuesta
      const processedItem = {
        id: updatedItem.id,
        nombre: updatedItem.nombre,
        precio: parseFloat(updatedItem.precio),
        categoria: this.mapCategoriaFromBackend(updatedItem.categoria_id, itemData.categoria),
        descripcion: updatedItem.descripcion,
        disponible: Boolean(updatedItem.disponible),
        vegetariano: Boolean(updatedItem.vegetariano),
        picante: Boolean(updatedItem.picante),
        imagen: updatedItem.imagen,
        updated_at: updatedItem.updated_at
      };

      console.log('✅ Item actualizado exitosamente:', processedItem.nombre);
      
      // Actualizar cache local
      await this.updateMenuCache();
      
      return processedItem;
      
    } catch (error) {
      console.error('❌ Error actualizando item:', error);
      throw error;
    }
  }

  // 🗑️ Eliminar item del menú
  async deleteMenuItem(id, userRole) {
    try {
      if (userRole !== 'admin') {
        throw new Error('Solo los administradores pueden eliminar items del menú');
      }

      console.log('🗑️ Eliminando item:', id);

      // Eliminar del backend
      await ApiService.deleteItem(id, false);
      
      console.log('✅ Item eliminado exitosamente');
      
      // Actualizar cache local
      await this.updateMenuCache();
      
      return true;
      
    } catch (error) {
      console.error('❌ Error eliminando item:', error);
      throw error;
    }
  }

  // 👁️ Cambiar disponibilidad de item
  async toggleItemAvailability(id, disponible, userRole) {
    try {
      if (userRole !== 'admin' && userRole !== 'mesero') {
        throw new Error('No tienes permisos para cambiar la disponibilidad');
      }

      console.log('👁️ Cambiando disponibilidad:', id, disponible);

      // Actualizar en backend
      const updatedItem = await ApiService.toggleItemAvailability(id, disponible, false);
      
      console.log('✅ Disponibilidad actualizada');
      
      // Actualizar cache local
      await this.updateMenuCache();
      
      return updatedItem;
      
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      throw error;
    }
  }

  // 🔄 Actualizar cache local
  async updateMenuCache() {
    try {
      const menu = await ApiService.syncMenu();
      await AsyncStorage.setItem('menu_cache', JSON.stringify(menu));
      await AsyncStorage.setItem('menu_last_sync', new Date().toISOString());
      return menu;
    } catch (error) {
      console.error('❌ Error actualizando cache:', error);
    }
  }

  // 🔄 Iniciar sincronización automática
  startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Sincronización automática del menú...');
        await this.updateMenuCache();
        console.log('✅ Sincronización automática completada');
      } catch (error) {
        console.log('⚠️ Error en sincronización automática:', error.message);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Sincronización automática iniciada cada ${intervalMinutes} minutos`);
  }

  // ⏹️ Detener sincronización automática
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Sincronización automática detenida');
    }
  }

  // 🗂️ Mapear categorías del backend
  mapCategoriaFromBackend(categoriaId, categoriaNombre) {
    if (categoriaNombre) return categoriaNombre;
    
    // Mapeo por ID si no hay nombre
    const categoriaMap = {
      1: 'Comida',
      2: 'Comida',
      3: 'Postre', 
      4: 'Bebida',
      5: 'Especial'
    };
    
    return categoriaMap[categoriaId] || 'Comida';
  }

  // 🗂️ Mapear categorías hacia el backend
  mapCategoriaToBackend(categoria) {
    const categoriaMap = {
      'Comida': 2,
      'Bebida': 4,
      'Postre': 3,
      'Especial': 5
    };
    
    return categoriaMap[categoria] || 2;
  }

  // 📊 Obtener estadísticas del menú
  getMenuStats(menu) {
    if (!Array.isArray(menu)) return null;

    const stats = {
      total: menu.length,
      disponibles: menu.filter(item => item.disponible).length,
      noDisponibles: menu.filter(item => !item.disponible).length,
      categorias: {},
      vegetarianos: menu.filter(item => item.vegetariano).length,
      picantes: menu.filter(item => item.picante).length,
      precioPromedio: 0
    };

    // Estadísticas por categoría
    menu.forEach(item => {
      const categoria = item.categoria || 'Sin categoría';
      if (!stats.categorias[categoria]) {
        stats.categorias[categoria] = 0;
      }
      stats.categorias[categoria]++;
    });

    // Precio promedio
    const precios = menu.map(item => item.precio || 0);
    stats.precioPromedio = precios.length > 0 
      ? precios.reduce((a, b) => a + b, 0) / precios.length 
      : 0;

    return stats;
  }
}

export default new MenuService();