const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
    const Prioridad = databaseMySQL.define('Prioridad', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userPrioridadname: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: false
        }
    }, {
        tableName: 'prioridades',
        timestamps: true
    });

module.exports = { Prioridad };
