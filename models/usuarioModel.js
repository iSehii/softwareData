const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');
    const Usuario = databaseMySQL.define('Usuario', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        clave: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        id_rol: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Roles',
                key: 'id'
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'usuarios',
        timestamps: true
    });

    module.exports = { Usuario };
