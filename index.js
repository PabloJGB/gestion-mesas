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

// Obtener órdenes (todas o por mesa si se especifica no_mesa)
app.get('/ordenes', async (req, res) => {
  const noMesa = req.query.no_mesa;
  let query = 'SELECT * FROM ordenes';
  let params = [];

  if (noMesa) {
    query += ' WHERE no_mesa = ?';
    params.push(noMesa);
  }

  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo órdenes' });
  }
});



async function cargarOrdenesExistentes(noMesa) {
  try {
    const res = await fetch(`${API_URL}?no_mesa=${noMesa}`);
    if (!res.ok) throw new Error('No se pudieron cargar órdenes');
    const ordenes = await res.json();
    tablaOrdenes.innerHTML = '';
    ordenes.forEach(orden => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${orden.id_orden}</td>
        <td>${orden.id_receta}</td>
        <td>${orden.nombre_receta}</td>
        <td>${orden.precio}</td>
        <td>
          <input type="number" min="1" value="${orden.cantidad}" 
            onchange="editarCantidad(${orden.id_orden}, this.value)">
        </td>
        <td>${new Date(orden.fecha_hora).toLocaleString()}</td>
        <td><button onclick="eliminarOrden(${orden.id_orden})">Eliminar</button></td>
      `;
      tablaOrdenes.appendChild(row);
    });
  } catch (error) {
    alert('Error cargando órdenes: ' + error.message);
  }
}




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
