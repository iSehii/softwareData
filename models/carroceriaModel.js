const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
    const Carroceria = databaseMySQL.define('Carroceria', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        no_parte: DataTypes.INTEGER,
        color: DataTypes.STRING(45),
        panel: DataTypes.STRING(45),
        descripcion: DataTypes.STRING(45),
        lote: DataTypes.STRING(45),
        estado: DataTypes.INTEGER,
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'carrocerias',
        timestamps: true
    });

module.exports = { Carroceria };
