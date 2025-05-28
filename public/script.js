document.addEventListener('DOMContentLoaded', () => {
  const recetasSelect = document.getElementById('nombreReceta');
  const idRecetaInput = document.getElementById('idReceta');
  const precioInput = document.getElementById('precio');
  const cantidadInput = document.getElementById('cantidad');
  const enviarBtn = document.getElementById('enviarBtn');
  const ordenesBody = document.getElementById('ordenesBody');
  const mesasContainer = document.getElementById('mesasContainer');
  const mesaSeleccionadaTexto = document.getElementById('mesaSeleccionada');

  let recetasMap = {};
  let mesaActual = null;

  // Obtener recetas
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

  // Precargar ID y precio
  recetasSelect.addEventListener('change', () => {
    const receta = recetasMap[recetasSelect.value];
    idRecetaInput.value = receta ? receta.idReceta : '';
    precioInput.value = receta ? receta.precio : '';
  });

  // Obtener mesas y crear botones
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
        });
        mesasContainer.appendChild(btn);
      });
    })
    .catch(err => {
      console.error('Error al cargar mesas:', err);
    });

  // Enviar orden
  enviarBtn.addEventListener('click', () => {
    const idReceta = parseInt(idRecetaInput.value);
    const cantidad = parseInt(cantidadInput.value);
    const fechaHora = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (!mesaActual) return alert('Selecciona una mesa');
    if (!idReceta || !cantidad) return alert('Completa todos los campos');

    const orden = { noMesa: mesaActual, idReceta, cantidad, fechaHora };

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
        cargarOrdenes();
      })
      .catch(err => console.error('Error al enviar orden:', err));
  });

  // Cargar órdenes
  function cargarOrdenes() {
    ordenesBody.innerHTML = '';
    if (!mesaActual) return;
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
});
