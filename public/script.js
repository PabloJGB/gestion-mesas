const API_URL = 'http://localhost:3000/ordenes';

const mesaSeleccionadaSpan = document.getElementById('mesaSeleccionada');
const tablaOrdenes = document.getElementById('tablaOrdenesExistentes');
const idRecetaInput = document.getElementById('idReceta');
const nombreRecetaInput = document.getElementById('nombreReceta');
const precioInput = document.getElementById('precio');
const cantidadInput = document.getElementById('cantidad');

actualizarTotalPedido(ordenesMesa); // O el nombre de tu array


// Selección de mesa
function seleccionarMesa(mesaId) {
  mesaSeleccionadaSpan.textContent = mesaId;
  cargarOrdenesMesa(mesaId);
}

function cargarOrdenesMesa(mesaId) {
  fetch(`${API_URL}?no_mesa=${mesaId}`)
    .then(res => res.json())
    .then(data => {
      tablaOrdenes.innerHTML = '';
      let total = 0;

      data.forEach(orden => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td>${orden.id_orden}</td>
          <td>${orden.id_receta}</td>
          <td>${orden.nombre_receta}</td>
          <td>${orden.precio}</td>
          <td>${orden.cantidad}</td>
          <td>${new Date(orden.fecha_hora).toLocaleString()}</td>
          <td>
            <button onclick="editarOrden(${orden.id_orden}, '${orden.nombre_receta}', ${orden.cantidad})">Editar</button>
            <button onclick="eliminarOrden(${orden.id_orden}, '${orden.nombre_receta}', ${orden.cantidad})">Eliminar</button>
          </td>
        `;

        tablaOrdenes.appendChild(tr);
        total += orden.precio * orden.cantidad;
      });

      document.getElementById('totalPedido').textContent = total.toFixed(2);
    });
}


// Selección de receta (autocompleta ID y precio)
function seleccionarReceta(nombre) {
  fetch(`${API_URL}/receta/${nombre}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        idRecetaInput.value = data.id_receta;
        precioInput.value = data.precio;
      }
    });
}

// Enviar orden a cocina
function enviarOrden() {
  const mesa = mesaSeleccionadaSpan.textContent;
  const idReceta = idRecetaInput.value;
  const cantidad = cantidadInput.value;

  if (!mesa || !idReceta || !cantidad) {
    alert('Completa todos los campos antes de enviar la orden.');
    return;
  }

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      no_mesa: mesa,
      id_receta: idReceta,
      cantidad: cantidad
    })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Orden enviada');
      cargarOrdenesMesa(mesa);
    });
}

// Editar una orden existente
function editarOrden(id, nombreReceta, cantidadActual) {
  const nuevaCantidad = prompt(`Editar cantidad para "${nombreReceta}". Cantidad actual: ${cantidadActual}`, cantidadActual);
  if (nuevaCantidad === null || nuevaCantidad === '' || isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
    alert('Edición cancelada o valor inválido.');
    return;
  }

  fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidad: nuevaCantidad })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Cantidad actualizada');
      cargarOrdenesMesa(parseInt(mesaSeleccionadaSpan.textContent));
    })
    .catch(err => alert('Error al editar orden'));
}

// Eliminar una orden existente
function eliminarOrden(id, nombreReceta, cantidad) {
  const confirmacion = confirm(`¿Seguro que deseas eliminar la orden de "${nombreReceta}" con cantidad ${cantidad}?`);
  if (!confirmacion) return;

  fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Orden eliminada');
      cargarOrdenesMesa(parseInt(mesaSeleccionadaSpan.textContent));
    })
    .catch(err => alert('Error al eliminar orden'));
}

function actualizarTotalPedido(ordenes) {
  let total = 0;
  ordenes.forEach(orden => {
    const precio = parseFloat(orden.precio);
    const cantidad = parseInt(orden.cantidad);
    if (!isNaN(precio) && !isNaN(cantidad)) {
      total += precio * cantidad;
    }
  });
  document.getElementById("totalPedido").textContent = total.toFixed(2);
}


// Exponer funciones al navegador (para onclick en HTML)
window.seleccionarMesa = seleccionarMesa;
window.seleccionarReceta = seleccionarReceta;
window.enviarOrden = enviarOrden;
window.editarOrden = editarOrden;
window.eliminarOrden = eliminarOrden;
