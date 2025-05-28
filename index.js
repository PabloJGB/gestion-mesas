const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: 'ep-late-sun-a4jb2jfv-pooler.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_vsX4QGV0ibwu',
  ssl: { rejectUnauthorized: false }
});

// Obtener todas las recetas
app.get('/recetas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recetas ORDER BY id_receta');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// Crear una orden nueva
app.post('/ordenes', async (req, res) => {
  try {
    const { no_mesa, id_receta, cantidad } = req.body;
    if (!no_mesa || !id_receta || !cantidad) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const query = `
      INSERT INTO ordenes (no_mesa, id_receta, cantidad, fecha)
      VALUES ($1, $2, $3, NOW())
      RETURNING id_orden, no_mesa, id_receta, cantidad, fecha
    `;
    const values = [no_mesa, id_receta, cantidad];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

// Actualizar una orden existente
app.put('/ordenes/:id', async (req, res) => {
  try {
    const id_orden = req.params.id;
    const { no_mesa, id_receta, cantidad } = req.body;
    if (!no_mesa || !id_receta || !cantidad) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const query = `
      UPDATE ordenes
      SET no_mesa = $1, id_receta = $2, cantidad = $3, fecha = NOW()
      WHERE id_orden = $4
      RETURNING id_orden, no_mesa, id_receta, cantidad, fecha
    `;
    const values = [no_mesa, id_receta, cantidad, id_orden];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
