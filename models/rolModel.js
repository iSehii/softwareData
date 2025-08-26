const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
const Rol = databaseMySQL.define('Rol', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    codigo: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'roles',
    timestamps: true
});

module.exports = { Rol };
