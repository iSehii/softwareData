const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const Imperfeccion = databaseMySQL.define('Imperfeccion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    coordenadas: DataTypes.STRING(45),
    id_severidad: {
        type: DataTypes.INTEGER,
        references: {
            model: 'severidades',
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
    tableName: 'imperfecciones',
    timestamps: true
});

module.exports = { Imperfeccion }; 
