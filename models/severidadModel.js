const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
    const Severidad = databaseMySQL.define('Severidad', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        descripcion: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: false
        }
    }, {
        tableName: 'severidades',
        timestamps: true
    });

    module.exports = { Severidad };
