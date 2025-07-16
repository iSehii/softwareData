const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const Imperfeccion = databaseMySQL.define('Imperfeccion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    coordenadas: DataTypes.TEXT,
    id_severidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'severidades',
            key: 'id'
        }
    },
    id_imagen_procesada: {
        type: DataTypes.STRING,
        allowNull: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    }
}, {
    tableName: 'imperfecciones',
    timestamps: true
});

module.exports = { Imperfeccion }; 
