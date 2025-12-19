/**
 * @fileoverview Punto de entrada principal del Bot de WhatsApp para Irrigación.
 * Inicializa el cliente de WhatsApp y configura los manejadores de eventos.
 * Implementa la lógica de flujos para usuarios públicos y regantes vinculados.
 * 
 * @requires whatsapp-web.js
 * @requires qrcode-terminal
 * @author Irrigación - WhatsApp Bot
 * @version 1.0.0
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./services/db');
const {
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
} = require('./flows/menu');

/**
 * Estados posibles de una conversación con un usuario.
 * 
 * @enum {string}
 * @readonly
 */
const ESTADOS_CONVERSACION = {
  INICIAL: 'INICIAL',
  MENU_PUBLICO: 'MENU_PUBLICO',
  MENU_REGANTE: 'MENU_REGANTE',
  ESPERANDO_PADRON: 'ESPERANDO_PADRON'
};

/**
 * Clase principal del Bot de WhatsApp.
 * Maneja la inicialización, eventos y lógica de negocio del bot.
 * 
 * @class WhatsAppBot
 */
class WhatsAppBot {
  /**
   * Crea una instancia del Bot de WhatsApp.
   * Inicializa el cliente y las estructuras de control de estado.
   * 
   * @constructor
   */
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    // Map para trackear el estado de cada conversación
    // Key: número de teléfono, Value: estado actual
    this.estadosUsuarios = new Map();
    
