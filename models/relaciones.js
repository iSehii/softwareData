const {Rol} = require('../models/rolModel');
const {Usuario} = require('../models/usuarioModel');
const { Prioridad } = require('../models/prioridadModel');
const { Severidad } = require('../models/severidadModel');
const {Imperfeccion} = require('../models/imperfeccionModel');
const {Carroceria} = require('../models/carroceriaModel');
const {ImperfeccionCarroceria} = require('../models/imperfeccionCarroceriaModel');
const {Reporte} = require('../models/reporteModel');


Usuario.belongsTo(Rol, {
  foreignKey: { name: 'id_rol', field: 'id_rol' }
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
    unique: false
  },
  foreignKey: { name: 'fk_carr_ic', field: 'id_carrocerias' },
  otherKey: { name: 'fk_imperfeccion_ic', field: 'id_imperfecciones' },
  indexes: [{ name: 'idx_carr_imperfeccion' }]
});

Imperfeccion.belongsToMany(Carroceria, {
  through: {
    model: ImperfeccionCarroceria,
    unique: false
  },
  foreignKey: { name: 'fk_imper_ic', field: 'id_imperfecciones' },
  otherKey: { name: 'fk_carroceria_ic', field: 'id_carrocerias' },
  indexes: [{ name: 'idx_imperfeccion_carroceria' }]
});

Carroceria.belongsTo(Usuario, {
  foreignKey: { name: 'id_usuario', field: 'id_usuario' }
});

Imperfeccion.belongsTo(Usuario, {
  foreignKey: { name: 'id_usuario', field: 'id_usuario' }
});

Imperfeccion.belongsTo(Severidad, {
  foreignKey: { name: 'id_severidad', field: 'id_severidad' }
});

Reporte.belongsTo(Usuario, {
  foreignKey: { name: 'id_usuario', field: 'id_usuario' }
});

Reporte.belongsTo(Prioridad, {
  foreignKey: { name: 'id_prioridad', field: 'id_prioridad' }
});

module.exports = {
  Rol,
  Usuario,
  Imperfeccion,
  Carroceria,
  Prioridad,
  Severidad,
  ImperfeccionCarroceria,
  Reporte,
  };
  