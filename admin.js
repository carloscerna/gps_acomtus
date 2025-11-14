/*
 * admin.js (ACTUALIZADO CON CÁLCULO DE DISTANCIA)
 */

// 1. Inicializar el mapa
const map = L.map('mapa-admin').setView([13.7000, -89.2200], 13);

// 2. Añadir la capa base del mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// 3. Capa para almacenar los dibujos
const drawnItems = new L.FeatureGroup().addTo(map);

// 4. Inicializar el Control de Dibujo
const drawControl = new L.Control.Draw({
    edit: false,
    draw: {
        polyline: true,
        polygon: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
    }
});
map.addControl(drawControl);

// 5. Cargar las rutas en el <select>
document.addEventListener('DOMContentLoaded', function() {
    cargarRutasAdmin();
});

function cargarRutasAdmin() {
    fetch('api/get_rutas.php')
        .then(response => response.json())
        .then(rutas => {
            const selector = document.getElementById('selectorRutaAdmin');
            selector.innerHTML = '<option value="0" disabled selected>-- Elige una ruta para editar --</option>'; 
            rutas.forEach(ruta => {
                const opcion = document.createElement('option');
                opcion.value = ruta.id_ruta;
                opcion.textContent = ruta.descripcion;
                selector.appendChild(opcion);
            });
        })
        .catch(error => {
            mostrarAlertaAdmin('Error al cargar la lista de rutas.', 'danger');
        });
}

// 6. Evento 'draw:created' (MODIFICADO)
map.on('draw:created', function (e) {
    const layer = e.layer;
    drawnItems.addLayer(layer);

    const selector = document.getElementById('selectorRutaAdmin');
    const rutaId = selector.value;

    if (rutaId === "0") {
        mostrarAlertaAdmin("¡Error! Por favor, selecciona una ruta del menú ANTES de dibujar.", 'danger');
        drawnItems.removeLayer(layer);
        return;
    }

    // --- ¡NUEVO! CÁLCULO DE DISTANCIA ---
    const latLngs = layer.getLatLngs(); // Obtener los puntos dibujados
    let totalDistance = 0;

    // Recorrer los puntos y sumar la distancia entre ellos
    // Leaflet map.distance() devuelve la distancia en METROS
    for (let i = 0; i < latLngs.length - 1; i++) {
        totalDistance += map.distance(latLngs[i], latLngs[i + 1]);
    }
    
    // Convertir a kilómetros y redondear a 2 decimales
    const totalKm = parseFloat((totalDistance / 1000).toFixed(2));
    
    // ------------------------------------

    // Formatear coordenadas (igual que antes)
    const coordenadasFormateadas = latLngs.map(latlng => {
        return [
            parseFloat(latlng.lat.toFixed(7)), 
            parseFloat(latlng.lng.toFixed(7))
        ];
    });

    // ¡MODIFICADO! Enviar el nuevo dato 'totalKm'
    guardarRutaEnBaseDatos(rutaId, coordenadasFormateadas, layer, totalKm);
});


/**
 * Envía los datos al backend (MODIFICADO)
 * @param {string} id - El id_ruta
 * @param {Array} coordenadas - El array de [lat, lng]
 * @param {L.Layer} layer - La capa de Leaflet
 * @param {number} distancia - ¡NUEVO! La distancia calculada en KM
 */
async function guardarRutaEnBaseDatos(id, coordenadas, layer, distancia) {
    
    // ¡MODIFICADO! Mostrar la distancia en la alerta
    mostrarAlertaAdmin(`Guardando ruta... (Distancia calculada: ${distancia} km)`, 'info');

    // ¡MODIFICADO! Añadir la distancia al objeto que se envía
    const datosParaEnviar = {
        ruta_id: parseInt(id),
        coordenadas: coordenadas,
        distancia_km: distancia // <-- ¡NUEVO DATO!
    };

    try {
        const respuesta = await fetch('api/guardar_trazado.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosParaEnviar)
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            mostrarAlertaAdmin(resultado.message, 'success');
            setTimeout(() => drawnItems.removeLayer(layer), 2000);
        } else {
            throw new Error(resultado.error || 'Error desconocido del servidor.');
        }

    } catch (error) {
        console.error('Error en fetch:', error);
        mostrarAlertaAdmin('¡Error grave! No se pudo guardar la ruta.\n' + error.message, 'danger');
        drawnItems.removeLayer(layer);
    }
}


/**
 * Muestra una alerta de Bootstrap (función igual que antes)
 */
function mostrarAlertaAdmin(message, type) {
    const alertContainer = document.getElementById('alert-container-admin');
    if (alertContainer) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHTML;
    }
}