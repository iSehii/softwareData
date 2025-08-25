const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const Permission = databaseMySQL.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Módulo del sistema: Usuarios, CARROCERIAS, REPORTES, etc.'
    },
    action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Acción: VIEW, CREATE, EDIT, DELETE'
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'permissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['module', 'action']
        }
    ]
});

module.exports = { Permission };
