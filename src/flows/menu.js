/**
 * @fileoverview Módulo de menús y mensajes del bot.
 * Centraliza todos los textos y opciones de los flujos de conversación.
 * 
 * @author Irrigación - WhatsApp Bot
 * @version 1.0.0
 */

/**
 * Genera el menú principal para usuarios públicos (no vinculados).
 * Muestra opciones de información general y proceso de vinculación.
 * 
 * @returns {string} Texto formateado del menú público
 * 
 * @example
 * const menu = getMenuPublico();
 * await client.sendMessage(chatId, menu);
 */
function getMenuPublico() {
  return `🌾 *Bienvenido a Irrigación* 🌾

Seleccioná una opción escribiendo el número:

*1️⃣* - Ubicación y Horarios
*2️⃣* - Información sobre Empadronamiento
*3️⃣* - Ingresar al Sistema (Vincular Padrón)

_Para continuar, escribí el número de la opción._`;
}

/**
 * Genera el menú principal para regantes vinculados.
 * Muestra opciones específicas según el estado del padrón.
 * 
 * @param {string} nombre - Nombre del titular del padrón
 * @param {string} [estadoDerecho='ACTIVO'] - Estado actual del derecho (ACTIVO, BAJA, SUSPENDIDO)
 * @returns {string} Texto formateado del menú de regante
 * 
 * @example
 * const menu = getMenuRegante('Juan Pérez', 'ACTIVO');
 * await client.sendMessage(chatId, menu);
 */
function getMenuRegante(nombre, estadoDerecho = 'ACTIVO') {
  let estadoEmoji = '✅';
  let estadoTexto = 'ACTIVO';

  if (estadoDerecho === 'BAJA') {
    estadoEmoji = '⚠️';
    estadoTexto = 'DADO DE BAJA';
  } else if (estadoDerecho === 'SUSPENDIDO') {
    estadoEmoji = '⏸️';
    estadoTexto = 'SUSPENDIDO';
  }

  return `👤 *Hola ${nombre}!*

${estadoEmoji} Estado del Derecho: *${estadoTexto}*

¿Qué consulta necesitás hacer?

*1️⃣* - Consultar Deuda
*2️⃣* - Estado del Derecho de Riego
*3️⃣* - Solicitar Turno de Riego
*4️⃣* - Salir del Sistema

_Escribí el número de la opción._`;
}

/**
 * Mensaje de bienvenida al proceso de vinculación.
 * Solicita al usuario que ingrese su número de padrón.
 * 
 * @returns {string} Texto del mensaje de vinculación
 */
function getMensajeVinculacion() {
  return `🔗 *Vinculación de Padrón*

Para acceder a los servicios de regante, necesitás vincular tu número de padrón a este WhatsApp.

📋 Por favor, *escribí tu número de padrón*.

Ejemplo: Si tu padrón es 1001, escribí: *1001*

_Para cancelar, escribí "cancelar"_`;
}

/**
 * Mensaje de información sobre ubicación y horarios.
 * 
 * @returns {string} Texto con la información de contacto
 */
function getMensajeUbicacion() {
  return `📍 *Ubicación y Horarios*

*Dirección:*
Calle Principal 123, Ciudad
Mendoza, Argentina

*Horarios de Atención:*
Lunes a Viernes: 8:00 - 18:00 hs
Sábados: 9:00 - 13:00 hs

*Teléfono:*
(0261) 123-4567

*Email:*
info@irrigacion.gob.ar`;
}

/**
 * Mensaje de información sobre el proceso de empadronamiento.
 * 
 * @returns {string} Texto explicativo del empadronamiento
 */
function getMensajeEmpadronamiento() {
  return `📋 *Información sobre Empadronamiento*

Para registrarte como regante, necesitás:

✅ Documento de identidad (DNI)
✅ Título de propiedad o boleto de compra-venta
✅ Certificado de libre deuda (si corresponde)
✅ Formulario de solicitud (se entrega en nuestras oficinas)

*Pasos a seguir:*
1. Acercate a nuestras oficinas en horario de atención
2. Presentá la documentación requerida
3. Completá el formulario de solicitud
4. Aguardá la asignación de tu número de padrón

*Tiempo estimado:* 15 días hábiles

Para más información, seleccioná la opción *1* del menú principal.`;
}

/**
 * Formatea el detalle de deudas para mostrar al usuario.
 * 
 * @param {Object} deudaInfo - Objeto con información de deudas
 * @param {number} deudaInfo.total - Total adeudado
 * @param {Array<Object>} deudaInfo.deudas - Array de deudas
 * @param {number} deudaInfo.cantidad - Cantidad de períodos
 * @returns {string} Texto formateado con el detalle de deudas
 */
