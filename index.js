const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta raíz para confirmar que el servidor está activo
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// Configuración de conexión a PostgreSQL (Neon.tech)
const pool = new Pool({
  host: 'ep-late-sun-a4jb2jfv-pooler.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_vsX4QGV0ibwu',
  ssl: { rejectUnauthorized: false }
});

// Ruta raíz para prueba
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// Obtener todas las órdenes
app.get('/ordenes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordenes ORDER BY mesa, id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

// Obtener órdenes por número de mesa (solo una ruta)
app.get('/ordenes/mesa/:numero', async (req, res) => {
  const mesa = parseInt(req.params.numero);
  if (!mesa) return res.status(400).json({ error: 'Número de mesa inválido' });

  try {
    const result = await pool.query('SELECT * FROM ordenes WHERE mesa = $1 ORDER BY id', [mesa]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes por mesa:', error);
    res.status(500).json({ error: 'Error al obtener órdenes por mesa' });
  }
});

// Crear una nueva orden
app.post('/ordenes', async (req, res) => {
  const { mesa, producto, cantidad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO ordenes (mesa, producto, cantidad) VALUES ($1, $2, $3) RETURNING *',
      [mesa, producto, cantidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

// Actualizar una orden
app.put('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  const { mesa, producto, cantidad } = req.body;
  try {
    const result = await pool.query(
      'UPDATE ordenes SET mesa = $1, producto = $2, cantidad = $3 WHERE id = $4 RETURNING *',
      [mesa, producto, cantidad, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

// Eliminar una orden
app.delete('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM ordenes WHERE id = $1', [id]);
    res.json({ mensaje: 'Orden eliminada' });
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

// Obtener números de mesa únicos
app.get('/mesas', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT mesa FROM ordenes ORDER BY mesa');
    const mesas = result.rows.map(row => row.mesa);
    res.json(mesas);
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    res.status(500).json({ error: 'Error al obtener mesas' });
  }
});

app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

app.listen(port, () => {
  console.log(`✅ Backend corriendo en http://localhost:${port}`);
});