const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
const Reporte = databaseMySQL.define('Reporte', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    prioridad: DataTypes.INTEGER,
    descripcion: DataTypes.STRING,
    id_imperfecciones: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Imperfecciones',
            key: 'id'
        }
    },
    id_carrocerias: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Carrocerias',
            key: 'id'
        }
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'reportes',
    timestamps: true
});

module.exports = { Reporte };
