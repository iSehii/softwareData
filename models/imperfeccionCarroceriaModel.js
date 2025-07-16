const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
const ImperfeccionCarroceria = databaseMySQL.define('ImperfeccionCarroceria', {
    id_imperfecciones: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'Imperfecciones',
            key: 'id'
        }
    },
    id_carrocerias: {
        type: DataTypes.INTEGER,
        primaryKey: true, 
        references: {
            model: 'Carrocerias',
            key: 'id'
        }
    }
}, {
    tableName: 'imperfecciones_carrocerias',
    timestamps: false,
    indexes: [
        {
            name: 'uniq_ic_ic',
            unique: true,
            fields: ['id_imperfecciones', 'id_carrocerias']
        }
    ]
});

module.exports = { ImperfeccionCarroceria };