const {Rol} = require('../models/rolModel');
const {Usuario} = require('../models/usuarioModel');
const { Prioridad } = require('../models/prioridadModel');
const { Severidad } = require('../models/severidadModel');
const {Imperfeccion} = require('../models/imperfeccionModel');
const {Carroceria} = require('../models/carroceriaModel');
const {ImperfeccionCarroceria} = require('../models/imperfeccionCarroceriaModel');
const {Reporte} = require('../models/reporteModel');
const { Permission } = require('../models/permissionModel');
const { RolePermission } = require('../models/rolePermissionModel');
const { UserPermission } = require('../models/userPermissionModel');
const { CodigoUsuario } = require('../models/codigoUsuarioModel');

// Relaciones existentes
Usuario.belongsTo(Rol, {
  foreignKey: { name: 'id_rol', field: 'id_rol' }
});

Reporte.belongsTo(Imperfeccion, {
  foreignKey: { name: 'fk_reporte_imperfeccion', field: 'id_imperfecciones' }
});
Reporte.belongsTo(Carroceria, {
  foreignKey: { name: 'fk_reporte_carroceria', field: 'id_carrocerias' }
});

// Relaciones inversas para facilitar consultas
Carroceria.hasMany(Reporte, {
  foreignKey: { name: 'fk_reporte_carroceria', field: 'id_carrocerias' },
  as: 'reportes'
});

Imperfeccion.hasMany(Reporte, {
  foreignKey: { name: 'fk_reporte_imperfeccion', field: 'id_imperfecciones' },
  as: 'reportes'
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

// Relaciones del sistema RBAC
Rol.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions'
});

Permission.belongsToMany(Rol, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles'
});

// Relación directa entre Usuario y Rol
Usuario.belongsTo(Rol, {
  foreignKey: 'id_rol',
  as: 'rol'
});

Rol.hasMany(Usuario, {
  foreignKey: 'id_rol',
  as: 'usuarios'
});

Usuario.belongsToMany(Permission, {
  through: UserPermission,
  foreignKey: 'usuario_id',
  otherKey: 'permission_id',
  as: 'userPermissions'
});

Permission.belongsToMany(Usuario, {
  through: UserPermission,
  foreignKey: 'permission_id',
  otherKey: 'usuario_id',
  as: 'users'
});

// Relaciones para códigos de activación
Usuario.hasMany(CodigoUsuario, {
  foreignKey: 'usuario_id',
  as: 'codigos'
});

CodigoUsuario.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// Relaciones directas para facilitar consultas
RolePermission.belongsTo(Rol, {
  foreignKey: 'role_id'
});

RolePermission.belongsTo(Permission, {
  foreignKey: 'permission_id'
});

UserPermission.belongsTo(Usuario, {
  foreignKey: 'usuario_id'
});

UserPermission.belongsTo(Permission, {
  foreignKey: 'permission_id'
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
  Permission,
  RolePermission,
  UserPermission,
  CodigoUsuario
};
  