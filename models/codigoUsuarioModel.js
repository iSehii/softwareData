const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const CodigoUsuario = databaseMySQL.define('CodigoUsuario', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    codigo: {
        type: DataTypes.STRING(6),
        allowNull: false,
        unique: true,
        comment: 'Código de 6 dígitos para activación'
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    tipo: {
        type: DataTypes.ENUM('ACTIVACION', 'RECUPERACION', 'VERIFICACION'),
        allowNull: false,
        defaultValue: 'ACTIVACION'
    },
    usado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    fecha_expiracion: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Fecha de expiración del código (24 horas por defecto)'
    },
    fecha_uso: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha cuando se usó el código'
    },
    intentos_usados: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de intentos de uso del código'
    },
    max_intentos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Máximo número de intentos permitidos'
    },
    ip_creacion: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP desde donde se creó el código'
    },
    ip_uso: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP desde donde se usó el código'
    }
}, {
    tableName: 'codigos_usuarios',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['codigo']
        },
        {
            fields: ['usuario_id']
        },
        {
            fields: ['tipo']
        },
        {
            fields: ['fecha_expiracion']
        },
        {
            fields: ['usado']
        }
    ]
});

module.exports = { CodigoUsuario };
