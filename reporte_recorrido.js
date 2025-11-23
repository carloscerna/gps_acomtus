// Variables Globales
let map = null;
let polylineLayer = null;
let markersLayer = new L.FeatureGroup();

document.addEventListener('DOMContentLoaded', function() {
// --- 0. CONFIGURACIÓN: UBICACIÓN POR DEFECTO (EMPRESA) ---
    // ¡CAMBIA ESTOS VALORES POR LOS DE TU EMPRESA!
    const COORD_EMPRESA_LAT = 13.977492366594602; // Latitud ejemplo
    const COORD_EMPRESA_LNG = -89.58093094962483; // Longitud ejemplo
    const ZOOM_INICIAL = 14; // Un zoom más cercano para ver la terminal

    // --- 1. Inicializar el Mapa ---
    // Usamos las variables que acabamos de crear
    const map = L.map('mapa-historial').setView([COORD_EMPRESA_LAT, COORD_EMPRESA_LNG], ZOOM_INICIAL);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    markersLayer.addTo(map);

    // 2. Cargar la lista de Unidades en el Select
    cargarUnidades();

    // 3. Configurar fechas por defecto (Hoy desde las 00:00 hasta ahora)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
    
    // Función auxiliar para formato datetime-local (YYYY-MM-DDTHH:MM)
    const toLocalISO = (date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date - offset).toISOString().slice(0, 16);
    };

    document.getElementById('fecha-inicio').value = toLocalISO(todayStart);
    document.getElementById('fecha-fin').value = toLocalISO(now);
});

// --- Función para Cargar Unidades (Select) ---
async function cargarUnidades() {
    try {
        // Reutilizamos la API de ubicaciones en vivo o creamos una simple 'get_unidades.php'
        // Asumiré que tienes una API que devuelve {id_, numero_equipo, descripcion}
        // Si no, podemos adaptar get_rutas.php o get_ubicaciones_en_vivo.php
        const response = await fetch('api/get_ubicaciones_en_vivo.php'); 
        const unidades = await response.json();
        
        const select = document.getElementById('select-unidad');
        select.innerHTML = '<option value="" disabled selected>-- Seleccione Unidad --</option>';

        // Nota: Lo ideal sería una API que traiga TODAS las unidades, no solo las vivas.
        // Pero para probar, usamos las vivas.
        unidades.forEach(u => {
            const option = document.createElement('option');
            option.value = u.id_transporte; 
            option.textContent = `Unidad ${u.numero_equipo} (${u.nombre_ruta || 'Sin Ruta'})`;
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Error cargando unidades", e);
    }
}

// --- Evento SUBMIT del Formulario ---
document.getElementById('form-historial').addEventListener('submit', async function(e) {
    e.preventDefault();

    const idTransporte = document.getElementById('select-unidad').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;

    if(!idTransporte) {
        alert("Por favor seleccione una unidad.");
        return;
    }

    // Mostrar cargando...
    const btn = this.querySelector('button');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    btn.disabled = true;

    try {
        // Llamar a la API de Historial
        const url = `api/get_historial.php?id_transporte=${idTransporte}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        const response = await fetch(url);
        const historial = await response.json();

        procesarHistorial(historial);

    } catch (error) {
        console.error(error);
        alert("Error al consultar el historial.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});

// --- Función Principal: Dibujar y Calcular ---
function procesarHistorial(puntos) {
    // 1. Limpiar mapa anterior
    if (polylineLayer) map.removeLayer(polylineLayer);
    markersLayer.clearLayers();
    
    const contenedorResultados = document.getElementById('resultados-container');

    if (puntos.length === 0) {
        alert("No se encontraron registros para ese rango de fechas.");
        contenedorResultados.style.display = 'none';
        return;
    }

    contenedorResultados.style.display = 'block';

// --- ¡CORRECCIÓN IMPORTANTE AQUÍ! ---
    // Le decimos a Leaflet: "Oye, el div cambió de tamaño, actualízate"
    map.invalidateSize(); 
    // ------------------------------------

    // 2. Preparar coordenadas para la línea
    // Leaflet necesita array de [lat, lng]
    const latlngs = puntos.map(p => [parseFloat(p.latitud), parseFloat(p.longitud)]);

    // 3. Dibujar la línea (Polyline)
    polylineLayer = L.polyline(latlngs, {
        color: 'red',
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round'
    }).addTo(map);

// 4. Zoom para ver todo el trayecto (Esto ahora sí funcionará)
    // fitBounds hace que el mapa se aleje o acerque para que quepa TODA la línea roja
    map.fitBounds(polylineLayer.getBounds(), { 
        padding: [50, 50], // Dejar un margen para que no quede pegado al borde
        animate: true 
    });

    // 5. Marcadores de Inicio (Verde) y Fin (Rojo)
    const inicio = latlngs[0];
    const fin = latlngs[latlngs.length - 1];

    L.marker(inicio).addTo(markersLayer)
        .bindPopup(`<b>Inicio del Recorrido</b><br>${puntos[0].fecha_hora}`);

    L.marker(fin).addTo(markersLayer)
        .bindPopup(`<b>Fin del Recorrido</b><br>${puntos[puntos.length - 1].fecha_hora}`);

    // 6. CÁLCULOS MATEMÁTICOS (Distancia y Velocidad)
    let distanciaTotalMetros = 0;
    let maxVelocidad = 0;

    for (let i = 0; i < latlngs.length - 1; i++) {
        // Sumar distancia entre punto A y punto B
        distanciaTotalMetros += map.distance(latlngs[i], latlngs[i+1]);
        
        // Revisar velocidad máxima (si la API la trae)
        const vel = parseFloat(puntos[i].velocidad || 0);
        if (vel > maxVelocidad) maxVelocidad = vel;
    }

    // 7. Mostrar Estadísticas en pantalla
    const km = (distanciaTotalMetros / 1000).toFixed(2);
    
    document.getElementById('stat-distancia').textContent = `${km} km`;
    document.getElementById('stat-puntos').textContent = puntos.length;
    document.getElementById('stat-velocidad').textContent = `${maxVelocidad} km/h`;
    
    // Forzar redibujado del mapa (a veces Leaflet se traba al mostrar divs ocultos)
    setTimeout(() => { map.invalidateSize(); }, 200);
}