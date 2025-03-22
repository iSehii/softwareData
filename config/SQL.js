const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseSQL = new Sequelize(
  process.env.SQLDB_NAME,
  process.env.SQLDB_USER,
  process.env.SQLDB_PASS,
  {
    host: process.env.SQLDB_HOST,
    dialect: 'mysql',
  }
);

const Rol = require('../models/rolModel')(databaseSQL, Sequelize.DataTypes);
const Imperfeccion = require('../models/imperfeccionModel')(databaseSQL, Sequelize.DataTypes);
const Usuario = require('../models/usuarioModel')(databaseSQL, Sequelize.DataTypes);
const Carroceria = require('../models/carroceriaModel')(databaseSQL, Sequelize.DataTypes);
const ImperfeccionCarroceria = require('../models/imperfeccionCarroceriaModel')(databaseSQL, Sequelize.DataTypes);
const Reporte = require('../models/reporteModel')(databaseSQL, Sequelize.DataTypes);


Usuario.belongsTo(Rol, {
  foreignKey: { name: 'fk_usuario_rol', field: 'id_rol' }
});

Reporte.belongsTo(Imperfeccion, {
  foreignKey: { name: 'fk_reporte_imperfeccion', field: 'id_imperfecciones' }
});
Reporte.belongsTo(Carroceria, {
  foreignKey: { name: 'fk_reporte_carroceria', field: 'id_carrocerias' }
});

Carroceria.belongsToMany(Imperfeccion, {
  through: {
    model: ImperfeccionCarroceria,
    unique: true
  },
  foreignKey: { name: 'fk_carr_ic', field: 'id_carrocerias' },
  otherKey: { name: 'fk_imperfeccion_ic', field: 'id_imperfecciones' },
  indexes: [{ name: 'idx_carr_imperfeccion' }]
});

Imperfeccion.belongsToMany(Carroceria, {
  through: {
    model: ImperfeccionCarroceria,
    unique: true
  },
  foreignKey: { name: 'fk_imper_ic', field: 'id_imperfecciones' },
  otherKey: { name: 'fk_carroceria_ic', field: 'id_carrocerias' },
  indexes: [{ name: 'idx_imperfeccion_carroceria' }]
});

const conectarSQL = async () => {
  try {
    await databaseSQL.authenticate();
    console.log('Conectado a la base de datos SQL.');

    await databaseSQL.sync();
    console.log('Tablas sincronizadas.');
  } catch (error) {
    console.error('Error al conectar a la base de datos SQL:', error);
  }
};

module.exports = conectarSQL;
