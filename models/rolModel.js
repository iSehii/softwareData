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
    }
}, {
    tableName: 'roles',
    timestamps: false
});

module.exports = { Rol };
