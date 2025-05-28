
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

  // Cargar mesas
  const mesas = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
  mesas.forEach(mesa => {
    const div = document.createElement("div");
    div.textContent = mesa;
    div.className = "mesa";
    div.addEventListener("click", async () => {
      mesaActual = mesa;
      infoMesa.textContent = `Órdenes para ${mesa}`;
      await mostrarOrdenes(mesa);
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

    const orden = {
      id_receta: parseInt(idRecetaInput.value),
      nombre_receta: nombreComidaInput.value,
      precio: parseFloat(precioInput.value),
      cantidad: parseInt(cantidadInput.value),
      mesa: mesaActual,
      fecha_hora: new Date().toISOString(),
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orden),
      });
      await mostrarOrdenes(mesaActual);
    } catch (error) {
      console.error("Error al enviar la orden:", error);
    }
  });


//eliminar orden
  async function eliminarOrden(idOrden) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta orden?')) return;

  try {
    const res = await fetch(`${API_URL}/${idOrden}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Orden eliminada exitosamente');
      cargarOrdenesExistentes(mesaActual);
    } else {
      alert('No se pudo eliminar la orden');
    }
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    alert('Error al eliminar la orden');
  }
}


  // Mostrar órdenes por mesa
  async function mostrarOrdenes(mesa) {
    ordenesContainer.innerHTML = "";

    try {
      const response = await fetch(API_URL);
      const ordenes = await response.json();

      const responseRecetas = await fetch(RECETAS_URL);
      const recetas = await responseRecetas.json();
      const recetasPorId = Object.fromEntries(recetas.map(r => [r.id_receta, r]));

      const ordenesMesa = ordenes.filter(o => o.mesa === mesa);

      if (ordenesMesa.length === 0) {
        ordenesContainer.textContent = "No hay órdenes para esta mesa.";
        return;
      }

      ordenesMesa.forEach(orden => {
        const receta = recetasPorId[orden.id_receta];
        const div = document.createElement("div");
        div.innerHTML = `
          <strong>Orden:</strong> ${orden.id_orden}<br>
          <strong>Receta:</strong> ${receta?.nombre_receta || "Desconocida"}<br>
          <strong>Precio:</strong> Q.${receta?.precio?.toFixed(2) || "0.00"}<br>
          <strong>Cantidad:</strong> ${orden.cantidad}<br>
          <strong>Fecha:</strong> ${new Date(orden.fecha_hora).toLocaleString()}<br><hr>
        `;
        ordenesContainer.appendChild(div);
      });
    } catch (error) {
      console.error("Error al mostrar órdenes:", error);
      ordenesContainer.textContent = "No se pudieron cargar las órdenes.";
    }
  }

  
});

