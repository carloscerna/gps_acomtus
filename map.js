/*
 * map.js
 * (Actualizado con correcciones de errores y alertas de Bootstrap)
 */
let busesEnMapa = {}; // Un objeto para guardar los marcadores de los buses
// Opcional: un ícono personalizado
const busIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Un ícono de bus (puedes cambiarlo)
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});
// 1. Inicializar el mapa
const map = L.map('mapa').setView([13.7000, -89.2200], 13);

// 2. Añadir la capa base del mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// 3. Variables globales
let lineaRutaActual = null;
let horariosRutaActual = [];
let nombreRutaActual = "";

// 4. Inicializar el Modal de Bootstrap
let modalHorarios = null;
document.addEventListener('DOMContentLoaded', function() {
    modalHorarios = new bootstrap.Modal(document.getElementById('modalHorarios'));
    cargarRutas();
});

/**
 * Carga la lista de rutas desde la API
 */
function cargarRutas() {
    fetch('api/get_rutas.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al conectar con la API de rutas');
            }
            return response.json();
        })
        .then(rutas => {
            const selector = document.getElementById('selectorRuta');
            selector.innerHTML = '<option value="0" selected>-- Elige una ruta --</option>'; 
            rutas.forEach(ruta => {
                const opcion = document.createElement('option');
                opcion.value = ruta.id_ruta;
                opcion.textContent = ruta.descripcion;
                selector.appendChild(opcion);
            });
        })
        .catch(error => {
            console.error('Error al cargar la lista de rutas:', error);
            // ¡NUEVA ALERTA!
            mostrarAlerta('<strong>Error:</strong> No se pudo cargar la lista de rutas. Revise la conexión.', 'danger');
        });
}

// 5. Escuchar cambios en el menú <select>
document.getElementById('selectorRuta').addEventListener('change', function(evento) {
    
    const rutaId = evento.target.value;
    const btnHorarios = document.getElementById('btnVerHorarios');

    // Limpiar alertas y mapa al cambiar
    limpiarAlertas();
    btnHorarios.disabled = true;
    horariosRutaActual = [];
    nombreRutaActual = "";

    if (lineaRutaActual) {
        map.removeLayer(lineaRutaActual);
        lineaRutaActual = null;
    }

    // Si el usuario selecciona "-- Elige una ruta --"
    if (rutaId === "0") {
        return; // No hacer nada más
    }

    // Guardar el nombre de la ruta seleccionada
    nombreRutaActual = evento.target.options[evento.target.selectedIndex].text;
    
    // ¡NUEVA ALERTA! Mostrar mensaje de "Cargando..."
    mostrarAlerta('Cargando información de la ruta...', 'info');

    // --- Parte A: Cargar el Trazado ---
    // ***** ¡AQUÍ ESTÁ LA CORRECCIÓN! *****
    // Asegúrate de que esta línea llame a 'api/api_ruta.php'
    // NO a 'get_rutas.php'
    fetch(`api/api_ruta.php?id=${rutaId}`) 
        .then(response => response.json())
        .then(coordenadas => {
            
            // 1. Verificar si 'coordenadas' es un array válido
            if (!Array.isArray(coordenadas) || coordenadas.length === 0) {
                mostrarAlerta('<strong>Aviso:</strong> Esta ruta aún no tiene un trazado (coordenadas) guardado.', 'warning');
                return; // No hacer nada más
            }

            // 2. Filtrar valores nulos
            const coordenadasLimpias = coordenadas.filter(coord => Array.isArray(coord) && coord.length === 2);

            if (coordenadasLimpias.length === 0) {
                mostrarAlerta('<strong>Aviso:</strong> El trazado de esta ruta contenía datos inválidos y no se puede dibujar.', 'warning');
                return;
            }

            // 4. Dibujar la ruta
            lineaRutaActual = L.polyline(coordenadasLimpias, {
                color: 'blue',
                weight: 5,
                opacity: 0.7
            }).addTo(map);
            map.fitBounds(lineaRutaActual.getBounds());
            
        })
        .catch(error => {
            console.error('Error al cargar la ruta:', error);
            mostrarAlerta('<strong>Error:</strong> No se pudo cargar el trazado de la ruta.', 'danger');
        });

    // --- Parte B: Cargar los Horarios ---
    fetch(`api/get_horarios.php?id=${rutaId}`)
        .then(response => response.json())
        .then(horarios => {
            horariosRutaActual = horarios;
            
            if (horarios.length > 0) {
                btnHorarios.disabled = false;
                // ¡NUEVA ALERTA! (Éxito)
                mostrarAlerta('Ruta y horarios cargados con éxito.', 'success');
            } else {
                btnHorarios.disabled = true;
                // ¡NUEVA ALERTA! (Info)
                // Esto puede sobrescribir el "warning" del trazado,
                // pero da un estado final claro.
                mostrarAlerta('<strong>Info:</strong> Trazado cargado. Esta ruta no tiene horarios registrados.', 'info');
            }
        })
        .catch(error => {
            console.error('Error al cargar los horarios:', error);
            btnHorarios.disabled = true;
            // ¡NUEVA ALERTA!
            mostrarAlerta('<strong>Error:</strong> Se cargó el trazado, pero no se pudieron cargar los horarios.', 'danger');
        });
});

