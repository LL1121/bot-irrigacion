/**
 * @fileoverview Configuración de conexión a la base de datos SQLite.
 * Proporciona una interfaz centralizada para acceso a la base de datos.
 * 
 * @requires sqlite
 * @requires sqlite3
 * @author Irrigación - WhatsApp Bot
 * @version 1.0.0
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

/**
 * Clase Singleton para gestión de la conexión a la base de datos.
 * 
 * @class Database
 */
class Database {
  /**
   * Instancia única de la clase (patrón Singleton).
   * 
   * @private
   * @static
   * @type {Database}
   */
  static instance = null;

  /**
   * Crea o retorna la instancia única de Database.
   * 
   * @constructor
   */
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.db = null;
    this.dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
    Database.instance = this;
  }

  /**
   * Establece la conexión con la base de datos.
   * 
   * @async
   * @returns {Promise<Object>} Instancia de la base de datos
   * @throws {Error} Si falla la conexión
   */
  async connect() {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Habilitar claves foráneas
      await this.db.exec('PRAGMA foreign_keys = ON');

      return this.db;
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error);
      throw error;
    }
  }

  /**
   * Retorna la instancia de la base de datos.
   * 
   * @returns {Object} Instancia de la base de datos
   * @throws {Error} Si no hay conexión establecida
   */
  getDb() {
    if (!this.db) {
      throw new Error('Base de datos no inicializada. Llama a connect() primero.');
    }
    return this.db;
  }

  /**
   * Cierra la conexión con la base de datos.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

module.exports = new Database();
