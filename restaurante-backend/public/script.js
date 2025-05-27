const mesaSelect = document.getElementById('mesaSelect');
const entrarMesaBtn = document.getElementById('entrarMesa');
const mesaSection = document.getElementById('mesaSection');
const ordenesSection = document.getElementById('ordenesSection');
const mesaSeleccionadaSpan = document.getElementById('mesaSeleccionada');
const volverMesaBtn = document.getElementById('volverMesa');
const ordenesList = document.getElementById('ordenesList');

let mesaActual = null;

async function cargarMesas() {
  try {
    const res = await fetch('/mesas');
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

async function cargarOrdenesMesa() {
  if (!mesaActual) return;
  try {
    const res = await fetch(`/ordenes/mesa/${mesaActual}`);
    const ordenes = await res.json();

    ordenesList.innerHTML = '';

    if (ordenes.length === 0) {
      ordenesList.textContent = 'No hay órdenes para esta mesa.';
      return;
    }

    ordenes.forEach(orden => {
      const div = document.createElement('div');
      div.textContent = `${orden.producto} — Cantidad: ${orden.cantidad} — Fecha: ${new Date(orden.fecha).toLocaleString()}`;
      ordenesList.appendChild(div);
    });
  } catch (error) {
    ordenesList.textContent = 'Error al cargar órdenes.';
    console.error(error);
  }
}

entrarMesaBtn.addEventListener('click', () => {
  const selectedMesa = mesaSelect.value;
  if (!selectedMesa) {
    alert('Por favor selecciona una mesa');
    return;
  }
  mesaActual = parseInt(selectedMesa);
  mesaSeleccionadaSpan.textContent = mesaActual;

  mesaSection.style.display = 'none';
  ordenesSection.style.display = 'block';

  cargarOrdenesMesa();
});

volverMesaBtn.addEventListener('click', () => {
  mesaActual = null;
  mesaSeleccionadaSpan.textContent = '';
  ordenesSection.style.display = 'none';
  mesaSection.style.display = 'block';
});

window.onload = cargarMesas;

function entrarMesa(num) {
    mesaActual = num;
    mesaSeleccionadaSpan.textContent = mesaActual;
    mesaSection.style.display = 'none';
    ordenesSection.style.display = 'block';
    cargarOrdenesMesa();
  }
  