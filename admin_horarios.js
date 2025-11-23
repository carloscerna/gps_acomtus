// admin_horarios.js

document.addEventListener('DOMContentLoaded', function() {
    // --- Referencias a Elementos del DOM (Usando los IDs del nuevo HTML) ---
    const selectRuta = document.getElementById('selectRutaHorario');
    const formNuevoHorario = document.getElementById('form-nuevo-horario');
    const tablaBody = document.getElementById('tabla-horarios').querySelector('tbody');
    // NOTA: No necesitamos referencia global al contenedor de alertas,
    // lo buscaremos dentro de la función mostrarAlerta.

    // --- Inicialización ---
    cargarRutas();

    // --- Event Listeners ---

    // 1. Cuando cambia la ruta seleccionada en el dropdown
    selectRuta.addEventListener('change', function() {
        const rutaId = this.value;
        if (rutaId) {
            cargarHorarios(rutaId);
        } else {
            tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fas fa-info-circle me-2"></i> Selecciona una ruta para ver sus horarios.</td></tr>';
        }
    });

    // 2. Cuando se envía el formulario de nuevo horario
    formNuevoHorario.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarHorario();
    });


    // --- Funciones ---

    /**
     * Carga la lista de rutas en el select.
     */
    async function cargarRutas() {
        try {
            const response = await fetch('api/get_rutas.php');
            const rutas = await response.json();

            // Limpiar y añadir opción por defecto
            selectRuta.innerHTML = '<option value="" disabled selected>-- Selecciona una ruta --</option>';

            rutas.forEach(ruta => {
                const option = document.createElement('option');
                option.value = ruta.id_ruta;
                option.textContent = ruta.descripcion;
                selectRuta.appendChild(option);
            });
        } catch (error) {
            console.error("Error al cargar rutas:", error);
            mostrarAlerta("Error al cargar la lista de rutas.", "danger");
        }
    }

    /**
     * Carga los horarios de una ruta específica en la tabla.
     * @param {string|number} rutaId
     */
    async function cargarHorarios(rutaId) {
        tablaBody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i> Cargando horarios...</td></tr>';

        try {
            const response = await fetch(`api/get_horarios.php?id=${rutaId}`);
            const horarios = await response.json();

            tablaBody.innerHTML = ''; // Limpiar tabla

            if (horarios.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay horarios registrados para esta ruta.</td></tr>';
                return;
            }

            horarios.forEach(h => {
                // Formatear horas (quitar segundos si vienen)
                const inicio = h.hora_inicio.substring(0, 5);
                const fin = h.hora_fin.substring(0, 5);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge-dia">${h.dia_semana}</span></td>
                    <td class="fw-bold">${inicio}</td>
                    <td>${fin}</td>
                    <td>Cada ${h.frecuencia_minutos} min</td>
                    <td class="text-center">
                        <button class="btn btn-outline-danger btn-sm btn-borrar" data-id="${h.id_horario}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });

            // Añadir eventos a los botones de borrar recién creados
            document.querySelectorAll('.btn-borrar').forEach(btn => {
                btn.addEventListener('click', function() {
                    borrarHorario(this.dataset.id);
                });
            });

        } catch (error) {
            console.error("Error al cargar horarios:", error);
            tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar los datos.</td></tr>';
            mostrarAlerta("No se pudieron cargar los horarios.", "danger");
        }
    }

    /**
     * Guarda un nuevo horario enviando los datos al API.
     */
    async function guardarHorario() {
        const btnGuardar = document.getElementById('btnGuardarHorario');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        btnGuardar.disabled = true;

        // 1. Recolectar datos del formulario
        const rutaId = selectRuta.value;
        const dia = document.getElementById('selectDia').value;
        
        // Formatear hora inicio a HH:MM (24h) para la BD
        let hIni = parseInt(document.getElementById('horaInicioHH').value);
        const mIni = document.getElementById('horaInicioMM').value.padStart(2, '0');
        const ampmIni = document.getElementById('horaInicioAMPM').value;
        if (ampmIni === 'PM' && hIni < 12) hIni += 12;
        if (ampmIni === 'AM' && hIni === 12) hIni = 0;
        const horaInicioFinal = `${hIni.toString().padStart(2, '0')}:${mIni}:00`;

        // Formatear hora fin a HH:MM (24h) para la BD
        let hFin = parseInt(document.getElementById('horaFinHH').value);
        const mFin = document.getElementById('horaFinMM').value.padStart(2, '0');
        const ampmFin = document.getElementById('horaFinAMPM').value;
        if (ampmFin === 'PM' && hFin < 12) hFin += 12;
        if (ampmFin === 'AM' && hFin === 12) hFin = 0;
        const horaFinFinal = `${hFin.toString().padStart(2, '0')}:${mFin}:00`;

        const frecuencia = document.getElementById('frecuenciaMinutos').value;

        // 2. Crear objeto a enviar
        const datosNuevoHorario = {
            ruta_id: rutaId,
            dia_semana: dia,
            hora_inicio: horaInicioFinal,
            hora_fin: horaFinFinal,
            frecuencia_minutos: frecuencia
        };

        try {
            // 3. Enviar al API
            const response = await fetch('api/crud_horarios.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosNuevoHorario)
            });
            
            const resultado = await response.json();

            if (resultado.success) {
                mostrarAlerta("¡Horario guardado correctamente!", "success");
                formNuevoHorario.reset(); // Limpiar formulario
                // Restaurar selección de ruta para que no se pierda
                selectRuta.value = rutaId; 
                cargarHorarios(rutaId); // Recargar la tabla
            } else {
                throw new Error(resultado.error || "Error desconocido al guardar.");
            }

        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta("Error al guardar: " + error.message, "danger");
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    }

    /**
     * Borra un horario.
     * @param {string|number} idHorario
     */
    async function borrarHorario(idHorario) {
        if (!confirm("¿Estás seguro de que deseas eliminar este horario?")) {
            return;
        }

        try {
            const response = await fetch('api/crud_horarios.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_horario: idHorario })
            });
            
            const resultado = await response.json();

            if (resultado.success) {
                mostrarAlerta("Horario eliminado.", "success");
                cargarHorarios(selectRuta.value); // Recargar tabla
            } else {
                throw new Error(resultado.error);
            }
        } catch (error) {
            mostrarAlerta("Error al eliminar: " + error.message, "danger");
        }
    }

    /**
     * Muestra una alerta moderna en la parte superior.
     * @param {string} mensaje - El texto a mostrar.
     * @param {string} tipo - 'success' (verde) o 'danger' (rojo).
     */
    function mostrarAlerta(mensaje, tipo) {
        // --- AQUÍ ESTABA EL ERROR ---
        // Buscamos el ID correcto del nuevo HTML: 'alert-container-horarios'
        const alertContainer = document.getElementById('alert-container-horarios');

        // Protección por si el HTML no coincide
        if (!alertContainer) {
             console.error("Error crítico: No se encontró el contenedor de alertas en el HTML (alert-container-horarios).");
             alert(mensaje); // Fallback a alerta nativa del navegador
             return;
        }

        const icono = tipo === 'success' ? 'check-circle' : 'exclamation-circle';
        const claseColor = tipo === 'success' ? 'alert-success' : 'alert-danger';

        // Usamos el estilo de alerta de Bootstrap 5 con ícono y botón de cerrar
        alertContainer.innerHTML = `
            <div class="alert ${claseColor} alert-dismissible fade show d-flex align-items-center shadow-sm" role="alert">
                <i class="fas fa-${icono} me-2 fs-4"></i>
                <div>${mensaje}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Auto-ocultar después de 5 segundos (opcional)
        setTimeout(() => {
            // Usamos la API de Bootstrap 5 para cerrar la alerta suavemente
            const alertElement = alertContainer.querySelector('.alert');
            if(alertElement) {
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000);
    }

});