    this.setupEventHandlers();
  }

  /**
   * Configura los manejadores de eventos del cliente de WhatsApp.
   * 
   * @private
   * @returns {void}
   */
  setupEventHandlers() {
    this.client.on('qr', this.handleQR.bind(this));
    this.client.on('ready', this.handleReady.bind(this));
    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('authenticated', this.handleAuthenticated.bind(this));
    this.client.on('auth_failure', this.handleAuthFailure.bind(this));
  }

  /**
   * Maneja el evento de generación del código QR.
   * 
   * @param {string} qr - Código QR generado
   * @returns {void}
   */
  handleQR(qr) {
    console.log('\n📱 Escanea el código QR con WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  }

  /**
   * Maneja el evento de cliente listo.
   * 
   * @returns {void}
   */
  handleReady() {
    console.log('✅ Bot de WhatsApp listo y funcionando!');
    console.log('📞 Esperando mensajes...\n');
  }

  /**
   * Maneja el evento de autenticación exitosa.
   * 
   * @returns {void}
   */
  handleAuthenticated() {
    console.log('🔐 Autenticación exitosa');
  }

  /**
   * Maneja el evento de fallo en la autenticación.
   * 
   * @param {string} message - Mensaje de error
   * @returns {void}
   */
  handleAuthFailure(message) {
    console.error('❌ Fallo en la autenticación:', message);
  }

  /**
   * Normaliza el texto del mensaje entrante.
   * Elimina espacios extras y convierte a minúsculas.
   * 
   * @private
   * @param {string} texto - Texto a normalizar
   * @returns {string} Texto normalizado
   */
  normalizarTexto(texto) {
    return texto.trim().toLowerCase();
  }

  /**
   * Obtiene el estado actual de la conversación con un usuario.
   * Si no existe, retorna el estado INICIAL.
   * 
   * @private
   * @param {string} numeroTelefono - Número de teléfono del usuario
   * @returns {string} Estado actual de la conversación
   */
  obtenerEstadoUsuario(numeroTelefono) {
    return this.estadosUsuarios.get(numeroTelefono) || ESTADOS_CONVERSACION.INICIAL;
  }

  /**
   * Establece el estado de la conversación con un usuario.
   * 
   * @private
   * @param {string} numeroTelefono - Número de teléfono del usuario
   * @param {string} estado - Nuevo estado de la conversación
   * @returns {void}
   */
  establecerEstadoUsuario(numeroTelefono, estado) {
    this.estadosUsuarios.set(numeroTelefono, estado);
  }

  /**
   * Maneja los mensajes entrantes de los usuarios.
   * Implementa la lógica principal del bot diferenciando entre usuarios públicos y regantes.
   * 
   * @async
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @returns {Promise<void>}
   */
  async handleMessage(msg) {
    try {
      // Ignorar mensajes de grupos y de broadcast
      if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
        return;
      }

      const numeroTelefono = msg.from;
      const textoNormalizado = this.normalizarTexto(msg.body);
      
      console.log(`📨 Mensaje de ${numeroTelefono}: ${msg.body}`);

      // Comando global "menu" - reinicia la conversación
      if (textoNormalizado === 'menu') {
        this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.INICIAL);
        await this.procesarMensajeInicial(msg);
        return;
      }

      // Obtener el estado actual del usuario
      const estadoActual = this.obtenerEstadoUsuario(numeroTelefono);

      // Procesar según el estado
      switch (estadoActual) {
        case ESTADOS_CONVERSACION.INICIAL:
          await this.procesarMensajeInicial(msg);
          break;

        case ESTADOS_CONVERSACION.MENU_PUBLICO:
          await this.procesarMenuPublico(msg, textoNormalizado);
          break;

        case ESTADOS_CONVERSACION.MENU_REGANTE:
          await this.procesarMenuRegante(msg, textoNormalizado);
          break;

        case ESTADOS_CONVERSACION.ESPERANDO_PADRON:
          await this.procesarVinculacion(msg, textoNormalizado);
          break;

        default:
          await this.procesarMensajeInicial(msg);
      }

    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
      await msg.reply(getMensajeError());
    }
  }

  /**
   * Procesa el mensaje inicial de un usuario.
   * Verifica si el usuario está vinculado y muestra el menú correspondiente.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @returns {Promise<void>}
   */
  async procesarMensajeInicial(msg) {
    const numeroTelefono = msg.from;

    // Consultar si el usuario está vinculado
    const usuario = await db.obtenerUsuarioPorTelefono(numeroTelefono);

    if (usuario) {
      // Usuario vinculado - Mostrar menú de regante
      const menu = getMenuRegante(usuario.titular, usuario.estado_derecho);
      await msg.reply(menu);
      this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.MENU_REGANTE);
    } else {
      // Usuario público - Mostrar menú público
      const menu = getMenuPublico();
      await msg.reply(menu);
      this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.MENU_PUBLICO);
    }
  }

  /**
   * Procesa las opciones del menú público.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @param {string} opcion - Opción seleccionada por el usuario
   * @returns {Promise<void>}
   */
  async procesarMenuPublico(msg, opcion) {
    switch (opcion) {
      case '1':
        // Ubicación y horarios
        await msg.reply(getMensajeUbicacion());
        break;

      case '2':
        // Información sobre empadronamiento
        await msg.reply(getMensajeEmpadronamiento());
        break;

      case '3':
        // Proceso de vinculación
        await msg.reply(getMensajeVinculacion());
        this.establecerEstadoUsuario(msg.from, ESTADOS_CONVERSACION.ESPERANDO_PADRON);
        break;

      default:
        await msg.reply(getMensajeOpcionInvalida());
    }
  }

  /**
   * Procesa las opciones del menú de regante.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @param {string} opcion - Opción seleccionada por el usuario
   * @returns {Promise<void>}
   */
  async procesarMenuRegante(msg, opcion) {
    const numeroTelefono = msg.from;
    const usuario = await db.obtenerUsuarioPorTelefono(numeroTelefono);

    if (!usuario) {
      // Error: el usuario ya no está vinculado
      await this.procesarMensajeInicial(msg);
      return;
    }

    switch (opcion) {
      case '1':
        // Consultar deuda
        await this.consultarDeuda(msg, usuario);
        break;

      case '2':
        // Estado del derecho de riego
        await this.consultarEstadoDerecho(msg, usuario);
        break;

      case '3':
        // Solicitar turno de riego
        await this.solicitarTurno(msg);
        break;

      case '4':
        // Salir del sistema
        await msg.reply(getMensajeDespedida());
        this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.INICIAL);
        break;

      default:
        await msg.reply(getMensajeOpcionInvalida());
    }
  }

  /**
   * Procesa la vinculación de un número de padrón al teléfono del usuario.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @param {string} textoNormalizado - Texto normalizado del mensaje
   * @returns {Promise<void>}
   */
  async procesarVinculacion(msg, textoNormalizado) {
    const numeroTelefono = msg.from;

    // Permitir cancelar la vinculación
    if (textoNormalizado === 'cancelar') {
      await msg.reply('❌ Vinculación cancelada.\n\n_Escribí "menu" para volver al menú principal._');
      this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.INICIAL);
      return;
    }

    // Validar que sea un número
    const padronId = parseInt(textoNormalizado, 10);
    
    if (isNaN(padronId)) {
      await msg.reply('⚠️ Por favor, ingresá un número de padrón válido.\n\nEjemplo: *1001*\n\n_Para cancelar, escribí "cancelar"_');
      return;
    }

    // Intentar vincular
    const resultado = await db.vincularTelefono(padronId, numeroTelefono);

    if (resultado.success) {
      await msg.reply(getMensajeVinculacionExitosa(resultado.padron));
      this.establecerEstadoUsuario(numeroTelefono, ESTADOS_CONVERSACION.INICIAL);
    } else {
      await msg.reply(`❌ *Error en la vinculación*\n\n${resultado.message}\n\n_Por favor, verificá el número de padrón e intentá nuevamente._\n_Para cancelar, escribí "cancelar"_`);
    }
  }

  /**
   * Consulta y envía el estado de deuda de un regante.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @param {Object} usuario - Datos del usuario/padrón
   * @returns {Promise<void>}
   */
  async consultarDeuda(msg, usuario) {
    const deudaInfo = await db.obtenerDeuda(usuario.id_padron);
    const mensajeDeuda = formatearDeuda(deudaInfo);
    await msg.reply(mensajeDeuda);
  }

  /**
   * Consulta y envía el estado del derecho de riego.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @param {Object} usuario - Datos del usuario/padrón
   * @returns {Promise<void>}
   */
  async consultarEstadoDerecho(msg, usuario) {
    const padron = await db.obtenerPadron(usuario.id_padron);
    const mensajeEstado = formatearEstadoDerecho(padron);
    await msg.reply(mensajeEstado);
  }

  /**
   * Envía información de contacto para solicitar turno de riego.
   * Envía una VCard con los datos de contacto de la oficina.
   * 
   * @async
   * @private
   * @param {Object} msg - Objeto del mensaje de WhatsApp
   * @returns {Promise<void>}
   */
  async solicitarTurno(msg) {
    const mensajeInfo = `📅 *Solicitud de Turno de Riego*

Para solicitar un turno de riego, podés:

1️⃣ Contactarte directamente con nuestra oficina de turnos
2️⃣ Llamar al teléfono que te enviamos a continuación
3️⃣ Acercarte personalmente en horario de atención

_Te envío el contacto..._`;

    await msg.reply(mensajeInfo);

    // Enviar VCard con el contacto
    const vcard = getVCardTurnos();
    const contacto = new MessageMedia('text/vcard', Buffer.from(vcard).toString('base64'), 'Irrigacion-Turnos.vcf');
    
    await this.client.sendMessage(msg.from, contacto, {
      caption: '📞 Guardá este contacto para solicitar turnos de riego'
    });
  }

  /**
   * Inicializa el cliente de WhatsApp.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async start() {
    try {
      console.log('🚀 Iniciando Bot de WhatsApp para Irrigación...\n');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Error al iniciar el bot:', error);
      process.exit(1);
    }
  }
}

// Inicializar y ejecutar el bot
const bot = new WhatsAppBot();
bot.start();

module.exports = WhatsAppBot;
