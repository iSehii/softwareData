const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

const databaseMySQL = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, 
    }
  },
  logging: false
});

const conectarMySQL = async () => {
  try {
    await databaseMySQL.authenticate();
    console.log('Conectado a la base de datos MySQL.');

    await databaseMySQL.sync({ force: true });
    console.log('Tablas sincronizadas.');
  } catch (error) {
    console.error('Error al conectar a la base de datos MSQL:', error);
  }
};

module.exports = { conectarMySQL, databaseMySQL };
