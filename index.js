const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  host: 'ep-late-sun-a4jb2jfv-pooler.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_vsX4QGV0ibwu',
  ssl: { rejectUnauthorized: false }
});

// Obtener todas las órdenes
app.get('/ordenes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordenes ORDER BY no_mesa, id_orden');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

// Obtener órdenes por mesa
app.get('/ordenes/mesa/:mesaNumero', async (req, res) => {
  const mesa = parseInt(req.params.mesaNumero);
  try {
    const resultado = await pool.query(`
      SELECT 
        o.id_orden,
        o.id_receta,
        r.nombre_receta,
        r.precio AS precio_receta,
        o.cantidad,
        o.fecha_hora
      FROM ordenes o
      JOIN recetas r ON o.id_receta = r.id_receta
      WHERE o.no_mesa = $1
      ORDER BY o.fecha_hora DESC
    `, [mesa]);

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener órdenes por mesa:', error);
    res.status(500).json({ error: 'Error al obtener órdenes por mesa' });
  }
});

// Crear orden
app.post('/ordenes', async (req, res) => {
  const { no_mesa, id_receta, cantidad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO ordenes (no_mesa, id_receta, cantidad, fecha_hora) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [no_mesa, id_receta, cantidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

// Actualizar orden
app.put('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  const { no_mesa, id_receta, cantidad } = req.body;
  try {
    const result = await pool.query(
      'UPDATE ordenes SET no_mesa = $1, id_receta = $2, cantidad = $3 WHERE id_orden = $4 RETURNING *',
      [no_mesa, id_receta, cantidad, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

// Eliminar orden
app.delete('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM ordenes WHERE id_orden = $1', [id]);
    res.json({ mensaje: 'Orden eliminada' });
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

// Obtener mesas únicas
app.get('/mesas', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT no_mesa FROM ordenes ORDER BY no_mesa');
    const mesas = result.rows.map(row => row.no_mesa);
    res.json(mesas);
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    res.status(500).json({ error: 'Error al obtener mesas' });
  }
});

// Obtener recetas
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
app.listen(port, () => {
  console.log(`✅ Backend corriendo en http://localhost:${port}`);
});
