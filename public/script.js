document.addEventListener("DOMContentLoaded", async () => {
  const API_URL = 'https://backend-mesas.onrender.com/ordenes';
  const RECETAS_URL = 'https://backend-mesas.onrender.com/recetas';

  const listaMesas = document.getElementById("listaMesas");
  const infoMesa = document.getElementById("infoMesa");
  const ordenesContainer = document.getElementById("ordenesContainer");

  const nombreComidaInput = document.getElementById("nombreComida");
  const idRecetaInput = document.getElementById("idReceta");
  const precioInput = document.getElementById("precio");
  const cantidadInput = document.getElementById("cantidad");

  const enviarOrdenBtn = document.getElementById("enviarOrden");

  let mesaActual = null;

  // Cargar mesas como números
  const mesas = Array.from({ length: 10 }, (_, i) => i + 1);
  mesas.forEach(numMesa => {
    const div = document.createElement("div");
    div.textContent = `Mesa ${numMesa}`;
    div.className = "mesa";
    div.addEventListener("click", async () => {
      mesaActual = numMesa;  // Guardamos número directamente
      infoMesa.textContent = `Órdenes para Mesa ${numMesa}`;
      await mostrarOrdenes(numMesa);
    });
    listaMesas.appendChild(div);
  });

  // Autocompletar nombre de comida
  nombreComidaInput.addEventListener("input", async () => {
    const nombre = nombreComidaInput.value.toLowerCase();

    try {
      const response = await fetch(RECETAS_URL);
      const recetas = await response.json();

      const receta = recetas.find(r => r.nombre_receta.toLowerCase() === nombre);
      if (receta) {
        idRecetaInput.value = receta.id_receta;
        precioInput.value = receta.precio;
      } else {
        idRecetaInput.value = "";
        precioInput.value = "";
      }
    } catch (error) {
      console.error("Error al obtener recetas:", error);
    }
  });

  // Enviar orden a cocina
  enviarOrdenBtn.addEventListener("click", async () => {
    if (!mesaActual) {
      alert("Por favor seleccione una mesa primero.");
      return;
    }

    // Validar inputs mínimos
    if (!idRecetaInput.value || !cantidadInput.value || cantidadInput.value <= 0) {
      alert("Por favor ingrese un producto válido y cantidad mayor a 0.");
      return;
    }

    const orden = {
      no_mesa: mesaActual,
      id_receta: parseInt(idRecetaInput.value),
      cantidad: parseInt(cantidadInput.value),
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orden),
      });
      // Limpiar inputs después de enviar
      nombreComidaInput.value = "";
      idRecetaInput.value = "";
      precioInput.value = "";
      cantidadInput.value = "";

      await mostrarOrdenes(mesaActual);
    } catch (error) {
      console.error("Error al enviar la orden:", error);
    }
  });

  // Eliminar orden
  async function eliminarOrden(idOrden) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta orden?')) return;

    try {
      const res = await fetch(`${API_URL}/${idOrden}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Orden eliminada exitosamente');
        await mostrarOrdenes(mesaActual);
      } else {
        alert('No se pudo eliminar la orden');
      }
    } catch (error) {
      console.error('Error al eliminar orden:', error);
      alert('Error al eliminar la orden');
    }
  }


  //Orden pendiente
  function eliminarOrdenPendiente(index) {
    if (confirm('¿Estás seguro de eliminar esta orden?')) {
      ordenesPendientes.splice(index, 1);
      renderizarTabla();
    }
  }




  // Mostrar órdenes por mesa
  async function mostrarOrdenes(mesa) {
    ordenesContainer.innerHTML = "";

    try {
      // Solicitar solo las órdenes de la mesa al backend
      const response = await fetch(`${API_URL}?no_mesa=${mesa}`);
      const ordenes = await response.json();

      if (ordenes.length === 0) {
        ordenesContainer.textContent = "No hay órdenes para esta mesa.";
        return;
      }

      ordenes.forEach(orden => {
        const div = document.createElement("div");
        div.innerHTML = `
          <strong>Orden:</strong> ${orden.id_orden}<br>
          <strong>Receta:</strong> ${orden.nombre_receta}<br>
          <strong>Precio:</strong> Q.${orden.precio_receta.toFixed(2)}<br>
          <strong>Cantidad:</strong> ${orden.cantidad}<br>
          <strong>Fecha:</strong> ${new Date(orden.fecha_hora).toLocaleString()}<br>
          <button onclick="eliminarOrden(${orden.id_orden})">Eliminar</button>
          <hr>
        `;
        ordenesContainer.appendChild(div);
      });
    } catch (error) {
      console.error("Error al mostrar órdenes:", error);
      ordenesContainer.textContent = "No se pudieron cargar las órdenes.";
    }
  }

  // Exponer eliminarOrden para botón inline
  window.eliminarOrden = eliminarOrden;
});
