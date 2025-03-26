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
            model: 'Prioridades',
            key: 'id'
        }
    },
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
        id_usuario: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Usuarios',
                key: 'id'
            }
        }
}, {
    tableName: 'reportes',
    timestamps: true
});

module.exports = { Reporte };
