const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
const Reporte = databaseMySQL.define('Reporte', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    id_prioridad: {
        type: DataTypes.INTEGER,
        references: {
            model: 'prioridades',
            key: 'id'
        }
    },
    descripcion: DataTypes.STRING,
    id_imperfecciones: {
        type: DataTypes.INTEGER,
        references: {
            model: 'imperfecciones',
            key: 'id'
        }
    },
    id_carrocerias: {
        type: DataTypes.INTEGER,
        references: {
            model: 'carrocerias',
            key: 'id'
        }
    },
        id_usuario: {
            type: DataTypes.INTEGER,
            references: {
                model: 'usuarios',
                key: 'id'
            }
        }
}, {
    tableName: 'reportes',
    timestamps: true
});

module.exports = { Reporte };
