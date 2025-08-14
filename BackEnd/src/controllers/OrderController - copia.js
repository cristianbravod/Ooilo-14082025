const { Pool } = require('pg');
const config = require('../config/database');
const pool = new Pool(config);

class OrderController {
  async createQuickOrder(req, res) {
    try {
      const { mesa, items, cliente, observaciones, notas } = req.body;
      let total = 0;
      const client = await pool.connect();

      try {
        for (const item of items) {
          const menuResult = await client.query('SELECT precio FROM menu_items WHERE id = $1', [item.menu_item_id]);
          if (menuResult.rows.length === 0) {
            return res.status(400).json({ message: `Menu item ${item.menu_item_id} not found` });
          }
          total += menuResult.rows[0].precio * item.cantidad;
        }

        const orderResult = await client.query(
          `INSERT INTO ordenes (usuario_id, mesa, total, estado, metodo_pago, notas, fecha_creacion, fecha_modificacion)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
          [1, mesa, total, 'pendiente', 'efectivo', observaciones || notas || '']
        );

        const order = orderResult.rows[0];

        for (const item of items) {
          const menuResult = await client.query('SELECT precio FROM menu_items WHERE id = $1', [item.menu_item_id]);
          await client.query(
            `INSERT INTO orden_items (orden_id, menu_item_id, cantidad, precio_unitario, instrucciones_especiales, estado_item, fecha_creacion)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [order.id, item.menu_item_id, item.cantidad, menuResult.rows[0].precio, item.observaciones || '', 'pendiente']
          );
        }

        res.status(201).json({
          success: true,
          message: 'Pedido creado exitosamente',
          orden: order,
          resumen: {
            numero_orden: order.id,
            mesa: order.mesa,
            total: parseFloat(order.total),
            cantidad_items: items.length,
            estado: order.estado,
            fecha_creacion: order.fecha_creacion
          }
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating quick order:', error);
      res.status(500).json({ success: false, message: 'Error creating quick order', error: error.message });
    }
  }

  async getActiveOrders(req, res) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            o.*,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'cantidad', oi.cantidad,
                'precio_unitario', oi.precio_unitario,
                'instrucciones_especiales', oi.instrucciones_especiales,
                'estado', COALESCE(oi.estado_item, 'pendiente'),
                'nombre', m.nombre,
                'descripcion', m.descripcion
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL) AS items,
            EXTRACT(EPOCH FROM (NOW() - o.fecha_creacion))/60 as minutos_espera,
            CASE 
              WHEN EXTRACT(EPOCH FROM (NOW() - o.fecha_creacion))/60 > 30 THEN 'ALTA'
              WHEN EXTRACT(EPOCH FROM (NOW() - o.fecha_creacion))/60 > 15 THEN 'MEDIA'
              ELSE 'NORMAL'
            END as prioridad
          FROM ordenes o
          LEFT JOIN orden_items oi ON o.id = oi.orden_id
          LEFT JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE o.estado IN ('pendiente', 'confirmada', 'preparando', 'lista')
          GROUP BY o.id
          ORDER BY o.fecha_creacion ASC
        `);

        res.json({
          success: true,
          ordenes: result.rows.map(o => ({
            ...o,
            total: parseFloat(o.total),
            minutos_espera: Math.floor(o.minutos_espera),
            prioridad: o.prioridad || 'NORMAL',
            items: o.items || []
          }))
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error obteniendo órdenes activas:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo órdenes activas', error: error.message });
    }
  }

  async getOrdersByTable(req, res) {
    const { mesa } = req.params;
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT o.*, 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'cantidad', oi.cantidad,
              'estado', oi.estado_item
            )
          ) AS items
        FROM ordenes o
        LEFT JOIN orden_items oi ON o.id = oi.orden_id
        WHERE o.mesa = $1
        GROUP BY o.id
        ORDER BY o.fecha_creacion DESC
      `, [mesa]);

