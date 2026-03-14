// Espera a que todo el DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', function() {
    // Extraemos jsPDF del objeto window para generar PDFs
    const { jsPDF } = window.jspdf;

    // ===== ELEMENTOS DEL DOM =====
    const mainContent = document.getElementById('main-content'); // Contenedor principal
    const detailsContent = document.getElementById('details-content'); // Contenido de detalles de trámites
    const tramiteCards = document.querySelectorAll('.card.tramite'); // Todas las tarjetas de trámites
    const backButtons = document.querySelectorAll('.btn-back'); // Botones "Volver"
    const pdfButtons = document.querySelectorAll('.btn-pdf'); // Botones para descargar PDF
    const heroSection = document.getElementById('inicio'); // Sección Hero / Portada
    const chatWindow = document.getElementById('chat-window'); // Ventana del chatbot
    const navLinks = document.querySelectorAll('header nav a'); // Enlaces del menú

    // ===== MODAL / FORMULARIO =====
    const modalForm = document.getElementById('modal-form'); // Contenedor del modal
    const modalContent = document.getElementById('modalContent'); // Contenido interno del modal
    const formCita = document.getElementById('formCita'); // Formulario de citas
    const closeButton = document.getElementById('closeModal'); // Botón cerrar modal
    const modalNombreInput = document.getElementById('modalNombre'); // Input de nombre
    const modalCurpInput = document.getElementById('modalCurp'); // Input de CURP
    const modalTramiteSelect = document.getElementById('modalTramite'); // Select de trámites
    const modalFechaInput = document.getElementById('modalFecha'); // Input de fecha
    const modalHoraInput = document.getElementById('modalHora'); // Select de hora
    const mensajeModal = document.getElementById('mensaje-modal'); // Mensajes de validación
    const confirmButton = document.getElementById('confirmButton'); // Botón confirmar
    const deleteButton = document.getElementById('deleteButton'); // Botón eliminar cita

    // ===== CONVERTIR AUTOMÁTICAMENTE A MAYÚSCULAS =====
    modalNombreInput.addEventListener('input', () => {
    modalNombreInput.value = modalNombreInput.value.toUpperCase();
});

    modalCurpInput.addEventListener('input', () => {
    modalCurpInput.value = modalCurpInput.value.toUpperCase();
});

    // ===== CHAT =====
    const chatToggle = document.getElementById('chat-toggle'); // Botón para abrir/cerrar chat
    const chatBody = document.getElementById('chat-body'); // Contenedor de mensajes del chat
    const chatInput = document.getElementById('chat-input'); // Input para enviar mensaje

    // ===== DATOS =====
    let calendar; // Variable para instancia de FullCalendar
    // Recupera citas agendadas desde localStorage, o crea un array vacío
    // Usaremos los datos del servidor como fuente de verdad
    let scheduledAppointments = [];
    let currentEditingId = null; // Si estamos mostrando o editando una cita existente

// Carga las citas desde el servidor y luego inicializa el calendario
function loadAppointmentsAndInitCalendar() {
    return fetch('api/fetch_appointments.php')
        .then(res => res.json())
        .then(data => {
            // data viene en formato FullCalendar (id, title, start, extendedProps)
            scheduledAppointments = data.map(e => ({
                id: e.id,
                nombre: e.extendedProps?.nombre ?? '',
                curp: e.extendedProps?.curp ?? '',
                tramite: e.title,
                datetime: e.start
            }));
        })
        .catch(err => {
            console.error('Error cargando citas del servidor:', err);
            // Puedes dejar scheduledAppointments vacío para que no rompa.
        })
        .finally(() => {
            initializeCalendar(); // inicializa el calendario después de cargar los datos
        });
}

