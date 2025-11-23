// admin.js - Lógica para el Editor de Trazados

document.addEventListener('DOMContentLoaded', function() {
// --- 0. CONFIGURACIÓN: UBICACIÓN POR DEFECTO (EMPRESA) ---
    // ¡CAMBIA ESTOS VALORES POR LOS DE TU EMPRESA!
    const COORD_EMPRESA_LAT = 13.977492366594602; // Latitud ejemplo
    const COORD_EMPRESA_LNG = -89.58093094962483; // Longitud ejemplo
    const ZOOM_INICIAL = 14; // Un zoom más cercano para ver la terminal

    // --- 1. Inicializar el Mapa ---
    // Usamos las variables que acabamos de crear
    const map = L.map('mapa-admin').setView([COORD_EMPRESA_LAT, COORD_EMPRESA_LNG], ZOOM_INICIAL);

// --- ¡NUEVO! MARCADOR DE LA EMPRESA (Fijo) ---
    const iconoEmpresaAdmin = L.icon({
        iconUrl: 'img/logo_acomtus.png', // <--- ¡Verifica la ruta!
        iconSize:     [32, 32], // Quizás un poco más pequeño para el admin
        iconAnchor:   [16, 32], 
        popupAnchor:  [0, -32]
    });

    // Este marcador NO se añade a 'drawnItems' porque no queremos que se pueda editar/borrar
    L.marker([COORD_EMPRESA_LAT, COORD_EMPRESA_LNG], {icon: iconoEmpresaAdmin})
        .addTo(map)
        .bindPopup("<b>Base Acomtus</b>");
    // ---------------------------------------------

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);


    // --- 2. Configurar Leaflet.draw (Herramientas de Dibujo) ---
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
        draw: {
            polyline: {
                shapeOptions: { color: '#0d6efd', weight: 5 },
                metric: true
            },
            polygon: false, circle: false, rectangle: false, marker: false, circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    map.addControl(drawControl);


    // --- 3. Variables Globales ---
    const selectorRuta = document.getElementById('selectorRutaAdmin');
    let rutaSeleccionadaId = null;


    // --- 4. Inicialización ---
    cargarListadoRutas();


    // --- 5. Event Listeners ---

    // A) Cambio de ruta
    selectorRuta.addEventListener('change', function(e) {
        rutaSeleccionadaId = e.target.value;
        if (rutaSeleccionadaId && rutaSeleccionadaId != "0") {
            cargarTrazadoExistente(rutaSeleccionadaId);
        } else {
            drawnItems.clearLayers();
        }
    });

    // B) Dibujo creado
    map.on(L.Draw.Event.CREATED, async function (event) {
        const layer = event.layer;
        
        if (!rutaSeleccionadaId || rutaSeleccionadaId == "0") {
            mostrarAlerta("Por favor, selecciona una ruta primero antes de dibujar.", "warning");
            return;
        }

        if (event.layerType !== 'polyline') {
             mostrarAlerta("Solo se permite dibujar líneas.", "warning");
             return;
        }

        drawnItems.addLayer(layer);

        const latlngs = layer.getLatLngs().map(coord => [coord.lat, coord.lng]);

        if (latlngs.length < 2) {
             mostrarAlerta("El trazado debe tener al menos dos puntos.", "warning");
             drawnItems.clearLayers();
             return;
        }

        await guardarTrazadoEnBD(rutaSeleccionadaId, latlngs);
    });


    // C) Trazado borrado
    map.on(L.Draw.Event.DELETED, async function (event) {
        if (!rutaSeleccionadaId) return;

        if (confirm("¿Estás seguro de que deseas borrar el trazado de esta ruta?")) {
             await guardarTrazadoEnBD(rutaSeleccionadaId, []);
             mostrarAlerta("Trazado eliminado correctamente.", "success");
        } else {
            cargarTrazadoExistente(rutaSeleccionadaId);
        }
    });

    // D) Trazado editado
    map.on(L.Draw.Event.EDITED, async function (event) {
         if (!rutaSeleccionadaId) return;
         
         const layers = event.layers;
         let latlngs = [];
         layers.eachLayer(function (layer) {
             latlngs = layer.getLatLngs().map(coord => [coord.lat, coord.lng]);
         });

         if (latlngs.length > 0) {
              await guardarTrazadoEnBD(rutaSeleccionadaId, latlngs);
              mostrarAlerta("Trazado actualizado correctamente.", "success");
         }
    });


    // --- 6. Funciones ---

    async function cargarListadoRutas() {
        try {
            const response = await fetch('api/get_rutas.php');
            const rutas = await response.json();
            selectorRuta.innerHTML = '<option value="0" disabled selected>-- Selecciona una ruta para editar --</option>';
            rutas.forEach(ruta => {
                const option = document.createElement('option');
                option.value = ruta.id_ruta;
                option.textContent = ruta.descripcion;
                selectorRuta.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargando rutas:", error);
            mostrarAlerta("No se pudo cargar la lista de rutas.", "danger");
        }
    }


    /**
     * Carga y dibuja el trazado. (CORREGIDA)
     */
    async function cargarTrazadoExistente(rutaId) {
        drawnItems.clearLayers();
        mostrarAlerta("Cargando trazado...", "info");

        try {
            const response = await fetch(`api/get_rutas.php?id=${rutaId}`);
            const coordenadasCrudas = await response.json();

            if (!Array.isArray(coordenadasCrudas)) {
                 throw new Error("La API no devolvió un formato válido.");
            }

            // --- ¡CORRECCIÓN IMPORTANTE! ---
            // Filtramos los datos para eliminar nulos o basura que rompe Leaflet
            const coordenadasLimpias = coordenadasCrudas.filter(coord => {
                // Debe ser un array, tener 2 elementos, y no ser nulos
                return Array.isArray(coord) && coord.length === 2 && coord[0] != null && coord[1] != null;
            });

            if (coordenadasLimpias.length < 2) {
                mostrarAlerta("Esta ruta no tiene un trazado válido guardado. ¡Dibuja uno nuevo!", "info");
                return;
            }
            // --------------------------------

            const polyline = L.polyline(coordenadasLimpias, {
                color: '#0d6efd',
                weight: 5,
                opacity: 0.8
            });

            drawnItems.addLayer(polyline);
            map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
            
            const alertContainer = document.getElementById('alert-container-admin');
            if (alertContainer) alertContainer.innerHTML = '';

        } catch (error) {
            console.error("Error cargando trazado:", error);
            mostrarAlerta("Error al cargar el trazado. Revisa la consola.", "danger");
        }
    }


    async function guardarTrazadoEnBD(rutaId, latlngsArray) {
        mostrarAlerta("Guardando trazado...", "info");
        try {
            const datos = { id_ruta: rutaId, coordenadas: latlngsArray };
            const response = await fetch('api/guardar_trazado.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const textoRespuesta = await response.text();
            let resultado;
            try { resultado = JSON.parse(textoRespuesta); } catch (e) { throw new Error("Respuesta no válida del servidor."); }

            if (resultado.success) {
                const distancia = parseFloat(resultado.distancia_km).toFixed(2);
                mostrarAlerta(`¡Trazado guardado! Distancia: <strong>${distancia} km</strong>.`, "success");
                cargarTrazadoExistente(rutaId); 
            } else {
                throw new Error(resultado.error || "Error desconocido.");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta("Error al guardar: " + error.message, "danger");
            cargarTrazadoExistente(rutaId);
        }
    }


    function mostrarAlerta(mensaje, tipo) {
        const alertContainer = document.getElementById('alert-container-admin');
        if (!alertContainer) { console.error("No container for alerts."); return; }

        let icono = 'info-circle';
        if (tipo === 'success') icono = 'check-circle';
        if (tipo === 'danger') icono = 'exclamation-circle';
        if (tipo === 'warning') icono = 'exclamation-triangle';

        alertContainer.innerHTML = `
            <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm d-flex align-items-center" role="alert">
                <i class="fas fa-${icono} me-2 fs-5"></i>
                <div>${mensaje}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        if (tipo !== 'danger') {
            setTimeout(() => {
                const alertElement = alertContainer.querySelector('.alert');
                if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                     new bootstrap.Alert(alertElement).close();
                }
            }, 5000);
        }
    }
});