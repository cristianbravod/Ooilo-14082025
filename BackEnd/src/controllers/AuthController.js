const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const pool = new Pool(config);

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secret-key-aqui';
const JWT_EXPIRATION = '24h';

class AuthController {
  // Login de usuario
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email y contraseña son requeridos' 
      });
    }

    try {
      const client = await pool.connect();
      try {
        // Buscar usuario por email
        const userResult = await client.query(
          'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
          [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({ 
            success: false, 
            message: 'Credenciales incorrectas' 
          });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
          return res.status(401).json({ 
            success: false, 
            message: 'Credenciales incorrectas' 
          });
        }

        // Generar token JWT
        const token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email,
            rol: user.rol 
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRATION }
        );

        // Actualizar último login
        await client.query(
          'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
          [user.id]
        );

        // Retornar respuesta exitosa
        res.json({
          success: true,
          message: 'Login exitoso',
          token: token,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol
          }
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: error.message 
      });
    }
  }

  // Verificar token
  async verify(req, res) {
    // Si llegó aquí, el middleware ya verificó el token
    if (req.user) {
      res.json({
        success: true,
        message: 'Token válido',
        user: req.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  }

  // Logout (opcional - principalmente para invalidar tokens en el frontend)
  async logout(req, res) {
    // En una implementación real, podrías agregar el token a una lista negra
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  }

  // Registrar nuevo usuario (solo admin)
  async register(req, res) {
    const { nombre, email, password, rol } = req.body;

    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Verificar que el usuario actual es admin
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo administradores pueden crear usuarios' 
      });
    }

    const rolesValidos = ['admin', 'cocina', 'chef', 'mesero', 'cajero'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rol inválido' 
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar si el email ya existe
      const emailCheck = await client.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email.toLowerCase()]
      );

      if (emailCheck.rows.length > 0) {
        throw new Error('El email ya está registrado');
      }

      // Hash de la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insertar nuevo usuario
      const result = await client.query(
        `INSERT INTO usuarios (nombre, email, password, rol, activo, fecha_creacion)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING id, nombre, email, rol`,
        [nombre, email.toLowerCase(), hashedPassword, rol]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creando usuario:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creando usuario', 
        error: error.message 
      });
    } finally {
      client.release();
    }
  }

  // Cambiar contraseña
  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contraseña actual y nueva son requeridas' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    const client = await pool.connect();
    try {
      // Obtener usuario actual
      const userResult = await client.query(
        'SELECT password FROM usuarios WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
      
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Contraseña actual incorrecta' 
        });
      }

      // Hash de la nueva contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await client.query(
        'UPDATE usuarios SET password = $1, fecha_modificacion = NOW() WHERE id = $2',
        [hashedPassword, req.user.id]
      );

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error cambiando contraseña', 
        error: error.message 
      });
    } finally {
      client.release();
    }
  }

  // Crear usuario inicial (para setup)
  async createInitialAdmin() {
    const client = await pool.connect();
    try {
      // Verificar si ya existe un admin
      const adminCheck = await client.query(
        'SELECT id FROM usuarios WHERE rol = $1',
        ['admin']
      );

      if (adminCheck.rows.length > 0) {
        console.log('✅ Ya existe un usuario administrador');
        return;
      }

      // Crear admin por defecto
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(
        `INSERT INTO usuarios (nombre, email, password, rol, activo, fecha_creacion)
         VALUES ($1, $2, $3, $4, true, NOW())`,
        ['Administrador', 'admin@restaurante.com', hashedPassword, 'admin']
      );

      console.log('✅ Usuario administrador creado exitosamente');
      console.log('   Email: admin@restaurante.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  IMPORTANTE: Cambia esta contraseña después del primer login');

    } catch (error) {
      console.error('❌ Error creando usuario inicial:', error);
    } finally {
      client.release();
    }
  }
}

module.exports = new AuthController();