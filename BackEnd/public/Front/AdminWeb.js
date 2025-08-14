import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Users, Clock, CheckCircle, XCircle, Plus, Eye, Settings, LogOut, User, List, AlertCircle } from 'lucide-react';

// Simulación de datos inicial
const initialPedidos = [
  {
    id: 1,
    numeroMesa: 'Mesa 3',
    mesaId: 3,
    estado: 'pendiente',
    fechaCreacion: new Date(Date.now() - 5 * 60000).toISOString(),
    total: 25500,
    items: [
      { id: 1, nombre: 'Hamburguesa Clásica', cantidad: 2, precio: 8500, estado: 'pendiente', observaciones: 'Sin cebolla' },
      { id: 2, nombre: 'Papas Fritas', cantidad: 2, precio: 4000, estado: 'pendiente', observaciones: '' },
      { id: 3, nombre: 'Coca Cola', cantidad: 2, precio: 2500, estado: 'listo', observaciones: '' }
    ],
    tiempoEstimado: 25,
    cocineroAsignado: 'Chef Principal',
    observacionesGenerales: 'Cliente con prisa'
  },
  {
    id: 2,
    numeroMesa: 'Mesa 7',
    mesaId: 7,
    estado: 'preparando',
    fechaCreacion: new Date(Date.now() - 15 * 60000).toISOString(),
    total: 18000,
    items: [
      { id: 4, nombre: 'Pizza Margherita', cantidad: 1, precio: 12000, estado: 'preparando', observaciones: 'Extra queso' },
      { id: 5, nombre: 'Ensalada César', cantidad: 1, precio: 6000, estado: 'listo', observaciones: 'Sin pollo' }
    ],
    tiempoEstimado: 8,
    cocineroAsignado: 'Sous Chef'
  }
];

const initialMesas = [
  { id: 1, numero: 1, estado: 'libre', capacidad: 4 },
  { id: 2, numero: 2, estado: 'libre', capacidad: 2 },
  { id: 3, numero: 3, estado: 'ocupada', capacidad: 6 },
  { id: 4, numero: 4, estado: 'libre', capacidad: 4 },
  { id: 5, numero: 5, estado: 'libre', capacidad: 8 },
  { id: 6, numero: 6, estado: 'libre', capacidad: 2 },
  { id: 7, numero: 7, estado: 'ocupada', capacidad: 4 },
  { id: 8, numero: 8, estado: 'libre', capacidad: 6 }
];

