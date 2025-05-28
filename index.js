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

// Obtener órdenes por número de mesa
app.get('/ordenes/mesa/:numero', async (req, res) => {
  const no_mesa = parseInt(req.params.numero);
  if (!no_mesa) return res.status(400).json({ error: 'Número de mesa inválido' });

  try {
    const result = await pool.query(
      'SELECT * FROM ordenes WHERE no_mesa = $1 ORDER BY fecha_hora DESC',
      [no_mesa]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes por mesa:', error);
    res.status(500).json({ error: 'Error al obtener órdenes por mesa' });
  }
});

// Crear una nueva orden
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

app.get('/ordenes/mesa/:mesaNumero', async (req, res) => {
  const mesa = parseInt(req.params.mesaNumero);
  console.log('Mesa recibida:', mesa); // 👈 Asegúrate de ver esto

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
      WHERE o.no_mesa = $1;
    `, [mesa]);

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes por mesa' });
  }
});


// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Backend corriendo en http://localhost:${port}`);
});

const productoSelect = document.getElementById('producto');

async function cargarRecetas() {
  try {
    // Asumo que tienes un endpoint para traer las recetas
    const res = await fetch('https://backend-mesas.onrender.com/recetas');
    const recetas = await res.json();

    productoSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
    recetas.forEach(receta => {
      const option = document.createElement('option');
      option.value = receta.id_receta; // id_receta para el backend
      option.textContent = receta.nombre_receta;
      productoSelect.appendChild(option);
    });
  } catch (error) {
    alert('Error al cargar productos');
    console.error(error);
  }
}

async function cargarOrdenesMesa() {
  if (!mesaActual) return;

  try {
    const res = await fetch(`${API_URL}/mesa/${mesaActual}`);
    const ordenes = await res.json();
    ordenesTableBody.innerHTML = '';

    if (!ordenes.length) {
      ordenesTableBody.innerHTML = `<tr><td colspan="7">No hay órdenes para esta mesa.</td></tr>`;
      return;
    }

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
  } catch (error) {
    alert('Error al cargar órdenes');
    console.error(error);
  }
}

ordenForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id = ordenIdInput.value;
  const id_receta = productoSelect.value;
  const cantidad = parseInt(cantidadInput.value);

  if (!id_receta || !cantidad || cantidad < 1) {
    alert('Por favor completa correctamente los campos.');
    return;
  }

  if (!mesaActual) {
    alert('No hay mesa seleccionada.');
    return;
  }

  const ordenData = { no_mesa: mesaActual, id_receta, cantidad };

  try {
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
    alert('Error al guardar la orden.');
    console.error(error);
  }
});

function editarOrden(id, id_receta, cantidad) {
  ordenIdInput.value = id;
  productoSelect.value = id_receta;
  cantidadInput.value = cantidad;
  cancelEditBtn.style.display = 'inline-block';
}

// Llama a cargarRecetas al cargar la página y al seleccionar mesa para asegurar que estén cargadas
cargarMesas();
cargarRecetas();

