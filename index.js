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
const API_URL = 'https://backend-mesas.onrender.com/ordenes';
let mesaActual = null;

const mesasDiv = document.getElementById('mesas');
const ordenesTableBody = document.querySelector('#ordenes tbody');
const ordenForm = document.getElementById('orden-form');
const ordenIdInput = document.getElementById('orden-id');
const cantidadInput = document.getElementById('cantidad');
const cancelEditBtn = document.getElementById('cancel-edit');
const recetaSelect = document.getElementById('id_receta');

// Obtener todas las órdenes
app.get('/ordenes', async (req, res) => {
async function cargarMesas() {
  try {
    const result = await pool.query('SELECT * FROM ordenes ORDER BY no_mesa, id_orden');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});
    const res = await fetch('https://backend-mesas.onrender.com/mesas');
    const mesas = await res.json();

// Obtener órdenes por número de mesa (con detalles de receta)
app.get('/ordenes/mesa/:mesaNumero', async (req, res) => {
  const mesa = parseInt(req.params.mesaNumero);
  console.log('Mesa recibida:', mesa);
    mesasDiv.innerHTML = '';
    mesas.forEach(m => {
      const btn = document.createElement('button');
      btn.textContent = `Mesa ${m.numero}`;
      btn.onclick = () => seleccionarMesa(m.numero);
      mesasDiv.appendChild(btn);
    });
  } catch (err) {
    alert('Error al cargar mesas');
    console.error(err);
  }
}

async function cargarRecetas() {
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
    const res = await fetch('https://backend-mesas.onrender.com/recetas');
    const recetas = await res.json();

    recetaSelect.innerHTML = '';
    recetas.forEach(r => {
      const option = document.createElement('option');
      option.value = r.id_receta;
      option.textContent = `${r.nombre_receta} - Q${parseFloat(r.precio).toFixed(2)}`;
      recetaSelect.appendChild(option);
    });
  } catch (err) {
    alert('Error al cargar recetas');
    console.error(err);
  }
});
}

function seleccionarMesa(numero) {
  mesaActual = numero;
  document.getElementById('mesa-seleccionada').textContent = `Mesa ${numero}`;
  cargarOrdenesMesa();
}

// Crear una nueva orden
app.post('/ordenes', async (req, res) => {
  const { no_mesa, id_receta, cantidad } = req.body;
async function cargarOrdenesMesa() {
  try {
    const result = await pool.query(
      'INSERT INTO ordenes (no_mesa, id_receta, cantidad, fecha_hora) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [no_mesa, id_receta, cantidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear orden' });
    const res = await fetch(`${API_URL}/mesa/${mesaActual}`);
    const ordenes = await res.json();

    ordenesTableBody.innerHTML = '';
    ordenes.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id_orden}</td>
        <td>${o.id_receta}</td>
        <td>${escapeHtml(o.nombre_receta)}</td>
        <td>Q${parseFloat(o.precio_receta).toFixed(2)}</td>
        <td>${o.cantidad}</td>
        <td>${new Date(o.fecha_hora).toLocaleString()}</td>
        <td>
          <button onclick="editarOrden(${o.id_orden}, ${o.id_receta}, ${o.cantidad})">Editar</button>
          <button onclick="eliminarOrden(${o.id_orden})">Eliminar</button>
        </td>
      `;
      ordenesTableBody.appendChild(tr);
    });
  } catch (err) {
    alert('Error al cargar órdenes');
    console.error(err);
  }
});
}

// Actualizar una orden
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
ordenForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id = ordenIdInput.value;
  const id_receta = recetaSelect.value;
  const cantidad = parseInt(cantidadInput.value);

  if (!id_receta || !cantidad || cantidad < 1) {
    alert('Por favor completa correctamente los campos.');
    return;
  }
});

// Eliminar una orden
app.delete('/ordenes/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM ordenes WHERE id_orden = $1', [id]);
    res.json({ mensaje: 'Orden eliminada' });
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    res.status(500).json({ error: 'Error al eliminar orden' });
  if (!mesaActual) {
    alert('No hay mesa seleccionada.');
    return;
  }
});

// Obtener mesas únicas
app.get('/mesas', async (req, res) => {
  const ordenData = { mesa: mesaActual, id_receta, cantidad };

  try {
    const result = await pool.query('SELECT DISTINCT no_mesa FROM ordenes ORDER BY no_mesa');
    const mesas = result.rows.map(row => row.no_mesa);
    res.json(mesas);
    const res = await fetch(`${API_URL}${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ordenData)
    });

    if (!res.ok) throw new Error('Fallo al guardar');

    ordenForm.reset();
    ordenIdInput.value = '';
    cancelEditBtn.style.display = 'none';
    cargarOrdenesMesa();
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    res.status(500).json({ error: 'Error al obtener mesas' });
    alert('Error al guardar la orden.');
    console.error(error);
  }
});

// Obtener recetas
app.get('/recetas', async (req, res) => {
function editarOrden(id, id_receta, cantidad) {
  ordenIdInput.value = id;
  recetaSelect.value = id_receta;
  cantidadInput.value = cantidad;
  cancelEditBtn.style.display = 'inline-block';
}

cancelEditBtn.addEventListener('click', () => {
  ordenForm.reset();
  ordenIdInput.value = '';
  cancelEditBtn.style.display = 'none';
});

async function eliminarOrden(id) {
  if (!confirm('¿Eliminar esta orden?')) return;

  try {
    const result = await pool.query('SELECT id_receta, nombre_receta, precio FROM recetas ORDER BY nombre_receta');
    res.json(result.rows);
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fallo al eliminar');

    cargarOrdenesMesa();
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ error: 'Error al obtener recetas' });
    alert('Error al eliminar la orden.');
    console.error(error);
  }
});
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Backend corriendo en http://localhost:${port}`);
window.addEventListener('DOMContentLoaded', () => {
  cargarMesas();
  cargarRecetas();
});