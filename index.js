const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración específica para Neon.tech
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vsX4QGV0ibwu@ep-late-sun-a4jb2jfv-pooler.us-east-1.aws.neon.tech:5432/neondb',
  ssl: {
    rejectUnauthorized: false // Requerido por Neon.tech
  }
});

// Verificación de conexión
pool.connect()
  .then(() => console.log('Conectado a PostgreSQL en Neon.tech'))
  .catch(err => console.error('Error al conectar a PostgreSQL:', err));

// Endpoints
app.get('/mesas', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT no_mesa FROM ordenes ORDER BY no_mesa');
    const mesas = rows.map(row => row.no_mesa);
    res.json(mesas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo mesas' });
  }
});

app.get('/ordenes', async (req, res) => {
  const mesaId = req.query.no_mesa;
  
  if (!mesaId || isNaN(mesaId)) {
    return res.status(400).json({ 
      error: 'Parámetro inválido',
      details: 'no_mesa debe ser un número válido'
    });
  }

  try {
    const { rows } = await pool.query(`
      SELECT 
        o.id_orden,
        o.no_mesa,
        o.id_receta,
        r.nombre_receta,
        r.precio,
        o.cantidad,
        o.fecha_hora
      FROM ordenes o
      JOIN recetas r ON o.id_receta = r.id_receta
      WHERE o.no_mesa = $1
      ORDER BY o.fecha_hora DESC
    `, [mesaId]);

    // Formatear respuesta
    const response = rows.map(row => ({
      ...row,
      precio: parseFloat(row.precio).toFixed(2),
      fecha_hora: new Date(row.fecha_hora).toISOString()
    }));

    res.json(response);
  } catch (err) {
    console.error("Error en GET /ordenes:", {
      message: err.message,
      stack: err.stack,
      query: err.query
    });
    
    res.status(500).json({ 
      error: "Error al obtener órdenes",
      details: "Verifique la conexión y los parámetros",
      hint: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

// Endpoint para pruebas
app.get('/test-db', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() as current_time');
    res.json({ dbStatus: 'OK', time: rows[0].current_time });
  } catch (err) {
    res.status(500).json({ dbStatus: 'ERROR', error: err.message });
  }
});

// Endpoint único para crear órdenes con verificación de stock
app.post('/ordenes', async (req, res) => {
  // Aceptar tanto array como objeto único
  const ordenes = Array.isArray(req.body) ? req.body : [req.body];
  
  if (!ordenes.length) {
    return res.status(400).json({ error: 'No se recibieron órdenes para procesar' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Objeto para rastrear problemas
    const problemas = {
      recetasInsuficientes: [],
      detalles: {}
    };

    // 1. PRIMERA PASADA: VALIDACIÓN COMPLETA
    for (const orden of ordenes) {
      const { no_mesa, id_receta, cantidad } = orden;

      // Validación básica
      if (!no_mesa || !id_receta || !cantidad || isNaN(cantidad) || cantidad <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Datos de orden incompletos o inválidos',
          ordenProblematica: orden
        });
      }

      // Obtener información de la receta
      const receta = await client.query(
        'SELECT nombre_receta FROM recetas WHERE id_receta = $1', 
        [id_receta]
      );
      
      if (!receta.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: `Receta con ID ${id_receta} no encontrada` 
        });
      }

      const nombreReceta = receta.rows[0].nombre_receta;

      // Verificar ingredientes
      const ingredientes = await client.query(
        `SELECT 
          i.id, 
          i.nombre AS nombre_ingrediente, 
          i.stock, 
          rd.cantidad AS cantidad_receta
         FROM receta_detalle rd
         JOIN inventario i ON rd.id = i.id
         WHERE rd.id_receta = $1`,
        [id_receta]
      );

      // Buscar ingredientes insuficientes
      const faltantes = ingredientes.rows.filter(
        ing => ing.stock < (ing.cantidad_receta * cantidad)
      );

      if (faltantes.length) {
        problemas.recetasInsuficientes.push(nombreReceta);
        problemas.detalles[nombreReceta] = faltantes.map(ing => ({
          ingrediente: ing.nombre_ingrediente,
          necesario: ing.cantidad_receta * cantidad,
          disponible: ing.stock,
          faltante: (ing.cantidad_receta * cantidad) - ing.stock
        }));
      }
    }

    // Si hay problemas, retornar error detallado
    if (problemas.recetasInsuficientes.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No hay suficiente stock para algunas recetas',
        ...problemas
      });
    }

    // 2. SEGUNDA PASADA: PROCESAMIENTO REAL
    const ordenesProcesadas = [];
    
    for (const orden of ordenes) {
      const { no_mesa, id_receta, cantidad } = orden;

      // Insertar orden
      const nuevaOrden = await client.query(
        `INSERT INTO ordenes 
         (no_mesa, id_receta, cantidad, fecha_hora)
         VALUES ($1, $2, $3, NOW())
         RETURNING id_orden, no_mesa, id_receta, cantidad, fecha_hora`,
        [no_mesa, id_receta, cantidad]
      );

      // Actualizar inventario
      const ingredientes = await client.query(
        `SELECT id, cantidad 
         FROM receta_detalle 
         WHERE id_receta = $1`,
        [id_receta]
      );

      for (const ing of ingredientes.rows) {
        await client.query(
          `UPDATE inventario
           SET stock = stock - $1
           WHERE id = $2`,
          [ing.cantidad * cantidad, ing.id]
        );
      }

      ordenesProcesadas.push(nuevaOrden.rows[0]);
    }

    await client.query('COMMIT');
    
    return res.status(201).json({
      success: true,
      message: 'Órdenes procesadas exitosamente',
      ordenes: ordenesProcesadas,
      totalOrdenes: ordenesProcesadas.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error crítico en POST /ordenes:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    return res.status(500).json({
      error: 'Error interno al procesar órdenes',
      detalles: process.env.NODE_ENV === 'development' ? error.message : null
    });
  } finally {
    client.release();
  }
});

app.delete('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM ordenes WHERE id_orden = $1', [id]);
    res.json({ message: 'Orden eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando orden' });
  }
});

app.put('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  const { cantidad } = req.body;
  try {
    await pool.query('UPDATE ordenes SET cantidad = $1 WHERE id_orden = $2', [cantidad, id]);
    res.json({ message: 'Cantidad actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando cantidad' });
  }
});

// Endpoint para obtener todas las recetas
app.get('/recetas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id_receta, nombre_receta, precio FROM recetas ORDER BY nombre_receta');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});