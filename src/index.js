/**
 * @fileoverview Punto de entrada principal del Bot de WhatsApp para Irrigación.
 * Inicializa el cliente de WhatsApp y configura los manejadores de eventos.
 * 
 * @requires whatsapp-web.js
 * @requires qrcode-terminal
 * @author Irrigación - WhatsApp Bot
 * @version 1.0.0
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

/**
 * Clase principal del Bot de WhatsApp.
 * Maneja la inicialización y ciclo de vida del cliente de WhatsApp.
 * 
 * @class WhatsAppBot
 */
class WhatsAppBot {
  /**
   * Crea una instancia del Bot de WhatsApp.
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
   * Maneja los mensajes entrantes.
   * 
   * @param {Object} message - Objeto del mensaje de WhatsApp
   * @returns {Promise<void>}
   */
  async handleMessage(message) {
    // TODO: Implementar lógica de manejo de mensajes
    console.log(`📨 Mensaje de ${message.from}: ${message.body}`);
  }

  /**
   * Inicializa el cliente de WhatsApp.
   * 
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
