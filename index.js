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
      precio: parseFloat(row.precio).toFixed(2), // Asegurar formato de precio
      fecha_hora: new Date(row.fecha_hora).toISOString() // Formatear fecha
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

// Endpoints CRUD (solo una implementación de cada)
app.post('/ordenes', async (req, res) => {
  const { no_mesa, id_receta, cantidad } = req.body;

  if (!no_mesa || !id_receta || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la receta exista
    const recetaCheck = await client.query(
      'SELECT nombre_receta FROM recetas WHERE id_receta = $1',
      [id_receta]
    );

    if (recetaCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Obtener ingredientes y cantidades necesarias
    const ingredientes = await client.query(
      `SELECT rd.id AS id_ingrediente, rd.cantidad, i.stock, i.ingrediente
       FROM receta_detalle rd
       JOIN inventario i ON rd.id = i.id
       WHERE rd.id_receta = $1`,
      [id_receta]
    );

    // Verificar si hay suficiente stock para cada ingrediente
    const faltantes = ingredientes.rows.filter(ing => {
      const cantidadTotal = ing.cantidad * cantidad;
      return ing.stock < cantidadTotal;
    });

    if (faltantes.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Stock insuficiente para uno o más ingredientes',
        faltantes: faltantes.map(f => ({
          ingrediente: f.ingrediente,
          requerido: f.cantidad * cantidad,
          disponible: f.stock
        }))
      });
    }

    // Insertar la orden
    const insertOrden = await client.query(
      `INSERT INTO ordenes 
       (no_mesa, id_receta, cantidad, fecha_hora) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id_orden`,
      [no_mesa, id_receta, cantidad]
    );

    // Descontar el stock
    for (const ing of ingredientes.rows) {
      const cantidadTotal = ing.cantidad * cantidad;
      await client.query(
        `UPDATE inventario 
         SET stock = stock - $1 
         WHERE id = $2`,
        [cantidadTotal, ing.id_ingrediente]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Orden agregada y stock actualizado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar orden y descontar inventario:', err);
    res.status(500).json({ error: 'Error al registrar orden y descontar inventario' });
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

app.post('/ordenes', async (req, res) => {
  const { no_mesa, id_receta, cantidad } = req.body;

  if (!no_mesa || !id_receta || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la receta existe
    const recetaExists = await client.query(
      'SELECT 1 FROM recetas WHERE id_receta = $1', 
      [id_receta]
    );
    if (recetaExists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Insertar la orden
    const insertOrden = await client.query(
      `INSERT INTO ordenes (no_mesa, id_receta, cantidad, fecha_hora)
       VALUES ($1, $2, $3, NOW())
       RETURNING id_orden, no_mesa, id_receta, cantidad, fecha_hora`,
      [no_mesa, id_receta, cantidad]
    );

    // Obtener los ingredientes y cantidades por receta
    const ingredientes = await client.query(`
      SELECT id, cantidad
      FROM receta_detalle
      WHERE id_receta = $1
    `, [id_receta]);

    // Actualizar inventario
    for (const row of ingredientes.rows) {
      const idIngrediente = row.id;
      const cantidadNecesaria = parseFloat(row.cantidad) * parseFloat(cantidad); // multiplicar por cantidad de recetas

      await client.query(`
        UPDATE inventario
        SET cantidad = cantidad - $1
        WHERE id = $2
      `, [cantidadNecesaria, idIngrediente]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      orden: insertOrden.rows[0],
      message: 'Orden agregada y stock actualizado correctamente'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en POST /ordenes con descuento de inventario:', err);
    res.status(500).json({ error: 'Error al guardar la orden o actualizar inventario' });
  } finally {
    client.release();
  }
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});