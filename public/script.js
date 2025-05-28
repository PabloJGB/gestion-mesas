const API_URL = 'http://localhost:3000/ordenes';
const API_RECETAS = 'http://localhost:3000/recetas';

const mesaActual = 1;
const idOrdenEditar = null;

const recetaSelect = document.getElementById('id_receta');
const cantidadInput = document.getElementById('cantidad');
const formOrden = document.getElementById('formOrden');

async function cargarRecetas() {
  try {
    const res = await fetch(API_RECETAS);
    if (!res.ok) throw new Error('Error al cargar recetas');
    const recetas = await res.json();

    recetaSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
    recetas.forEach(r => {
      const option = document.createElement('option');
      option.value = r.id_receta;
      option.textContent = `${r.nombre_receta} - Q${parseFloat(r.precio).toFixed(2)}`;
      recetaSelect.appendChild(option);
    });
  } catch (error) {
    alert('No se pudieron cargar los productos');
    console.error(error);
  }
}

formOrden.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id_receta = parseInt(recetaSelect.value);
  const cantidad = parseInt(cantidadInput.value);

  if (!id_receta || cantidad < 1) {
    alert('Por favor, selecciona un producto y una cantidad válida.');
    return;
  }

  const dataOrden = {
    no_mesa: mesaActual,
    id_receta,
    cantidad
  };

  try {
    const url = idOrdenEditar ? `${API_URL}/${idOrdenEditar}` : API_URL;
    const method = idOrdenEditar ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataOrden)
    });

    if (!res.ok) throw new Error('Error al guardar la orden');

    alert('Orden guardada con éxito');
    formOrden.reset();

  } catch (error) {
    alert('Hubo un problema guardando la orden');
    console.error(error);
  }
});

cargarRecetas();
