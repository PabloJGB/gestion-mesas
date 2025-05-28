const API_URL = 'https://backend-mesas.onrender.com/ordenes';
let mesaActual = null;

const mesasDiv = document.getElementById('mesas');
const ordenesTableBody = document.querySelector('#ordenes tbody');
const ordenForm = document.getElementById('orden-form');
const ordenIdInput = document.getElementById('orden-id');
const cantidadInput = document.getElementById('cantidad');
const cancelEditBtn = document.getElementById('cancel-edit');
const recetaSelect = document.getElementById('id_receta');

async function cargarMesas() {
  try {
    const res = await fetch('https://backend-mesas.onrender.com/mesas');
    const mesas = await res.json();

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
  if (!recetaSelect) {
    console.warn('El elemento #id_receta no está presente en el DOM.');
    return;
  }

  try {
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
}

function seleccionarMesa(numero) {
  mesaActual = numero;
  document.getElementById('mesa-seleccionada').textContent = `Mesa ${numero}`;
  cargarOrdenesMesa();
}

async function cargarOrdenesMesa() {
  try {
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
}

ordenForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id = ordenIdInput.value;
  const id_receta = recetaSelect ? recetaSelect.value : null;
  const cantidad = parseInt(cantidadInput.value);

  if (!id_receta || !cantidad || cantidad < 1) {
    alert('Por favor completa correctamente los campos.');
    return;
  }

  if (!mesaActual) {
    alert('No hay mesa seleccionada.');
    return;
  }

  const ordenData = { mesa: mesaActual, id_receta, cantidad };

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
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fallo al eliminar');

    cargarOrdenesMesa();
  } catch (error) {
    alert('Error al eliminar la orden.');
    console.error(error);
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window.addEventListener('DOMContentLoaded', () => {
  cargarMesas();
  cargarRecetas();
});
