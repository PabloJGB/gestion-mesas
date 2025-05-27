const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL (Neon.tech)
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
    const result = await pool.query('SELECT * FROM ordenes ORDER BY mesa, id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

// Obtener órdenes por número de mesa
app.get('/ordenes/mesa/:numero', async (req, res) => {
  const mesa = parseInt(req.params.numero);
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

app.listen(port, () => {
  console.log(`✅ Backend corriendo en http://localhost:${port}`);
});

// Ejemplo express para GET /ordenes/mesa/:numero
app.get('/ordenes/mesa/:mesa', async (req, res) => {
    const mesa = parseInt(req.params.mesa);
    if (!mesa) return res.status(400).json({ error: 'Número de mesa inválido' });
  
    const ordenes = await pool.query(
      'SELECT * FROM ordenes WHERE mesa = $1 ORDER BY fecha DESC',
      [mesa]
    );
    res.json(ordenes.rows);
  });

  app.get('/mesas', async (req, res) => {
    try {
      // Obtener números de mesa únicos de la tabla ordenes
      const result = await pool.query('SELECT DISTINCT mesa FROM ordenes ORDER BY mesa');
      const mesas = result.rows.map(row => row.mesa);
      res.json(mesas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener mesas' });
    }
  });
  
 

// Cargar mesas desde backend y llenar el select
async function cargarMesas() {
  try {
    const res = await fetch('http://localhost:3000/mesas');
    const mesas = await res.json();

    mesaSelect.innerHTML = '<option value="" disabled selected>Selecciona una mesa</option>';
    mesas.forEach(mesa => {
      const option = document.createElement('option');
      option.value = mesa;
      option.textContent = mesa;
      mesaSelect.appendChild(option);
    });

    entrarMesaBtn.disabled = false;
  } catch (error) {
    mesaSelect.innerHTML = '<option value="" disabled>Error cargando mesas</option>';
    console.error(error);
  }
}

app.get('/mesas', async (req, res) => {
    try {
      const result = await pool.query('SELECT DISTINCT mesa FROM ordenes ORDER BY mesa');
      const mesas = result.rows.map(row => row.mesa);
      res.json(mesas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener mesas' });
    }
  });

  fetch('http://localhost:3000/mesas')
  .then(response => response.json())
  .then(data => {
    console.log('Mesas:', data);
    // Aquí llenas el select con las mesas
  })
  .catch(error => console.error('Error al cargar mesas:', error));

  async function cargarMesas() {
    try {
      const res = await fetch(`${API_URL}/mesas`);
      const mesas = await res.json();
      
      const lista = document.getElementById('listaMesas');
      lista.innerHTML = '';
  
      mesas.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `Mesa ${m.numero}`;
        li.style.cursor = 'pointer';
        li.style.marginBottom = '5px';
        li.onclick = () => entrarMesa(m.numero);
        lista.appendChild(li);
      });
    } catch (error) {
      alert('Error cargando las mesas');
      console.error(error);
    }
  }
  