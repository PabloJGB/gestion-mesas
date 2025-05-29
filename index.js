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
  const ordenes = Array.isArray(req.body) ? req.body : [req.body]; // Acepta tanto array como objeto único

  if (!ordenes || ordenes.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos una orden' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Objeto para trackear recetas con problemas
    const problemasStock = {};

    // Primera fase: validación completa
    for (const orden of ordenes) {
      const { no_mesa, id_receta, cantidad } = orden;

      // Validación básica
      if (!no_mesa || !id_receta || !cantidad || cantidad <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Datos de orden inválidos',
          details: `Mesa: ${no_mesa}, Receta: ${id_receta}, Cantidad: ${cantidad}`
        });
      }

      // Obtener nombre de receta
      const recetaResult = await client.query(
        'SELECT nombre_receta FROM recetas WHERE id_receta = $1',
        [id_receta]
      );

      if (recetaResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: `Receta con ID ${id_receta} no encontrada`
        });
      }

      const nombreReceta = recetaResult.rows[0].nombre_receta;

      // Verificar ingredientes
      const ingredientesResult = await client.query(
        `SELECT 
          rd.id AS id_ingrediente, 
          rd.cantidad AS cantidad_necesaria, 
          i.stock, 
          i.nombre AS nombre_ingrediente
         FROM receta_detalle rd
         JOIN inventario i ON rd.id = i.id
         WHERE rd.id_receta = $1`,
        [id_receta]
      );

      // Buscar ingredientes insuficientes
      const ingredientesFaltantes = ingredientesResult.rows.filter(
        ing => ing.stock < (ing.cantidad_necesaria * cantidad)
      );

      if (ingredientesFaltantes.length > 0) {
        problemasStock[nombreReceta] = ingredientesFaltantes.map(ing => ({
          ingrediente: ing.nombre_ingrediente,
          necesario: ing.cantidad_necesaria * cantidad,
          disponible: ing.stock
        }));
      }
    }

    // Si hay problemas de stock, retornar error detallado
    if (Object.keys(problemasStock).length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Problemas de stock detectados',
        recetasInsuficientes: Object.keys(problemasStock),
        detalles: problemasStock
      });
    }

    // Segunda fase: procesamiento real
    for (const orden of ordenes) {
      const { no_mesa, id_receta, cantidad } = orden;

      // Insertar orden
      await client.query(
        `INSERT INTO ordenes 
         (no_mesa, id_receta, cantidad, fecha_hora) 
         VALUES ($1, $2, $3, NOW())`,
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
    }

    await client.query('COMMIT');
    res.status(201).json({ 
      success: true,
      message: 'Órdenes procesadas correctamente'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en POST /ordenes:', {
      message: err.message,
      stack: err.stack,
      query: req.query
    });
    
    res.status(500).json({ 
      error: 'Error al procesar órdenes',
      details: process.env.NODE_ENV === 'development' ? err.message : null
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