// ***** ¡CORRECCIÓN ESTRUCTURAL! *****
// Este listener DEBE estar FUERA del listener 'change'.
// Si no, se añade un nuevo listener cada vez que cambias de ruta.
document.getElementById('btnVerHorarios').addEventListener('click', function() {
    
    document.getElementById('nombreRutaModal').textContent = nombreRutaActual;
    const contenidoDiv = document.getElementById('contenidoHorarios');
    contenidoDiv.innerHTML = ""; 

    if (horariosRutaActual.length === 0) {
        contenidoDiv.innerHTML = "<p>No hay horarios registrados para esta ruta.</p>";
    } else {
        let htmlHorarios = '<ul class="list-group">';
        horariosRutaActual.forEach(h => {
            // ¡MODIFICACIÓN AQUÍ!
            // Usamos la nueva función para formatear la hora
            let inicio = formatTime12(h.hora_inicio); // Ej: 05:00 AM
            let fin = formatTime12(h.hora_fin);     // Ej: 08:00 PM
            htmlHorarios += `<li class="list-group-item">
                <strong>${h.dia_semana}:</strong> ${inicio} a ${fin}
                <br>
                <small class="text-muted">Frecuencia: ${h.frecuencia_minutos} minutos</small>
            </li>`;
        });
        htmlHorarios += '</ul>';
        contenidoDiv.innerHTML = htmlHorarios;
    }
    modalHorarios.show();
});

/**
 * Centra el mapa suavemente en una coordenada específica.
 * @param {Array} latlng - Un array [latitud, longitud]
 */
function centrarMapaEnBus(latlng) {
    // Obtenemos el zoom actual, pero nos aseguramos de que al menos sea 16
    const zoomDeseado = Math.max(map.getZoom(), 16); 

    // map.setView(latlng, zoomDeseado); // Opción 1: Salto brusco
    
    // Opción 2: Vuelo suave y animado
    map.flyTo(latlng, zoomDeseado, {
        duration: 1.5 // Duración de la animación en segundos
    });
}

// -----------------------------------------------------------------
// ----- ¡NUEVAS FUNCIONES DE ALERTA DE BOOTSTRAP! -----
// -----------------------------------------------------------------

/**
 * Muestra una alerta de Bootstrap en el contenedor 'alert-container'.
 * @param {string} message - El mensaje HTML a mostrar.
 * @param {string} type - El tipo de alerta (ej: 'success', 'danger', 'warning', 'info').
 */
function mostrarAlerta(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        // El HTML para una alerta de Bootstrap 5
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        // Reemplazar el contenido (para que no se acumulen alertas)
        alertContainer.innerHTML = alertHTML;
    }
}

/**
 * Limpia cualquier alerta visible del contenedor 'alert-container'.
 */
function limpiarAlertas() {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = "";
    }
}

// (El '}' extra que tenías al final del archivo ha sido eliminado)

/**
 * Convierte una hora en formato 24-horas (ej: "17:30") 
 * a formato 12-horas con AM/PM (ej: "05:30 PM").
 */