const SistemaGestionCocina = () => {
  // Estados principales
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('login');
  const [pedidos, setPedidos] = useState(initialPedidos);
  const [mesas, setMesas] = useState(initialMesas);
  
  // Estados de autenticación
  const [datosLogin, setDatosLogin] = useState({ email: '', password: '', rol: 'cocina' });
  const [cargandoLogin, setCargandoLogin] = useState(false);

  // Estados para gestión de pedidos
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Usuarios del sistema
  const usuarios = {
    admin: { id: 1, email: 'admin@restaurante.com', password: 'admin123', rol: 'admin', nombre: 'Administrador' },
    cocina: { id: 2, email: 'cocina@restaurante.com', password: 'cocina123', rol: 'cocina', nombre: 'Chef Principal' },
    chef1: { id: 3, email: 'chef1@restaurante.com', password: 'chef123', rol: 'cocina', nombre: 'Sous Chef' }
  };

  // Función de login
  const manejarLogin = async () => {
    setCargandoLogin(true);
    
    // Simular autenticación
    setTimeout(() => {
      const usuarioEncontrado = Object.values(usuarios).find(
        u => u.email === datosLogin.email && u.password === datosLogin.password
      );
      
      if (usuarioEncontrado) {
        setUsuario(usuarioEncontrado);
        setVistaActual(usuarioEncontrado.rol === 'admin' ? 'admin' : 'cocina');
      } else {
        alert('Credenciales incorrectas');
      }
      setCargandoLogin(false);
    }, 1000);
  };

  // Función de logout
  const manejarLogout = () => {
    setUsuario(null);
    setVistaActual('login');
    setDatosLogin({ email: '', password: '', rol: 'cocina' });
  };

  // Función para cambiar estado de un item
  const cambiarEstadoItem = (pedidoId, itemId, nuevoEstado) => {
    setPedidos(prev => prev.map(pedido => {
      if (pedido.id === pedidoId) {
        const nuevosItems = pedido.items.map(item => 
          item.id === itemId ? { ...item, estado: nuevoEstado } : item
        );
        
        // Verificar si todos los items están listos para cambiar estado general
        const todosListos = nuevosItems.every(item => item.estado === 'listo');
        
        return {
          ...pedido,
          items: nuevosItems,
          estado: todosListos ? 'listo' : (nuevosItems.some(item => item.estado === 'preparando') ? 'preparando' : 'pendiente')
        };
      }
      return pedido;
    }));
  };

  // Función para cerrar pedido completo
  const cerrarPedido = (pedidoId) => {
    setPedidos(prev => prev.map(pedido => 
      pedido.id === pedidoId ? { ...pedido, estado: 'entregado' } : pedido
    ));
    
    // Liberar mesa
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      setMesas(prev => prev.map(mesa => 
        mesa.id === pedido.mesaId ? { ...mesa, estado: 'libre' } : mesa
      ));
    }
  };

  // Función para agregar items adicionales
  const agregarItemAdicional = (pedidoId, nuevoItem) => {
    setPedidos(prev => prev.map(pedido => {
      if (pedido.id === pedidoId) {
        return {
          ...pedido,
          items: [...pedido.items, { ...nuevoItem, id: Date.now(), estado: 'pendiente' }],
          total: pedido.total + (nuevoItem.precio * nuevoItem.cantidad)
        };
      }
      return pedido;
    }));
  };

  // Componente de Login
  const ComponenteLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <ChefHat className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Sistema Cocina</h1>
          <p className="text-gray-600">Gestión de pedidos restaurante</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={datosLogin.email}
              onChange={(e) => setDatosLogin(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="usuario@restaurante.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
            <input
              type="password"
              value={datosLogin.password}
              onChange={(e) => setDatosLogin(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            onClick={manejarLogin}
            disabled={cargandoLogin}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {cargandoLogin ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center mb-3">Usuarios de prueba:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-medium">Admin:</span>
              <span>admin@restaurante.com / admin123</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Cocina:</span>
              <span>cocina@restaurante.com / cocina123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de Navegación
  const BarraNavegacion = () => (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <ChefHat className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              {usuario?.rol === 'admin' ? 'Panel Administrador' : 'Cocina'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="w-5 h-5" />
              <span className="font-medium">{usuario?.nombre}</span>
            </div>
            
            <button
              onClick={manejarLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Componente de tarjeta de pedido
  const TarjetaPedido = ({ pedido }) => {
    const tiempoTranscurrido = Math.floor((Date.now() - new Date(pedido.fechaCreacion).getTime()) / 60000);
    const itemsPendientes = pedido.items.filter(item => item.estado === 'pendiente').length;
    const itemsPreparando = pedido.items.filter(item => item.estado === 'preparando').length;
    const itemsListos = pedido.items.filter(item => item.estado === 'listo').length;

    const colorEstado = {
      pendiente: 'bg-red-100 text-red-800 border-red-300',
      preparando: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      listo: 'bg-green-100 text-green-800 border-green-300',
      entregado: 'bg-gray-100 text-gray-800 border-gray-300'
    };

    return (
      <div className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${colorEstado[pedido.estado]}`}>
        <div className="p-6">
          {/* Encabezado del pedido */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{pedido.numeroMesa}</h3>
              <p className="text-sm text-gray-600">
                Hace {tiempoTranscurrido} min • ${pedido.total.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorEstado[pedido.estado]}`}>
                {pedido.estado.toUpperCase()}
              </span>
              {pedido.tiempoEstimado > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {pedido.tiempoEstimado} min
                </p>
              )}
            </div>
          </div>

          {/* Items del pedido */}
          <div className="space-y-3 mb-4">
            {pedido.items.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">
                      {item.cantidad}x {item.nombre}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${colorEstado[item.estado]}`}>
                      {item.estado}
                    </span>
                  </div>
                  {item.observaciones && (
                    <p className="text-sm text-gray-600 mt-1">{item.observaciones}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {item.estado === 'pendiente' && (
                    <button
                      onClick={() => cambiarEstadoItem(pedido.id, item.id, 'preparando')}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition-colors"
                    >
                      Preparar
                    </button>
                  )}
                  {item.estado === 'preparando' && (
                    <button
                      onClick={() => cambiarEstadoItem(pedido.id, item.id, 'listo')}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                    >
                      Listo
                    </button>
                  )}
                  {item.estado === 'listo' && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resumen y acciones */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Items:</span> {itemsPendientes} pendientes, {itemsPreparando} preparando, {itemsListos} listos
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setPedidoSeleccionado(pedido);
                  setMostrarDetalles(true);
                }}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>Ver</span>
              </button>
              
              {pedido.estado === 'listo' && (
                <button
                  onClick={() => cerrarPedido(pedido.id)}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Entregar</span>
                </button>
              )}
            </div>
          </div>

          {pedido.observacionesGenerales && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {pedido.observacionesGenerales}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Componente principal de cocina
  const VistaCocina = () => {
    const pedidosActivos = pedidos.filter(p => p.estado !== 'entregado');
    const estadisticas = {
      pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
      preparando: pedidos.filter(p => p.estado === 'preparando').length,
      listos: pedidos.filter(p => p.estado === 'listo').length
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <BarraNavegacion />
        
        <div className="max-w-7xl mx-auto p-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pedidos Pendientes</p>
                  <p className="text-3xl font-bold text-red-600">{estadisticas.pendientes}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">En Preparación</p>
                  <p className="text-3xl font-bold text-yellow-600">{estadisticas.preparando}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Listos para Entregar</p>
                  <p className="text-3xl font-bold text-green-600">{estadisticas.listos}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
          </div>

          {/* Lista de pedidos */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <List className="w-6 h-6" />
              <span>Pedidos Activos ({pedidosActivos.length})</span>
            </h2>
            
            {pedidosActivos.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No hay pedidos activos</p>
                <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {pedidosActivos.map(pedido => (
                  <TarjetaPedido key={pedido.id} pedido={pedido} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de detalles */}
        {mostrarDetalles && pedidoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">
                    Detalles - {pedidoSeleccionado.numeroMesa}
                  </h3>
                  <button
                    onClick={() => setMostrarDetalles(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Fecha:</span>
                      <p>{new Date(pedidoSeleccionado.fechaCreacion).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Total:</span>
                      <p className="text-lg font-bold">${pedidoSeleccionado.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Cocinero:</span>
                      <p>{pedidoSeleccionado.cocineroAsignado}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Estado:</span>
                      <p className="capitalize font-medium">{pedidoSeleccionado.estado}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-600 mb-2">Items del pedido:</h4>
                    <div className="space-y-2">
                      {pedidoSeleccionado.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{item.cantidad}x {item.nombre}</span>
                            {item.observaciones && (
                              <p className="text-sm text-gray-600">{item.observaciones}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.estado === 'pendiente' ? 'bg-red-100 text-red-800' :
                            item.estado === 'preparando' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente de vista admin
  const VistaAdmin = () => (
    <div className="min-h-screen bg-gray-100">
      <BarraNavegacion />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Pedidos Hoy</p>
                <p className="text-3xl font-bold text-blue-600">{pedidos.length}</p>
              </div>
              <List className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Mesas Ocupadas</p>
                <p className="text-3xl font-bold text-orange-600">
                  {mesas.filter(m => m.estado === 'ocupada').length}
                </p>
              </div>
              <Users className="w-12 h-12 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Ventas del Día</p>
                <p className="text-3xl font-bold text-green-600">
                  ${pedidos.reduce((sum, p) => sum + p.total, 0).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tiempo Promedio</p>
                <p className="text-3xl font-bold text-purple-600">18 min</p>
              </div>
              <Clock className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estado de mesas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Estado de Mesas</h3>
            <div className="grid grid-cols-4 gap-4">
              {mesas.map(mesa => (
                <div
                  key={mesa.id}
                  className={`p-4 rounded-lg text-center font-medium ${
                    mesa.estado === 'libre' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="text-sm">Mesa {mesa.numero}</div>
                  <div className="text-xs mt-1 capitalize">{mesa.estado}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de pedidos */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen de Cocina</h3>
            <div className="space-y-4">
              {pedidos.filter(p => p.estado !== 'entregado').map(pedido => (
                <div key={pedido.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{pedido.numeroMesa}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({pedido.items.length} items)
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    pedido.estado === 'pendiente' ? 'bg-red-100 text-red-800' :
                    pedido.estado === 'preparando' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {pedido.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizado principal
  if (vistaActual === 'login') {
    return <ComponenteLogin />;
  }

  if (vistaActual === 'admin') {
    return <VistaAdmin />;
  }

  return <VistaCocina />;
};

export default SistemaGestionCocina;