// Llamada inicial
loadAppointmentsAndInitCalendar();

    // ===== UTIL: generar UUID simple =====
    function generateUUID() {
        // Genera un identificador único para cada cita
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ===== UTIL: formateo de fecha para inputs =====
    function pad(n){ return n < 10 ? '0' + n : n; } // Agrega cero inicial si < 10
    function formatDateForInput(date) {
        const d = new Date(date);
        const yyyy = d.getFullYear(); // Año completo
        const mm = pad(d.getMonth() + 1); // Mes con cero
        const dd = pad(d.getDate()); // Día con cero
        const hh = pad(d.getHours()); // Hora con cero
        const min = pad(d.getMinutes()); // Minuto con cero
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`; // Devuelve string 'YYYY-MM-DD HH:MM'
    }
    function splitFechaHoraFromInput(inputStr) {
        // Convierte string 'YYYY-MM-DD HH:MM' en objeto {fecha, hora}
        const [fecha, hora] = inputStr.split(' ');
        return { fecha, hora };
    }

    // ===== FUNCIONES PARA FULLCALENDAR =====
    function getCalendarEvents() {
        // Transforma citas agendadas en eventos para FullCalendar
        return scheduledAppointments.map(app => ({
            id: app.id, // ID único
            title: app.tramite, // Título del evento
            start: app.datetime, // Fecha y hora en formato ISO-like
            extendedProps: {
                nombre: app.nombre, // Nombre del usuario
                curp: app.curp // CURP del usuario
            },
            color: '#2980b9' // Color de evento
        }));
    }

// ===== INICIALIZAR FULLCALENDAR =====
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar'); // Contenedor del calendario

    // Vista inicial del calendario
    const defaultView = 'dayGridMonth'; // Vista mensual por defecto

    // Crear instancia de FullCalendar
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: defaultView, // Configura vista inicial
        headerToolbar: { // Barra de herramientas superior
            left: 'prev,next today', // Botones anterior, siguiente y hoy
            center: 'title', // Título del mes/día
            right: 'dayGridMonth,timeGridWeek,listWeek' // Vistas disponibles
        },
        locale: 'es', // Idioma español
        slotMinTime: '09:00:00', // Hora mínima para citas
        slotMaxTime: '15:30:00', // Hora máxima
        slotDuration: '00:30:00', // Intervalo de cada slot (30 min)
        firstDay: 0, // Lunes como primer día de la semana
        nowIndicator: true, // Indicador de hora actual
        allDaySlot: false, // No mostrar slot "todo el día"
        events: getCalendarEvents(), // Carga los eventos de las citas

        // ─── LIMITAR LÍNEAS EN LA VISTA MES ───
    // Muestra hasta 3 filas de eventos por día; el resto queda en "+n más"
    dayMaxEventRows: 3,        // <-- ajusta (2,3,4) según prefieras
    moreLinkContent: function(arg) {
        return `+${arg.num} más`;
    },
    moreLinkClick: 'popover',  // abre un popover con la lista completa

    

        // ===== EVENTO: CLICK EN FECHA =====
        dateClick: function(info) {
            const clickedDate = new Date(info.dateStr + 'T00:00:00');  // Fecha clickeada
            const today = new Date();
            
            // 🔹 Bloquear domingos (día 0)
            if (clickedDate.getDay() === 0) {
                alert("🚫 No se pueden agendar citas los domingos.");
                 return;
            }
            
            // 🔹 Bloquear días pasados
            today.setHours(0,0,0,0); // Resetea horas para comparación
            if (clickedDate < today) { // Evita agendar en días pasados
                alert("⛔ No se pueden agendar citas en días pasados.");
                return;
            }
            
            // Calcular mañana
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            if (clickedDate < tomorrow) {
                alert("⛔ Las citas deben agendarse al menos con un día de anticipación.");
                return;
            }

            // Si pasa las validaciones, abre el formulario normalmente
            // Establece fecha en el modal en formato 'YYYY-MM-DD'
            modalFechaInput.value = clickedDate.toISOString().split('T')[0]; 
            openModalForNew(); // Abre modal para nueva cita
        },

        // ===== EVENTO: CLICK EN CITA =====
        eventClick: function(info) {
            const ev = info.event; // Evento clickeado
            const id = ev.id; // ID del evento
            const appointment = scheduledAppointments.find(a => a.id === id); // Busca cita en localStorage
            if (appointment) {
                openModalForExisting(appointment); // Abre modal para editar/mostrar cita
            } else {
                alert('Evento no encontrado.'); // Alerta si no existe
            }
        },

        // Formato de las horas en la agenda
        slotLabelFormat: {
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: false,
            meridiem: 'short' // AM/PM
        },
        slotEventOverlap: false, // Evita que dos eventos se solapen

        // ===== PERSONALIZACIÓN DE DIAS PASADOS =====
        dayCellDidMount: function(info) {
            const today = new Date();
            today.setHours(0,0,0,0); // Resetea horas
            if (info.date < today) { // Si la celda es de un día pasado
                info.el.classList.add("pasado"); // Añade clase CSS
            }
        },
    });

    calendar.render(); // Renderiza el calendario en la página
}

// Ejecuta la función para inicializar el calendario
initializeCalendar();


// ===== FUNCION: HORAS DISPONIBLES =====
async function actualizarHorasDisponibles(fecha) {
    const horasDisponibles = [];
    const inicio = 9;
    const fin = 15;
    const intervalo = 30;

    // 1️⃣ Obtener citas existentes desde el servidor
    let citasExistentes = [];
    try {
        const res = await fetch('api/fetch_appointments.php');
        const data = await res.json();

        // Filtrar solo las del día seleccionado y extraer HH:MM
        citasExistentes = data
            .filter(c => c.start.startsWith(fecha)) // citas del día
            .map(c => c.start.slice(11,16));       // obtener 'HH:MM'
    } catch(err) {
        console.error('Error cargando citas:', err);
    }

    // 2️⃣ Generar todas las horas posibles y filtrar ocupadas
    for (let h = inicio; h <= fin; h++) {
        for (let m = 0; m < 60; m += intervalo) {
            if (h === fin && m > 30) continue;

            const hh = h.toString().padStart(2,'0');
            const mm = m.toString().padStart(2,'0');
            const horaStr = `${hh}:${mm}`;

            if (!citasExistentes.includes(horaStr)) {
                horasDisponibles.push(horaStr);
            }
        }
    }

    // 3️⃣ Limpiar select y agregar opciones
    modalHoraInput.innerHTML = '';
    if (horasDisponibles.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay horarios disponibles';
        modalHoraInput.appendChild(opt);
    } else {
        horasDisponibles.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            modalHoraInput.appendChild(opt);
        });
    }
}


// ===== ABRIR MODAL PARA NUEVA CITA =====
function openModalForNew() {
    currentEditingId = null; // No estamos editando una cita existente
    modalForm.classList.remove('hidden'); // Mostrar modal
    modalNombreInput.value = ''; // Limpiar input nombre
    modalCurpInput.value = '';   // Limpiar input CURP
    modalTramiteSelect.value = ''; // Limpiar select de trámite
    confirmButton.textContent = 'Confirmar y Descargar Cita'; // Texto del botón
    deleteButton.classList.add('hidden'); // Ocultar botón eliminar
    mensajeModal.style.display = 'none'; // Ocultar mensaje de estado

    // Actualizar horas disponibles según fecha seleccionada
    if (modalFechaInput.value) {
        actualizarHorasDisponibles(modalFechaInput.value);
    }

    modalNombreInput.focus(); // Enfocar input de nombre al abrir
}

// ===== ABRIR MODAL PARA CITA EXISTENTE =====
function openModalForExisting(app) {
    currentEditingId = app.id; // Guardar ID de la cita que se está editando
    modalForm.classList.remove('hidden'); // Mostrar modal
    modalNombreInput.value = app.nombre; // Rellenar nombre
    modalCurpInput.value = app.curp;     // Rellenar CURP
    modalTramiteSelect.value = app.tramite; // Seleccionar trámite

    // Obtener fecha de la cita en formato 'YYYY-MM-DD'
    const dt = new Date(app.datetime);
    modalFechaInput.value = dt.toISOString().split('T')[0];

    // Actualizar horas disponibles según fecha
    actualizarHorasDisponibles(modalFechaInput.value);

    // Seleccionar hora actual de la cita
    modalHoraInput.value = dt.getHours().toString().padStart(2,'0') + ':' + dt.getMinutes().toString().padStart(2,'0');

    confirmButton.textContent = 'Guardar cambios y Descargar Cita'; // Texto del botón
    deleteButton.classList.remove('hidden'); // Mostrar botón eliminar
    mensajeModal.style.display = 'none'; // Ocultar mensaje de estado
}

// ===== LISTENER: CUANDO CAMBIA LA FECHA EN EL MODAL =====
modalFechaInput.addEventListener('change', function() {
    actualizarHorasDisponibles(this.value); // Actualiza opciones de horas al cambiar la fecha
});

// ===== CERRAR MODAL =====
function closeModal() {
    modalForm.classList.add('hidden'); // Ocultar modal
    currentEditingId = null; // Limpiar ID de edición
}

// Cerrar modal si se hace clic fuera del contenido
modalForm.addEventListener('click', function(e) {
    if (e.target === modalForm) closeModal();
});

// Cerrar modal al hacer clic en la X
closeButton.addEventListener('click', closeModal);

// ===== VALIDACIÓN DE CURP =====
function isValidCURP(curp) {
    if (!curp) return false;
    // Patrón simplificado: 18 caracteres alfanuméricos (mayúsculas preferible)
    return /^[A-Z0-9]{18}$/i.test(curp.trim());
}

// ===== VERIFICAR SI UNA HORA YA ESTÁ OCUPADA =====
function isSlotTaken(datetime, excludeId = null) {
    // Devuelve true si existe una cita en la misma fecha/hora
    // excludeId permite ignorar la cita que estamos editando
    return scheduledAppointments.some(a => a.datetime === datetime && a.id !== excludeId);
}


   // ===== GUARDAR / CREAR CITA =====
formCita.addEventListener('submit', function(e) {
    e.preventDefault();

    const nombre = modalNombreInput.value.trim();
    const curp = modalCurpInput.value.trim().toUpperCase();
    const tramite = modalTramiteSelect.value;
    const fecha = modalFechaInput.value; // YYYY-MM-DD
    const hora = modalHoraInput.value;   // HH:MM
    // También valida contra las citas actuales del servidor
    const fechaCompleta = fecha + 'T' + hora;
        if (scheduledAppointments.some(a => a.datetime === fechaCompleta && a.id !== currentEditingId)) {
    showMessageModal('Esta hora ya está ocupada, elige otra.', 'error');
    return;
}

    if (!hora) {
    showMessageModal('Selecciona una hora para la cita.', 'error');
    return;
}
    if (!nombre || !curp || !tramite || !fecha || !hora) {
        showMessageModal('Por favor completa todos los campos.', 'error');
        return;
    }

    if (!isValidCURP(curp)) {
        showMessageModal('CURP inválido. Debe tener 18 caracteres alfanuméricos.', 'error');
        return;
    }

    // Generar folio ANTES de enviarlo al servidor (solo si es nueva cita)
    const folio = currentEditingId ? scheduledAppointments.find(a => a.id === currentEditingId)?.folio : generarFolio(tramite);

    // Payload que enviaremos al servidor
    const payload = {
        id: currentEditingId || generateUUID(), // usa el id existente o genera uno nuevo
        nombre: nombre, 
        curp: curp,
        tramite: tramite,
        datetime: fechaCompleta,
        folio: folio // se envía al servidor
    };

    // Si estamos editando -> actualizar
    const endpoint = currentEditingId ? 'api/update_appointment.php' : 'api/create_appointment.php';

    showMessageModal(currentEditingId ? 'Guardando cambios...' : 'Guardando cita...', 'exito');

    fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(resp => {
        if (!resp || !resp.success) {
            throw new Error((resp && resp.message) ? resp.message : 'Error del servidor');
        }

        // Si todo ok, actualizar UI/calendar y memoria cliente
        if (currentEditingId) {
            // Actualizar en scheduledAppointments
            const idx = scheduledAppointments.findIndex(a => a.id === payload.id);
            if (idx !== -1) {
                scheduledAppointments[idx].nombre = nombre;
                scheduledAppointments[idx].curp = curp;
                scheduledAppointments[idx].tramite = tramite;
                scheduledAppointments[idx].datetime = payload.datetime;
            }
            // Actualizar evento en FullCalendar
            const ev = calendar.getEventById(payload.id);
            if (ev) {
                ev.setProp('title', tramite);
                ev.setStart(payload.datetime);
                ev.setExtendedProp('nombre', nombre);
                ev.setExtendedProp('curp', curp);
            }
            showMessageModal('✅ Cita actualizada. Descargando comprobante...', 'exito');
            setTimeout(() => {
                generarPdfCita(nombre, curp, tramite, fecha, hora, folio);
                closeModal();
            }, 900);
        } else {
            // Crear nuevo en la memoria y en FullCalendar
            const newAppointment = {
                id: payload.id,
                nombre: nombre,
                curp: curp,
                tramite: tramite,
                datetime: payload.datetime,
                folio: folio
            };
            scheduledAppointments.push(newAppointment);
            calendar.addEvent({
                id: newAppointment.id,
                title: newAppointment.tramite,
                start: newAppointment.datetime,
                extendedProps: { nombre: newAppointment.nombre, curp: newAppointment.curp },
                color: '#2980b9'
            });
            showMessageModal('✅ Cita registrada. Descargando tu comprobante...', 'exito');
            setTimeout(() => {
                generarPdfCita(nombre, curp, tramite, fecha, hora, folio);
                formCita.reset();
                closeModal();
            }, 900);
        }
    })
    .catch(err => {
        console.error('API error:', err);
        showMessageModal('Error al guardar la cita: ' + err.message, 'error');
    });

});


   // ===== ELIMINAR CITA =====
deleteButton.addEventListener('click', function() {
    if (!currentEditingId) return;
    if (!confirm('¿Seguro que deseas eliminar esta cita?')) return;

    fetch('api/delete_appointment.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: currentEditingId })
    })
    .then(res => res.json())
    .then(resp => {
        if (!resp || !resp.success) throw new Error(resp.message || 'Error en servidor');
        // eliminar de memoria y calendario
        scheduledAppointments = scheduledAppointments.filter(a => a.id !== currentEditingId);
        const ev = calendar.getEventById(currentEditingId);
        if (ev) ev.remove();
        showMessageModal('Cita eliminada.', 'exito');
        setTimeout(closeModal, 700);
    })
    .catch(err => {
        console.error(err);
        showMessageModal('No se pudo eliminar: ' + err.message, 'error');
    });
});


// ===== GUARDAR CITAS EN LOCALSTORAGE =====
function saveAppointments() {
    localStorage.getItem('appointments')

}

// ===== MENSAJES EN MODAL =====
function showMessageModal(texto, tipo) {
    mensajeModal.textContent = texto;
    mensajeModal.className = `mensaje ${tipo}`; // Clases 'exito' o 'error'
    mensajeModal.style.display = "block";

    // Ocultar mensaje después de 4 segundos
    setTimeout(() => {
        mensajeModal.style.display = "none";
    }, 4000);
}

// ===== DATOS DE REQUISITOS =====
const requisitos = {
    nacimiento: {
        titulo: "Requisitos para Registro de Nacimiento",
        items: [
            "Certificado de Nacimiento original (expedido por el hospital).",
            "Acta de Nacimiento de los padres.",
            "Identificación oficial vigente de los padres (INE, Pasaporte).",
            "Acta de Matrimonio (si aplica).",
            "Dos testigos mayores de edad con identificación oficial."
        ]
    },
    matrimonio: {
        titulo: "Requisitos para Matrimonio Civil",
        items: [
            "Solicitud de matrimonio debidamente llenada.",
            "Acta de nacimiento reciente de ambos contrayentes.",
            "Identificación oficial vigente de ambos.",
            "CURP de ambos contrayentes.",
            "Análisis clínicos prenupciales (con vigencia no mayor a 15 días).",
            "Constancia de soltería (si alguno es de otro estado).",
            "Dos testigos por cada contrayente con identificación oficial."
        ]
    },
    defuncion: {
        titulo: "Requisitos para Acta de Defunción",
        items: [
            "Certificado Médico de Defunción en formato original.",
            "Identificación oficial del fallecido.",
            "Acta de nacimiento del fallecido.",
            "Identificación oficial del declarante (familiar o responsable).",
            "CURP del fallecido."
        ]
    },
    otros: {
        titulo: "Requisitos para Copias Certificadas",
        items: [
            "Nombre completo de la persona registrada en el acta.",
            "Fecha exacta de nacimiento, matrimonio, etc.",
            "Lugar de registro (municipio, estado).",
            "CURP (si se tiene).",
            "Identificación oficial del solicitante.",
            "Comprobante de pago de derechos."
        ]
    }
};



// ===== GENERAR PDF DE REQUISITOS =====
function generarPdfRequisitos(tramiteId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = requisitos[tramiteId];
    if (!data) return;

    // === Logo superior izquierda ===
    const logo = new Image();
    logo.src = 'img/logo.png';
    logo.onload = () => { dibujarPDF(); };
    logo.onerror = () => { dibujarPDF(); };

    function dibujarPDF() {
        doc.addImage(logo, 'PNG', 15, 10, 25, 25);

        // === Encabezado ===
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#2c3e50');
        doc.text("Registro Civil de Nogales, Veracruz", 105, 20, null, null, "center");

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(data.titulo, 105, 30, null, null, "center");

        // === Línea separadora ===
        doc.setDrawColor('#b0b0b0');
        doc.setLineWidth(0.4);
        doc.line(15, 38, 195, 38);

        // === Recuadro de contenido ===
        doc.setFillColor('#f7f7f7');
        doc.roundedRect(15, 45, 180, 210, 4, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#2c3e50');
        doc.text('Documentos Requeridos:', 20, 55);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#000000');

        let y = 65;
        data.items.forEach((item, i) => {
            doc.text(`• ${item}`, 20, y, { maxWidth: 170 });
            y += 9;
            if (y > 245) { // Salto de página
                doc.addPage();
                y = 20;
            }
        });

        // === Línea separadora inferior ===
        doc.setDrawColor('#cccccc');
        doc.line(15, 265, 195, 265);

        // === Pie de página ===
        doc.setFontSize(10);
        doc.setTextColor('#7f8c8d');
        doc.text("Registro Civil Nogales, Veracruz", 105, 275, null, null, "center");
        doc.text("Av. Principal 123, Nogales, Ver. | Tel: 123 456 7890 | www.nogales.gob.mx", 105, 281, null, null, "center");

        // === Sello institucional ===
        const sello = new Image();
        sello.src = 'img/sello.png';
        sello.onload = () => {
            const ancho = 45;
            const alto = 10;
            const x = (210 - ancho) / 2;
            const ySello = 282; // Baja la imagen sello
            doc.addImage(sello, 'PNG', x, ySello, ancho, alto);
            doc.save(`requisitos_${tramiteId}.pdf`);
        };
        sello.onerror = () => {
            doc.save(`requisitos_${tramiteId}.pdf`);
        };
    }
}



// Conectar botones PDF de requisitos con la función generarPdfRequisitos
pdfButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tramiteId = this.dataset.tramite; // obtiene el ID del trámite desde data-tramite
        generarPdfRequisitos(tramiteId);        // genera y descarga el PDF correspondiente
    });
});

// Prefijos por tipo de trámite
const folioPrefixes = {
    "Registro de Nacimiento": "NAC",
    "Matrimonio Civil": "MAT",
    "Acta de Defunción": "DEF",
    "Copia Certificada": "CER"
};

// Función para generar folio consecutivo
function generarFolio(tramite) {
    const prefix = folioPrefixes[tramite] || "GEN";

    // Recuperar último número guardado en localStorage
    const key = `folio_${prefix}`; // usamos el prefijo como key para cada tipo de trámite
    let lastNumber = parseInt(localStorage.getItem(key) || "0");

    // Incrementar número
    lastNumber += 1;

    // Guardar número actualizado
    localStorage.setItem(key, lastNumber);

    // Formatear con ceros a la izquierda (0001)
    const numeroFormateado = String(lastNumber).padStart(4, "0");

    // Retornar folio completo con "FOLIO" y letras
    return `FOLIO-${prefix}-${numeroFormateado}`;
}


// Función para generar PDF de cita con jsPDF
function generarPdfCita(nombre, curp, tramite, fecha, hora, folio) {
    const doc = new jsPDF();
    const folioGenerado = folio || generarFolio(tramite); // si no se pasó, lo genera

    // Folio arriba a la derecha
    doc.setFontSize(10);
    doc.setTextColor('#555555'); // gris medio
    doc.text(folioGenerado, 190, 15, null, null, "right");

    // Logo arriba a la izquierda
    const logo = new Image();
    logo.src = 'img/logo.png';
    logo.onload = () => { doc.addImage(logo, 'PNG', 15, 10, 30, 30); dibujarContenido(); };
    logo.onerror = () => { dibujarContenido(); };

    function dibujarContenido() {
        // Encabezado limpio con título
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor('#2c3e50'); // gris oscuro
        doc.text("Comprobante de Cita - Registro Civil", 105, 22, null, null, "center");

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Nogales, Veracruz", 105, 32, null, null, "center");

        // Sección Datos del Solicitante
        doc.setFillColor('#f5f5f5'); // gris muy claro
        doc.setDrawColor('#cccccc'); // borde gris
        doc.roundedRect(15, 45, 180, 50, 4, 4, 'FD');

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor('#333333');
        doc.text("Datos del Solicitante:", 20, 55);

        doc.setFont("helvetica", "normal");
        doc.text(`Nombre: ${nombre}`, 20, 65);
        doc.text(`CURP: ${curp}`, 20, 75);

        // Sección Detalles de la Cita recuadro Gris donde contiene los datos
        doc.setFillColor('#e0e0e0'); // gris medio
        doc.setDrawColor('#cccccc');
        doc.roundedRect(15, 100, 180, 50, 4, 4, 'FD');

        doc.setFont("helvetica", "bold");
        doc.text("Detalles de la Cita:", 20, 110);
        doc.setFont("helvetica", "normal");
        doc.text(`Trámite: ${tramite}`, 20, 120);
        doc.text(`Fecha: ${fecha}`, 20, 130);
        doc.text(`Hora: ${hora}`, 20, 140);

        // Línea separadora
        doc.setDrawColor('#b0b0b0');
        doc.setLineWidth(0.5);
        doc.line(15, 160, 195, 160);

        // Instrucciones importantes
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor('#2c3e50');
        doc.text("Instrucciones Importantes:", 105, 170, null, null, "center");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const instructions = [
            "• Presentarse 15 minutos antes de la cita.",
            "• Llevar este comprobante impreso o en móvil.",
            "• Traer toda la documentación requerida."
        ];
        let y = 180;
        instructions.forEach(inst => {
            doc.text(inst, 20, y, { maxWidth: 170 });
            y += 8;
        });

         // Línea separadora
        doc.setDrawColor('#d0d0d0');
        doc.setLineWidth(0.5);
        doc.line(15, 275, 195, 275);  //270 arriba abajo

        // Pie de página
        doc.setFontSize(10);
        doc.setTextColor('#7f8c8d');
        doc.text("Registro Civil Nogales, Veracruz", 105, 280, null, null, "center");
        doc.text("Av. Principal 123, Nogales, Ver. | Tel: 123 456 7890 | www.nogales.gob.mx", 105, 285, null, null, "center");

        // ===== Sello abajo centrado =====
        const sello = new Image();
        sello.src = 'img/sello.png';
        sello.onload = () => {
            const anchoImagen = 50;
            const altoImagen = 10;
            const x = (210 - anchoImagen) / 2; //coloca la imagen izquierda o derecha
            const y = 295 - altoImagen; // coloca la imagen hacia arriba o abajo
            doc.addImage(sello, 'PNG', x, y, anchoImagen, altoImagen);
            doc.save(`cita_registro_civil_${folioGenerado}.pdf`);
        };
        sello.onerror = () => { 
            doc.save(`cita_registro_civil_${folioGenerado}.pdf`);
        };
    }
}


// HERO: carrusel de imágenes en la sección principal
const heroImages = [
    'img/portada01.jpg',
    'img/portada02.jpg',
    'img/portada03.jpg',
    'img/portada04.jpg',
    'img/portada05.jpg',
    'img/portada06.jpg'
];
let currentImageIndex = 0;

// Función para cambiar la imagen de fondo del hero
function changeHeroImage() {
    currentImageIndex = (currentImageIndex + 1) % heroImages.length; // avanza al siguiente índice, ciclando
    heroSection.style.backgroundImage = `url('${heroImages[currentImageIndex]}')`; // actualiza fondo
}

// Preload de imágenes y configuración inicial del hero
if (heroImages.length > 0) {
    heroImages.forEach(src => { const i = new Image(); i.src = src; }); // pre-carga para evitar parpadeo
    heroSection.style.backgroundImage = `url('${heroImages[0]}')`; // primera imagen inicial
    setInterval(changeHeroImage, 10000); // cambia cada 10 segundos
}

// NAVEGACIÓN: mostrar sección de detalles de un trámite
function showDetails(tramiteId) {
    mainContent.classList.add('hidden'); // oculta contenido principal
    detailsContent.classList.remove('hidden'); // muestra sección de detalles
    document.querySelectorAll('.detalle-tramite').forEach(section => section.classList.add('hidden')); // oculta todas las subsecciones
    const detailSection = document.getElementById(`detalle-${tramiteId}`); // selecciona la sección correspondiente
    if (detailSection) detailSection.classList.remove('hidden'); // muestra solo la sección seleccionada
    window.scrollTo(0, 0); // hace scroll al inicio de la página
}

// NAVEGACIÓN: volver a contenido principal
function showMainContent() {
    mainContent.classList.remove('hidden'); // muestra el contenido principal
    detailsContent.classList.add('hidden');  // oculta la sección de detalles
}

// Eventos de clic en cada tarjeta de trámite
tramiteCards.forEach(card => {
    card.addEventListener('click', function(e) {
        e.preventDefault();
        const tramiteId = this.dataset.tramite; // obtiene el ID del trámite
        showDetails(tramiteId); // muestra la sección de detalle
    });
});

// Eventos de clic en botones "Volver"
backButtons.forEach(button => {
    button.addEventListener('click', function() {
        showMainContent(); // vuelve al contenido principal
        document.getElementById('tramites').scrollIntoView({ behavior: 'smooth', block: 'start' }); // scroll suave a la sección de trámites
    });
});

// Eventos de navegación desde el header
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href'); // obtiene el ID del target
        if (targetId === '#inicio') {
            showMainContent(); // si es inicio, muestra el contenido principal
        } else {
            e.preventDefault(); // evita comportamiento por defecto
            showMainContent(); // asegura que el contenido principal esté visible
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); // scroll suave al elemento
                }, 100); // pequeño retraso para que se renderice contenido
            }
        }
    });
});


// -----------------------
// CHATBOT BÁSICO
// -----------------------

// Mostrar chatbot con retraso al cargar la página
setTimeout(() => {
    chatWindow.classList.remove('hidden'); // mostrar ventana
    addInitialMessage(); // agregar mensaje inicial del bot
}, 1500);

// Ajusta el chatbot según el tamaño de la pantalla
function ajustarChatPorPantalla() {
    if (window.innerWidth < 768) {
        chatWindow.classList.add('hidden'); // ocultar en móviles
    } else {
        chatWindow.classList.remove('hidden'); // mostrar en pantallas grandes
    }
}
ajustarChatPorPantalla(); // ejecutar al cargar
window.addEventListener('resize', ajustarChatPorPantalla); // actualizar al redimensionar

// Mensaje inicial del bot (sin abrir ventana en móvil)
function addInitialMessage() {
    const initialText = "Hola 👋 ¿En qué puedo ayudarte? Puedes preguntar por 'acta', 'matrimonio', etc.";
    addMessage(initialText, "bot");
}
addInitialMessage(); // ejecutar al cargar para mostrar mensaje inicial

// Toggle de visibilidad del chatbot al hacer clic en el botón
chatToggle.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden'); // mostrar u ocultar
    if (!chatWindow.classList.contains('hidden')) chatInput.focus(); // enfocar input si está abierto
});

// Enviar mensaje al presionar Enter
chatInput.addEventListener('keypress', (e) => {
    if (e.key === "Enter") {
        const userMsg = chatInput.value.trim();
        if (userMsg !== "") {
            addMessage(userMsg, "user"); // agregar mensaje del usuario
            responderBot(userMsg); // obtener respuesta del bot
            chatInput.value = ""; // limpiar input
        }
    }
});

// Función para agregar mensajes al chat
function addMessage(text, sender) {
    const messageContainer = document.createElement("div");
    messageContainer.className = sender === 'user' ? 'user-message' : 'bot-message'; // aplicar clase según remitente
    const p = document.createElement("p");
    p.textContent = text;
    if (sender === 'bot') p.classList.add('animated-message'); // animar mensajes del bot
    messageContainer.appendChild(p);
    chatBody.appendChild(messageContainer);
    chatBody.scrollTop = chatBody.scrollHeight; // desplazar scroll al último mensaje
}

// Base de conocimiento del chatbot
const knowledgeBase = {
    nacimiento: { keywords: ["acta", "nacimiento", "registrar bebe"], response: "Claro, te muestro la información para el Registro de Nacimiento.", tramiteId: "nacimiento" },
    matrimonio: { keywords: ["matrimonio", "casarse", "boda"], response: "Perfecto, aquí tienes los detalles sobre el Matrimonio Civil.", tramiteId: "matrimonio" },
    defuncion: { keywords: ["defuncion", "fallecimiento"], response: "Entendido, te presento los requisitos para el Acta de Defunción.", tramiteId: "defuncion" },
    copias: { keywords: ["copia", "copias certificadas", "certificado"], response: "Te redirijo a la sección de Copias Certificadas.", tramiteId: "otros" },
    saludo: { keywords: ["hola", "buenos dias", "buenas tardes"], response: "¡Hola! Soy el asistente virtual. Pregúntame sobre 'nacimiento', 'matrimonio' o 'copias'." },
    horarios: { keywords: ["horario", "abren", "cierran", "horas"], response: "Atendemos de Lunes a Viernes de 9:00 AM a 3:00 PM, y Sábados de 9:00 AM a 1:00 PM." },
    costos: { keywords: ["costo", "precio", "pago", "cuanto cuesta"], response: "Los costos varían por trámite. El pago se realiza en la tesorería municipal. Te recomendamos consultar directamente en oficinas para el monto exacto." },
    gracias: { keywords: ["gracias", "ok", "muy bien"], response: "¡De nada! Estoy para servirte. 😊" }
};

// Función para generar respuesta del bot
function responderBot(msg) {
    const lowerMsg = msg.toLowerCase(); // pasar mensaje a minúsculas
    let botResponse = "Lo siento, no entendí. Intenta con 'requisitos de matrimonio' o 'costos'.";
    let actionTramiteId = null;
    for (const key in knowledgeBase) {
        if (knowledgeBase[key].keywords.some(keyword => lowerMsg.includes(keyword))) {
            botResponse = knowledgeBase[key].response; // asignar respuesta
            if (knowledgeBase[key].tramiteId) actionTramiteId = knowledgeBase[key].tramiteId; // guardar ID de trámite
            break;
        }
    }
    setTimeout(() => {
        addMessage(botResponse, "bot"); // mostrar respuesta del bot
        if (actionTramiteId) {
            setTimeout(() => {
                showDetails(actionTramiteId); // mostrar sección de trámite correspondiente
                chatWindow.classList.add('hidden'); // cerrar chat automáticamente
            }, 800);
        }
    }, 300);
}

// Carga inicial de citas desde localStorage al calendario
function refreshCalendarEvents() {
    if (!calendar) return; // evitar errores si no existe calendario
    calendar.getEvents().forEach(ev => ev.remove()); // limpiar eventos actuales
    getCalendarEvents().forEach(e => calendar.addEvent(e)); // agregar eventos guardados
    calendar.updateSize(); // recalcula tamaño para visualización inmediata
}

// Sincronizar visualización con datos guardados
refreshCalendarEvents();

// (Opcional) Exponer funciones globales para pruebas en consola
window.__APP = {
    scheduledAppointments, // citas agendadas
    refreshCalendarEvents, // refrescar calendario
    saveAppointments // guardar citas
    };
});