function formatearDeuda(deudaInfo) {
  if (deudaInfo.cantidad === 0) {
    return `✅ *Estado de Deuda*

¡Excelente! No tenés deudas pendientes.

Tu cuenta está al día. 💚`;
  }

  let mensaje = `💳 *Estado de Deuda*\n\n`;
  mensaje += `Total Adeudado: *$${deudaInfo.total}*\n`;
  mensaje += `Períodos pendientes: *${deudaInfo.cantidad}*\n\n`;
  mensaje += `📋 *Detalle:*\n\n`;

  deudaInfo.deudas.forEach((deuda, index) => {
    const fecha = new Date(deuda.vencimiento);
    const fechaFormateada = fecha.toLocaleDateString('es-AR');
    
    mensaje += `${index + 1}. *Período ${deuda.periodo}*\n`;
    mensaje += `   💰 Monto: $${parseFloat(deuda.monto).toFixed(2)}\n`;
    mensaje += `   📅 Vencimiento: ${fechaFormateada}\n`;
    
    if (deuda.link_boleto) {
      mensaje += `   🔗 Boleto: ${deuda.link_boleto}\n`;
    }
    mensaje += `\n`;
  });

  mensaje += `_Para realizar el pago, podés acercarte a nuestras oficinas o usar los links de los boletos._`;

  return mensaje;
}

/**
 * Mensaje sobre el estado del derecho de riego.
 * 
 * @param {Object} padron - Datos del padrón
 * @returns {string} Texto formateado con el estado
 */
function formatearEstadoDerecho(padron) {
  let emoji = '✅';
  let estadoTexto = 'ACTIVO';
  let mensaje = '';

  if (padron.estado_derecho === 'BAJA') {
    emoji = '⚠️';
    estadoTexto = 'DADO DE BAJA';
    mensaje = `\n⚠️ Tu derecho de riego está dado de baja. Para regularizar tu situación, acercate a nuestras oficinas.`;
  } else if (padron.estado_derecho === 'SUSPENDIDO') {
    emoji = '⏸️';
    estadoTexto = 'SUSPENDIDO';
    mensaje = `\n⏸️ Tu derecho de riego está suspendido. Esto puede deberse a deuda pendiente o falta de documentación. Contactanos para regularizar.`;
  } else {
    mensaje = `\n✅ Tu derecho de riego está activo y vigente. Podés solicitar turnos de riego normalmente.`;
  }

  return `${emoji} *Estado del Derecho de Riego*

*Padrón:* ${padron.id_padron}
*Titular:* ${padron.titular}
*Estado:* ${estadoTexto}${mensaje}`;
}

/**
 * Genera los datos de contacto en formato VCard para solicitud de turnos.
 * 
 * @returns {string} VCard formateado
 */
function getVCardTurnos() {
  return `BEGIN:VCARD
VERSION:3.0
FN:Irrigación - Turnos de Riego
ORG:Irrigación
TEL;TYPE=CELL:+542611234567
EMAIL:turnos@irrigacion.gob.ar
ADR:;;Calle Principal 123;Ciudad;Mendoza;5500;Argentina
END:VCARD`;
}

/**
 * Mensaje de error genérico.
 * 
 * @returns {string} Texto del mensaje de error
 */
function getMensajeError() {
  return `❌ *Error*

Ocurrió un problema al procesar tu solicitud. Por favor, intentá nuevamente o contactanos directamente.

_Escribí "menu" para volver al menú principal._`;
}

/**
 * Mensaje de opción inválida.
 * 
 * @returns {string} Texto del mensaje
 */
function getMensajeOpcionInvalida() {
  return `⚠️ *Opción no válida*

Por favor, escribí el *número* de una opción del menú.

_Escribí "menu" para ver las opciones disponibles._`;
}

/**
 * Mensaje de despedida al salir del sistema.
 * 
 * @returns {string} Texto de despedida
 */
function getMensajeDespedida() {
  return `👋 *Hasta luego!*

Gracias por usar el sistema de Irrigación.

_Escribí "menu" cuando necesites realizar otra consulta._`;
}

/**
 * Mensaje de confirmación de vinculación exitosa.
 * 
 * @param {Object} padron - Datos del padrón vinculado
 * @returns {string} Texto de confirmación
 */
function getMensajeVinculacionExitosa(padron) {
  return `✅ *Vinculación Exitosa!*

Tu número de WhatsApp ha sido vinculado correctamente.

*Datos del Padrón:*
📋 Número: ${padron.id_padron}
👤 Titular: ${padron.titular}
${padron.estado_derecho === 'ACTIVO' ? '✅' : '⚠️'} Estado: ${padron.estado_derecho}

Ahora podés acceder a todos los servicios del sistema.

_Escribí "menu" para ver las opciones disponibles._`;
}

module.exports = {
  getMenuPublico,
  getMenuRegante,
  getMensajeVinculacion,
  getMensajeUbicacion,
  getMensajeEmpadronamiento,
  formatearDeuda,
  formatearEstadoDerecho,
  getVCardTurnos,
  getMensajeError,
  getMensajeOpcionInvalida,
  getMensajeDespedida,
  getMensajeVinculacionExitosa
};
