/**
 * @fileoverview Servicio de acceso a la base de datos SQLite.
 * Proporciona métodos para consultar y modificar datos de padrones, deudas y configuración.
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
 * Clase de servicio para operaciones de base de datos.
 * Implementa el patrón Singleton para garantizar una única conexión.
 * 
 * @class DatabaseService
 */
class DatabaseService {
  /**
   * Crea una instancia del servicio de base de datos.
   * 
   * @constructor
   */
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
  }

  /**
   * Establece la conexión con la base de datos SQLite.
   * Habilita el soporte para claves foráneas.
   * 
   * @async
   * @returns {Promise<Object>} Instancia de la base de datos conectada
   * @throws {Error} Si falla la conexión a la base de datos
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
      
      console.log('✓ Conexión a la base de datos establecida');
      return this.db;
    } catch (error) {
      console.error('✗ Error al conectar con la base de datos:', error.message);
      throw error;
    }
  }

  /**
   * Busca un usuario (padrón) por su número de teléfono vinculado.
   * 
   * @async
   * @param {string} numeroTelefono - Número de teléfono del usuario (formato WhatsApp)
   * @returns {Promise<Object|null>} Objeto con los datos del padrón o null si no existe
   * @throws {Error} Si falla la consulta a la base de datos
   * 
   * @example
   * const usuario = await db.obtenerUsuarioPorTelefono('5491234567890@c.us');
   * if (usuario) {
   *   console.log(`Padrón: ${usuario.id_padron}, Titular: ${usuario.titular}`);
   * }
   */
  async obtenerUsuarioPorTelefono(numeroTelefono) {
    try {
      await this.connect();
      
      const query = `
        SELECT id_padron, titular, telefono_vinculado, estado_derecho, updated_at
        FROM padrones
        WHERE telefono_vinculado = ?
      `;
      
      const usuario = await this.db.get(query, [numeroTelefono]);
      return usuario || null;
    } catch (error) {
      console.error('✗ Error al obtener usuario por teléfono:', error.message);
      throw error;
    }
  }

  /**
   * Vincula un número de teléfono a un padrón existente.
   * Actualiza el campo telefono_vinculado y la fecha de actualización.
   * 
   * @async
   * @param {number} padronId - ID del padrón a vincular
   * @param {string} numeroTelefono - Número de teléfono a vincular (formato WhatsApp)
   * @returns {Promise<Object>} Objeto con el resultado de la vinculación
   * @returns {boolean} return.success - Indica si la vinculación fue exitosa
   * @returns {string} return.message - Mensaje descriptivo del resultado
   * @returns {Object|null} return.padron - Datos del padrón vinculado o null
   * @throws {Error} Si falla la actualización en la base de datos
   * 
   * @example
   * const resultado = await db.vincularTelefono(1001, '5491234567890@c.us');
   * if (resultado.success) {
   *   console.log('Vinculación exitosa');
   * }
   */
  async vincularTelefono(padronId, numeroTelefono) {
    try {
      await this.connect();

      // Verificar si el padrón existe
      const padron = await this.obtenerPadron(padronId);
      
      if (!padron) {
        return {
          success: false,
          message: 'El número de padrón no existe en el sistema',
          padron: null
        };
      }

      // Verificar si el padrón ya está vinculado a otro teléfono
      if (padron.telefono_vinculado && padron.telefono_vinculado !== numeroTelefono) {
        return {
          success: false,
          message: 'Este padrón ya está vinculado a otro número de teléfono',
          padron: null
        };
      }

      // Verificar si el teléfono ya está vinculado a otro padrón
      const usuarioExistente = await this.obtenerUsuarioPorTelefono(numeroTelefono);
      if (usuarioExistente && usuarioExistente.id_padron !== padronId) {
        return {
          success: false,
          message: 'Este teléfono ya está vinculado a otro padrón',
          padron: null
        };
      }

      // Realizar la vinculación
      const updateQuery = `
        UPDATE padrones
        SET telefono_vinculado = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_padron = ?
      `;
      
      await this.db.run(updateQuery, [numeroTelefono, padronId]);

      // Obtener el padrón actualizado
      const padronActualizado = await this.obtenerPadron(padronId);

      return {
        success: true,
        message: 'Teléfono vinculado exitosamente',
        padron: padronActualizado
      };
    } catch (error) {
      console.error('✗ Error al vincular teléfono:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene información completa de un padrón por su ID.
   * 
   * @async
   * @param {number} padronId - ID del padrón a consultar
   * @returns {Promise<Object|null>} Objeto con los datos del padrón o null si no existe
   * @throws {Error} Si falla la consulta a la base de datos
   * 
   * @example
   * const padron = await db.obtenerPadron(1001);
   * if (padron) {
   *   console.log(`Titular: ${padron.titular}, Estado: ${padron.estado_derecho}`);
   * }
   */
  async obtenerPadron(padronId) {
    try {
      await this.connect();
      
      const query = `
        SELECT id_padron, titular, telefono_vinculado, estado_derecho, updated_at
        FROM padrones
        WHERE id_padron = ?
      `;
      
      const padron = await this.db.get(query, [padronId]);
      return padron || null;
    } catch (error) {
      console.error('✗ Error al obtener padrón:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de deudas de un padrón.
   * Calcula el total adeudado y devuelve el listado de períodos pendientes.
   * 
   * @async
   * @param {number} padronId - ID del padrón a consultar
   * @returns {Promise<Object>} Objeto con el resumen de deudas
   * @returns {number} return.total - Monto total adeudado
   * @returns {Array<Object>} return.deudas - Array con el detalle de cada deuda
   * @returns {number} return.cantidad - Cantidad de períodos adeudados
   * @throws {Error} Si falla la consulta a la base de datos
   * 
   * @example
   * const { total, deudas, cantidad } = await db.obtenerDeuda(1002);
   * console.log(`Total adeudado: $${total} en ${cantidad} períodos`);
   * deudas.forEach(d => console.log(`- ${d.periodo}: $${d.monto}`));
   */
  async obtenerDeuda(padronId) {
    try {
      await this.connect();
      
      const query = `
        SELECT id, padron_id, periodo, monto, vencimiento, link_boleto, created_at
        FROM deudas
        WHERE padron_id = ?
        ORDER BY vencimiento ASC
      `;
      
      const deudas = await this.db.all(query, [padronId]);
      
      // Calcular el total
      const total = deudas.reduce((sum, deuda) => sum + parseFloat(deuda.monto), 0);

      return {
        total: total.toFixed(2),
        deudas: deudas,
        cantidad: deudas.length
      };
    } catch (error) {
      console.error('✗ Error al obtener deudas:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un valor de configuración del sistema.
   * 
   * @async
   * @param {string} clave - Clave del parámetro de configuración
   * @returns {Promise<string|null>} Valor de la configuración o null si no existe
   * @throws {Error} Si falla la consulta a la base de datos
   */
  async obtenerConfiguracion(clave) {
    try {
      await this.connect();
      
      const query = 'SELECT valor FROM configuracion WHERE clave = ?';
      const config = await this.db.get(query, [clave]);
      
      return config ? config.valor : null;
    } catch (error) {
      console.error('✗ Error al obtener configuración:', error.message);
      throw error;
    }
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
      console.log('✓ Conexión a la base de datos cerrada');
    }
  }
}

// Exportar instancia única (Singleton)
const dbService = new DatabaseService();
module.exports = dbService;
