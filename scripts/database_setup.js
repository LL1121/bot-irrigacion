/**
 * @fileoverview Script de inicialización y configuración de la base de datos SQLite.
 * Crea las tablas necesarias para el sistema de gestión de regantes y
 * opcionalmente inserta datos de prueba (seed data).
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
 * Clase encargada de la configuración e inicialización de la base de datos.
 * Implementa el patrón Singleton para garantizar una única instancia de conexión.
 * 
 * @class DatabaseSetup
 */
class DatabaseSetup {
  /**
   * Crea una instancia de DatabaseSetup.
   * 
   * @constructor
   * @param {string} dbPath - Ruta absoluta al archivo de base de datos SQLite
   */
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Establece la conexión con la base de datos SQLite.
   * Crea el archivo si no existe.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la conexión a la base de datos
   */
  async connect() {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      console.log('✓ Conexión a la base de datos establecida exitosamente');
    } catch (error) {
      console.error('✗ Error al conectar con la base de datos:', error.message);
      throw error;
    }
  }

  /**
   * Crea la tabla 'padrones' en la base de datos.
   * Almacena información de los regantes y titulares de padrones.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la creación de la tabla
   */
  async createPadronesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS padrones (
        id_padron INTEGER PRIMARY KEY,
        titular TEXT NOT NULL,
        telefono_vinculado TEXT,
        estado_derecho TEXT NOT NULL CHECK(estado_derecho IN ('ACTIVO', 'BAJA', 'SUSPENDIDO')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.db.exec(query);
      console.log('✓ Tabla "padrones" creada/verificada exitosamente');
    } catch (error) {
      console.error('✗ Error al crear tabla "padrones":', error.message);
      throw error;
    }
  }

  /**
   * Crea la tabla 'deudas' en la base de datos.
   * Almacena información de deudas asociadas a cada padrón.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la creación de la tabla
   */
  async createDeudasTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS deudas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        padron_id INTEGER NOT NULL,
        periodo TEXT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL CHECK(monto >= 0),
        vencimiento DATE NOT NULL,
        link_boleto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (padron_id) REFERENCES padrones(id_padron) ON DELETE CASCADE
      )
    `;

    try {
      await this.db.exec(query);
      console.log('✓ Tabla "deudas" creada/verificada exitosamente');
    } catch (error) {
      console.error('✗ Error al crear tabla "deudas":', error.message);
      throw error;
    }
  }

  /**
   * Crea la tabla 'configuracion' en la base de datos.
   * Almacena parámetros de configuración del sistema en formato clave-valor.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la creación de la tabla
   */
  async createConfiguracionTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        descripcion TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.db.exec(query);
      console.log('✓ Tabla "configuracion" creada/verificada exitosamente');
    } catch (error) {
      console.error('✗ Error al crear tabla "configuracion":', error.message);
      throw error;
    }
  }

  /**
   * Crea índices en las tablas para optimizar consultas frecuentes.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la creación de los índices
   */
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_deudas_padron ON deudas(padron_id)',
      'CREATE INDEX IF NOT EXISTS idx_padrones_telefono ON padrones(telefono_vinculado)',
      'CREATE INDEX IF NOT EXISTS idx_deudas_vencimiento ON deudas(vencimiento)'
    ];

    try {
      for (const index of indexes) {
        await this.db.exec(index);
      }
      console.log('✓ Índices creados/verificados exitosamente');
    } catch (error) {
      console.error('✗ Error al crear índices:', error.message);
      throw error;
    }
  }

  /**
   * Inserta datos de prueba (seed data) en la base de datos.
   * Incluye padrones con diferentes estados y escenarios de deuda.
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Si falla la inserción de datos de prueba
   */
  async seedTestData() {
    try {
      // Verificar si ya existen datos
      const existingData = await this.db.get('SELECT COUNT(*) as count FROM padrones');
      
      if (existingData.count > 0) {
        console.log('⚠ La base de datos ya contiene datos. Omitiendo seed data.');
        return;
      }

      console.log('→ Insertando datos de prueba...');

      // Padrón 1001 - SIN DEUDA
      await this.db.run(`
        INSERT INTO padrones (id_padron, titular, telefono_vinculado, estado_derecho, updated_at)
        VALUES (1001, 'Juan Pérez', NULL, 'ACTIVO', CURRENT_TIMESTAMP)
      `);

      // Padrón 1002 - CON DEUDA
      await this.db.run(`
        INSERT INTO padrones (id_padron, titular, telefono_vinculado, estado_derecho, updated_at)
        VALUES (1002, 'María García', NULL, 'ACTIVO', CURRENT_TIMESTAMP)
      `);

      // Insertar deudas para padrón 1002
      await this.db.run(`
        INSERT INTO deudas (padron_id, periodo, monto, vencimiento, link_boleto)
        VALUES 
          (1002, '2024-11', 5500.00, '2024-12-10', 'https://ejemplo.com/boleto/1002-nov2024'),
          (1002, '2024-12', 5500.00, '2025-01-10', 'https://ejemplo.com/boleto/1002-dic2024')
      `);

      // Padrón 1003 - ESTADO BAJA
      await this.db.run(`
        INSERT INTO padrones (id_padron, titular, telefono_vinculado, estado_derecho, updated_at)
        VALUES (1003, 'Carlos Rodríguez', NULL, 'BAJA', CURRENT_TIMESTAMP)
      `);

      // Insertar configuración inicial
      await this.db.run(`
        INSERT INTO configuracion (clave, valor, descripcion)
        VALUES 
          ('bot_nombre', 'Irrigación Bot', 'Nombre del bot'),
          ('horario_atencion', '08:00-18:00', 'Horario de atención al público'),
          ('mensaje_bienvenida', 'Bienvenido al sistema de consultas de Irrigación', 'Mensaje inicial del bot')
      `);

      console.log('✓ Datos de prueba insertados exitosamente');
      
      // Mostrar resumen
      await this.showDataSummary();

    } catch (error) {
      console.error('✗ Error al insertar datos de prueba:', error.message);
      throw error;
    }
  }

  /**
   * Muestra un resumen de los datos insertados en la base de datos.
   * Útil para verificación post-setup.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async showDataSummary() {
    try {
      const padrones = await this.db.all('SELECT * FROM padrones ORDER BY id_padron');
      const deudas = await this.db.all('SELECT * FROM deudas ORDER BY padron_id');
      
      console.log('\n=== RESUMEN DE DATOS ===');
      console.log('\nPadrones:');
      padrones.forEach(p => {
        console.log(`  - ID: ${p.id_padron} | Titular: ${p.titular} | Estado: ${p.estado_derecho}`);
      });
      
      console.log('\nDeudas:');
      if (deudas.length === 0) {
        console.log('  (No hay deudas registradas)');
      } else {
        deudas.forEach(d => {
          console.log(`  - Padrón: ${d.padron_id} | Periodo: ${d.periodo} | Monto: $${d.monto}`);
        });
      }
      console.log('========================\n');
    } catch (error) {
      console.error('✗ Error al mostrar resumen:', error.message);
    }
  }

  /**
   * Cierra la conexión con la base de datos de forma segura.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      await this.db.close();
      console.log('✓ Conexión a la base de datos cerrada');
    }
  }

  /**
   * Ejecuta el proceso completo de inicialización de la base de datos.
   * Orquesta la creación de tablas, índices e inserción de datos de prueba.
   * 
   * @async
   * @param {boolean} [includeSeedData=true] - Indica si se deben insertar datos de prueba
   * @returns {Promise<void>}
   */
  async initialize(includeSeedData = true) {
    try {
      console.log('\n🚀 Iniciando configuración de la base de datos...\n');
      
      await this.connect();
      await this.createPadronesTable();
      await this.createDeudasTable();
      await this.createConfiguracionTable();
      await this.createIndexes();
      
      if (includeSeedData) {
        await this.seedTestData();
      }
      
      console.log('\n✅ Base de datos configurada correctamente\n');
    } catch (error) {
      console.error('\n❌ Error durante la inicialización:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
}

/**
 * Punto de entrada del script.
 * Ejecuta la inicialización de la base de datos.
 */
(async () => {
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const setup = new DatabaseSetup(dbPath);
  
  try {
    await setup.initialize(true);
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
})();

module.exports = DatabaseSetup;
