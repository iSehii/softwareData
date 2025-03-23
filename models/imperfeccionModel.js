const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const Imperfeccion = databaseMySQL.define('Imperfeccion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    coordenadas: DataTypes.STRING(45),
    severidad: DataTypes.INTEGER,
        id_usuario: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Usuarios',
                key: 'id'
            }
        }
}, {
    tableName: 'imperfecciones',
    timestamps: true
});

module.exports = { Imperfeccion }; 
