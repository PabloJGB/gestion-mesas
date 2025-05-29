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
  try {
    const result = await pool.query(
      'INSERT INTO ordenes (no_mesa, id_receta, cantidad, fecha_hora) VALUES ($1, $2, $3, NOW()) RETURNING id_orden',
      [no_mesa, id_receta, cantidad]
    );
    res.status(201).json({ message: 'Orden agregada', id: result.rows[0].id_orden });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando orden' });
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
  
  // Validación adicional
  if (!no_mesa || !id_receta || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Verificar que la receta exista
    const recetaExists = await pool.query(
      'SELECT 1 FROM recetas WHERE id_receta = $1', 
      [id_receta]
    );
    
    if (recetaExists.rows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Insertar la orden
    const result = await pool.query(
      `INSERT INTO ordenes 
       (no_mesa, id_receta, cantidad, fecha_hora) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id_orden, no_mesa, id_receta, cantidad, fecha_hora`,
      [no_mesa, id_receta, cantidad]
    );

    res.status(201).json({ 
      success: true,
      orden: result.rows[0],
      message: 'Orden agregada correctamente' 
    });
    
  } catch (err) {
    console.error('Error en POST /ordenes:', {
      error: err.message,
      query: err.query,
      stack: err.stack
    });
    
    res.status(500).json({ 
      error: 'Error al guardar la orden',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});