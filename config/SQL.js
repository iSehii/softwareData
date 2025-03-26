const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

const databaseMySQL = new Sequelize(
  process.env.SQLDB_NAME,
  process.env.SQLDB_USER,
  process.env.SQLDB_PASS,
  {
    dialect: 'mysql',
    host: process.env.SQLDB_HOST,
    port: process.env.SQLDB_PORT,
    define: {
      timestamps: true,
    },
    dialectOptions: {
      ca: process.env.SQLDB_CA
    },
  }
);

const conectarMySQL = async () => {
  try {
    await databaseMySQL.authenticate();
    console.log('Conectado a la base de datos MySQL.');

    await databaseMySQL.sync();
    console.log('Tablas sincronizadas.');
  } catch (error) {
    console.error('Error al conectar a la base de datos MSSQL:', error);
  }
};

module.exports = { conectarMySQL, databaseMySQL };
