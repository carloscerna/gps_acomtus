/*
 * admin_horarios.js
 * Lógica para la página de administración de horarios (admin_horarios.html)
 */

// --- 1. Elementos Globales ---
const selectorRuta = document.getElementById('selectorRutaAdmin');
const seccionGestion = document.getElementById('gestion-horarios');
const formHorario = document.getElementById('form-horario');
const tablaHorariosBody = document.getElementById('tabla-horarios-body');
let idRutaSeleccionada = 0; // Guardar el ID de la ruta

// --- 2. Cargar Rutas al Iniciar ---
document.addEventListener('DOMContentLoaded', function() {
    cargarRutasSelect();
});

/**
 * Carga la lista de rutas en el <select>
 * (Esta función es igual a la de admin.js)
 */
function cargarRutasSelect() {
    fetch('api/get_rutas.php')
        .then(response => response.json())
        .then(rutas => {
            selectorRuta.innerHTML = '<option value="0" disabled selected>-- Elige una ruta --</option>'; 
            rutas.forEach(ruta => {
                const opcion = document.createElement('option');
                opcion.value = ruta.id_ruta;
                opcion.textContent = ruta.descripcion;
                selectorRuta.appendChild(opcion);
            });
        })
        .catch(error => {
            mostrarAlertaAdmin('Error al cargar la lista de rutas.', 'danger');
        });
}

// --- 3. Evento: Cambiar de Ruta ---
selectorRuta.addEventListener('change', function() {
    idRutaSeleccionada = selectorRuta.value;
    
    if (idRutaSeleccionada > 0) {
        // Mostrar las secciones de gestión
        seccionGestion.classList.remove('d-none');
        // Cargar los horarios actuales
        mostrarHorariosActuales(idRutaSeleccionada);
    } else {
        seccionGestion.classList.add('d-none');
    }
});

/**
 * Carga y muestra los horarios actuales de una ruta en la tabla
 * (Esta es la acción LEER / READ)
 */
async function mostrarHorariosActuales(rutaId) {
    // Limpiar tabla anterior
    tablaHorariosBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    try {
        // Usamos nuestra nueva API con el método GET
        const response = await fetch(`api/crud_horarios.php?ruta_id=${rutaId}`);
        const horarios = await response.json();

        // Limpiar tabla
        tablaHorariosBody.innerHTML = "";

        if (horarios.length === 0) {
            tablaHorariosBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay horarios registrados.</td></tr>';
        } else {
            horarios.forEach(h => {
            /**
 * Convierte una hora en formato 12-horas (ej: 5, 30, "PM") 
 * a formato 24-horas (ej: "17:30").
 */
function convertTime12to24(hour, minute, ampm) {
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (ampm === 'PM' && h < 12) {
        h += 12; // 1 PM -> 13
    }
    if (ampm === 'AM' && h === 12) {
        h = 0; // 12 AM (medianoche) -> 00
    }

    // Asegurarse de que tengan dos dígitos
    const hour24 = h.toString().padStart(2, '0');
    const minute24 = m.toString().padStart(2, '0');
    
    return `${hour24}:${minute24}`;
}// ¡MODIFICACIÓN AQUÍ!
            // Usamos la nueva función para formatear la hora
            let inicio = formatTime12(h.hora_inicio);
            let fin = formatTime12(h.hora_fin);

                const fila = `
                    <tr>
                        <td>${h.dia_semana}</td>
                        <td>${inicio}</td>
                        <td>${fin}</td>
                        <td>${h.frecuencia_minutos}</td>
                    </tr>
                `;
                tablaHorariosBody.innerHTML += fila;
            });
        }
    } catch (error) {
        mostrarAlertaAdmin('No se pudieron cargar los horarios.', 'danger');
    }
}

// --- 4. Evento: Guardar Nuevo Horario (¡MODIFICADO!) ---
formHorario.addEventListener('submit', function(event) {
    event.preventDefault(); // Evitar que la página se recargue

    // --- ¡NUEVA LÓGICA DE LECTURA DE HORA! ---
    // Leer los campos de HORA INICIO
    const hr_i = document.getElementById('hora_inicio_hr').value;
    const min_i = document.getElementById('hora_inicio_min').value;
    const ampm_i = document.getElementById('hora_inicio_ampm').value;
    
    // Leer los campos de HORA FIN
    const hr_f = document.getElementById('hora_fin_hr').value;
    const min_f = document.getElementById('hora_fin_min').value;
    const ampm_f = document.getElementById('hora_fin_ampm').value;

    // Convertir a formato 24 horas para la BD
    const hora_inicio_24 = convertTime12to24(hr_i, min_i, ampm_i);
    const hora_fin_24 = convertTime12to24(hr_f, min_f, ampm_f);
    // ---------------------------------------------

    // Recoger los datos del formulario (¡MODIFICADO!)
    const datosHorario = {
        ruta_id: parseInt(idRutaSeleccionada),
        dia_semana: document.getElementById('dia_semana').value,
        hora_inicio: hora_inicio_24, // <--- Usar la hora convertida
        hora_fin: hora_fin_24,       // <--- Usar la hora convertida
        frecuencia: parseInt(document.getElementById('frecuencia').value)
    };
    
    // Llamar a la función de guardado (esto es igual)
    guardarNuevoHorario(datosHorario);
});

/**
 * Guarda el nuevo horario en la base de datos
 * (Esta es la acción CREAR / CREATE)
 */
async function guardarNuevoHorario(datos) {
    mostrarAlertaAdmin('Guardando...', 'info');

    try {
        // Usamos nuestra nueva API con el método POST
        const response = await fetch('api/crud_horarios.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.success) {
            mostrarAlertaAdmin(resultado.message, 'success');
            // Limpiar el formulario
            formHorario.reset();
            // ¡Actualizar la tabla de horarios!
            mostrarHorariosActuales(idRutaSeleccionada);
        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }
    } catch (error) {
        mostrarAlertaAdmin(`Error al guardar: ${error.message}`, 'danger');
    }
}


/**
 * Muestra una alerta de Bootstrap (función de ayuda)
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
 * Convierte una hora en formato 12-horas (ej: 5, 30, "PM") 
 * a formato 24-horas (ej: "17:30").
 */
function convertTime12to24(hour, minute, ampm) {
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (ampm === 'PM' && h < 12) {
        h += 12; // 1 PM -> 13
    }
    if (ampm === 'AM' && h === 12) {
        h = 0; // 12 AM (medianoche) -> 00
    }

    // Asegurarse de que tengan dos dígitos
    const hour24 = h.toString().padStart(2, '0');
    const minute24 = m.toString().padStart(2, '0');
    
    return `${hour24}:${minute24}`;
}