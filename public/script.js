document.addEventListener('DOMContentLoaded', () => {
  const recetasSelect = document.getElementById('nombreReceta');
  const idRecetaInput = document.getElementById('idReceta');
  const precioInput = document.getElementById('precio');
  const cantidadInput = document.getElementById('cantidad');
  const enviarBtn = document.getElementById('enviarBtn');
  const ordenesBody = document.getElementById('ordenesBody');

  const mesaActual = 1; // Puedes cambiar esto si manejas varias mesas

  let recetasMap = {}; // Guardar recetas por nombre para acceso rápido

document.addEventListener('DOMContentLoaded', () => {
  const mesasContainer = document.getElementById('mesasContainer');
  let mesaActual = null;

  // Obtener mesas desde el backend
  fetch('https://backend-mesas.onrender.com/mesas')
    .then(res => res.json())
    .then(mesas => {
      mesas.forEach(mesa => {
  const btn = document.createElement('button');
  btn.textContent = `Mesa ${mesa.noMesa}`;
  btn.classList.add('btn-mesa');
  btn.addEventListener('click', () => {
    mesaActual = mesa.noMesa;
    mesaSeleccionadaTexto.textContent = `Mesa seleccionada: ${mesa.noMesa}`;
    cargarOrdenes();

    // Quitar clase 'activa' a todos los botones
    document.querySelectorAll('.btn-mesa').forEach(b => b.classList.remove('activa'));
    // Agregar clase 'activa' al botón seleccionado
    btn.classList.add('btn-mesa');
  });
  mesasContainer.appendChild(btn);
});

    });

  // Tu código actual...
  // Reemplaza esto:
  // const mesaActual = 1;
  // por esto:
  // let mesaActual = null; (ya está arriba)

  // Asegúrate de que cargarOrdenes use `mesaActual` correctamente
  function cargarOrdenes() {
    if (!mesaActual) return;
    ordenesBody.innerHTML = '';
    fetch(`https://backend-mesas.onrender.com/ordenes?mesa=${mesaActual}`)
      .then(response => response.json())
      .then(data => {
        data.forEach(orden => {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td>${orden.idOrden}</td>
            <td>${orden.idReceta}</td>
            <td>${orden.nombreReceta}</td>
            <td>${orden.precio.toFixed(2)}</td>
            <td>${orden.cantidad}</td>
            <td>${orden.fechaHora.replace('T', ' ').slice(0, 19)}</td>
          `;
          ordenesBody.appendChild(fila);
        });
      });
  }

  // Agrega esta línea dentro del evento de enviar:
  // if (!mesaActual) { alert('Selecciona una mesa.'); return; }

  // Asegúrate de que enviar use `mesaActual`:
  // const orden = { noMesa: mesaActual, ... };
});


  // Obtener recetas y llenar el select
  fetch('https://backend-mesas.onrender.com/recetas')
    .then(response => response.json())
    .then(data => {
      data.forEach(receta => {
        recetasMap[receta.nombreReceta] = receta;
        const option = document.createElement('option');
        option.value = receta.nombreReceta;
        option.textContent = receta.nombreReceta;
        recetasSelect.appendChild(option);
      });
    });

  // Al seleccionar una receta, precargar ID y precio
  recetasSelect.addEventListener('change', () => {
    const recetaSeleccionada = recetasMap[recetasSelect.value];
    if (recetaSeleccionada) {
      idRecetaInput.value = recetaSeleccionada.idReceta;
      precioInput.value = recetaSeleccionada.precio;
    } else {
      idRecetaInput.value = '';
      precioInput.value = '';
    }
  });

  // Enviar orden a la base de datos
  enviarBtn.addEventListener('click', () => {
    const idReceta = parseInt(idRecetaInput.value);
    const cantidad = parseInt(cantidadInput.value);
    const fechaHora = new Date().toISOString().slice(0, 19).replace('T', ' '); // formato: YYYY-MM-DD HH:MM:SS

    if (!idReceta || !cantidad) {
      alert('Completa todos los campos antes de enviar.');
      return;
    }

    const orden = {
      noMesa: mesaActual,
      idReceta: idReceta,
      cantidad: cantidad,
      fechaHora: fechaHora
    };

    fetch('https://backend-mesas.onrender.com/ordenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orden)
    })
      .then(res => res.text())
      .then(msg => {
        alert('Orden enviada');
        cantidadInput.value = '';
        recetasSelect.value = '';
        idRecetaInput.value = '';
        precioInput.value = '';
        cargarOrdenes(); // refrescar tabla
      })
      .catch(err => console.error('Error al enviar orden:', err));
  });

  // Cargar órdenes por mesa
  function cargarOrdenes() {
    ordenesBody.innerHTML = '';
    fetch(`https://backend-mesas.onrender.com/ordenes?mesa=${mesaActual}`)
      .then(response => response.json())
      .then(data => {
        data.forEach(orden => {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td>${orden.idOrden}</td>
            <td>${orden.idReceta}</td>
            <td>${orden.nombreReceta}</td>
            <td>${orden.precio.toFixed(2)}</td>
            <td>${orden.cantidad}</td>
            <td>${orden.fechaHora.replace('T', ' ').slice(0, 19)}</td>
          `;
          ordenesBody.appendChild(fila);
        });
      });
  }

  async function editarCantidad(idOrden, nuevaCantidad) {
  const confirmado = confirm(`¿Editar cantidad de orden #${idOrden} a ${nuevaCantidad}?`);
  if (!confirmado) return;

  await fetch(`${API_URL}/${idOrden}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidad: parseInt(nuevaCantidad) })
  });

  alert('Cantidad actualizada');
  cargarOrdenesExistentes(mesaActual);
}

async function eliminarOrden(idOrden) {
  const confirmado = confirm(`¿Eliminar orden #${idOrden}?`);
  if (!confirmado) return;

  await fetch(`${API_URL}/${idOrden}`, { method: 'DELETE' });
  alert('Orden eliminada');
  cargarOrdenesExistentes(mesaActual);
}

  

  // Inicial
  cargarOrdenes();
});
