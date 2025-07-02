const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
    const Prioridad = databaseMySQL.define('Prioridad', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        id_usuario: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: false,
            references: {
                model: 'usuarios',
                key: 'id'
            }
        }
    }, {
        tableName: 'prioridades',
        timestamps: true
    });

module.exports = { Prioridad };