      res.json({ success: true, ordenes: result.rows });
      client.release();
    } catch (error) {
      console.error('❌ Error obteniendo órdenes por mesa:', error);
      res.status(500).json({ success: false, message: 'Error al obtener órdenes por mesa', error: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    const { id } = req.params;
    const { estado } = req.body;
    try {
      const client = await pool.connect();
      await client.query(
        `UPDATE ordenes SET estado = $1, fecha_modificacion = NOW() WHERE id = $2`,
        [estado, id]
      );
      res.json({ success: true, message: 'Estado de orden actualizado' });
      client.release();
    } catch (error) {
      console.error('❌ Error actualizando estado de orden:', error);
      res.status(500).json({ success: false, message: 'Error actualizando estado', error: error.message });
    }
  }

  async updateItemStatus(req, res) {
    const { ordenId, itemId } = req.params;
    const { estado } = req.body;
    try {
      const client = await pool.connect();
      await client.query(
        `UPDATE orden_items SET estado_item = $1 WHERE id = $2 AND orden_id = $3`,
        [estado, itemId, ordenId]
      );
      res.json({ success: true, message: 'Estado de item actualizado' });
      client.release();
    } catch (error) {
      console.error('❌ Error actualizando estado de item:', error);
      res.status(500).json({ success: false, message: 'Error actualizando estado de item', error: error.message });
    }
  }

  async addItemsToOrder(req, res) {
    const { id } = req.params;
    const { items } = req.body;
    try {
      const client = await pool.connect();
      for (const item of items) {
        const menuResult = await client.query('SELECT precio FROM menu_items WHERE id = $1', [item.menu_item_id]);
        await client.query(
          `INSERT INTO orden_items (orden_id, menu_item_id, cantidad, precio_unitario, instrucciones_especiales, estado_item, fecha_creacion)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, item.menu_item_id, item.cantidad, menuResult.rows[0].precio, item.observaciones || '', 'pendiente']
        );
      }
      res.json({ success: true, message: 'Items agregados a la orden' });
      client.release();
    } catch (error) {
      console.error('❌ Error agregando items a la orden:', error);
      res.status(500).json({ success: false, message: 'Error agregando items', error: error.message });
    }
  }

  async closeTable(req, res) {
    const { mesa } = req.params;
    try {
      const client = await pool.connect();
      await client.query(
        `UPDATE ordenes SET estado = 'entregada', fecha_modificacion = NOW() WHERE mesa = $1 AND estado != 'entregada'`,
        [mesa]
      );
      res.json({ success: true, message: `Mesa ${mesa} cerrada` });
      client.release();
    } catch (error) {
      console.error('❌ Error cerrando mesa:', error);
      res.status(500).json({ success: false, message: 'Error cerrando mesa', error: error.message });
    }
  }

  async getAllOrders(req, res) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM ordenes ORDER BY fecha_creacion DESC');
      res.json({ success: true, ordenes: result.rows });
      client.release();
    } catch (error) {
      console.error('❌ Error obteniendo todas las órdenes:', error);
      res.status(500).json({ success: false, message: 'Error al obtener órdenes', error: error.message });
    }
  }

  async getOrderById(req, res) {
    const { id } = req.params;
    try {
      const client = await pool.connect();
      const result = await client.query(
        `SELECT o.*, 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'cantidad', oi.cantidad,
              'estado', oi.estado_item
            )
          ) AS items
         FROM ordenes o
         LEFT JOIN orden_items oi ON o.id = oi.orden_id
         WHERE o.id = $1
         GROUP BY o.id`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }
      res.json({ success: true, orden: result.rows[0] });
      client.release();
    } catch (error) {
      console.error('❌ Error obteniendo orden por ID:', error);
      res.status(500).json({ success: false, message: 'Error al obtener orden', error: error.message });
    }
  }
}

module.exports = new OrderController();