function formatTime12(time24) {
    // Obtener solo HH:MM (ignorar segundos si los hay)
    const timeString = time24.substring(0, 5);
    const [hours24, minutes] = timeString.split(':');
    
    let hours = parseInt(hours24, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // El 0 (00:xx) se convierte en 12
    
    const hours12 = hours < 10 ? '0' + hours : hours;
    
    return `${hours12}:${minutes} ${ampm}`;
}

/**
 * Función para actualizar la posición de los buses en el mapa
 */

async function actualizarPosicionBuses() {
    try {
        const response = await fetch('api/get_ubicaciones_en_vivo.php');
        
        // Verificamos que la respuesta sea válida
        if (!response.ok) {
            console.warn("La API respondió con error:", response.status);
            return;
        }

        const buses = await response.json();

        // --- Referencias HTML ---
        const cardBusesEnVivo = document.getElementById('buses-en-vivo-card');
        const listaBusesEnVivo = document.getElementById('lista-buses-en-vivo');
        
        if (listaBusesEnVivo) listaBusesEnVivo.innerHTML = "";
        
        if (buses.length === 0) {
            if (cardBusesEnVivo) cardBusesEnVivo.style.display = 'none';
        } else {
            if (cardBusesEnVivo) cardBusesEnVivo.style.display = 'block';
        }

        const busesActualizados = new Set();

        buses.forEach(bus => {
            // Convertir a números seguros
            const id = parseInt(bus.id_transporte);
            const lat = parseFloat(bus.latitud);
            const lng = parseFloat(bus.longitud);
            const newPos = [lat, lng];
            
            busesActualizados.add(id);

            // --- Depuración en consola (Solo para ver si llega) ---
            // console.log(`Procesando Bus ID: ${id} en [${lat}, ${lng}]`);

            // Manejo de valores nulos (para que no diga "null")
            const nombreRuta = bus.nombre_ruta || "Ruta desconocida";
            const nombreUnidad = bus.nombre_unidad || `Unidad ${bus.numero_equipo}`;
            const numeroEquipo = bus.numero_equipo || "?";

            // --- ICONO HTML ---
            const iconHTML = L.divIcon({
                className: 'icono-bus-personalizado',
                html: `<div class="bus-marker">${numeroEquipo}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20] // Centrado
            });

            // Lógica de Crear o Mover
            if (busesEnMapa[id]) {
                // Mover existente
                busesEnMapa[id].setLatLng(newPos);
                busesEnMapa[id].setIcon(iconHTML);
                // Actualizar contenido del popup
                busesEnMapa[id].setPopupContent(`<b>${nombreRuta}</b><br>${nombreUnidad}`);
            } else {
                // Crear nuevo
                busesEnMapa[id] = L.marker(newPos, { icon: iconHTML })
                    .addTo(map)
                    .bindPopup(`<b>${nombreRuta}</b><br>${nombreUnidad}`);
                
                console.log(`¡Nuevo bus añadido al mapa! ID: ${id}`);
            }

            // --- Añadir a la lista lateral ---
            if (listaBusesEnVivo) {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item list-group-item-action';
                listItem.innerHTML = `<strong>Unidad ${numeroEquipo}</strong> <small class="text-muted">(${nombreRuta})</small>`;
                listItem.style.cursor = 'pointer';
                listItem.onclick = function() { centrarMapaEnBus(newPos); };
                listaBusesEnVivo.appendChild(listItem);
            }
        });
        
        // Limpieza de buses viejos
        for (const id in busesEnMapa) {
            if (!busesActualizados.has(parseInt(id))) {
                if(map) map.removeLayer(busesEnMapa[id]);
                delete busesEnMapa[id];
            }
        }

    } catch (error) {
        console.error("Error al actualizar buses en vivo:", error);
    }
}
// --- ¡INICIAR EL SONDEO (POLLING)! ---
// Llama a la función 'actualizarPosicionBuses' cada 10 segundos
setInterval(actualizarPosicionBuses, 10000); // 10000 milisegundos = 10 segundos

// Llamarla una vez al inicio
actualizarPosicionBuses();