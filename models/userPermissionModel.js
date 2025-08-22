const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const UserPermission = databaseMySQL.define('UserPermission', {
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    permission_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'permissions',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    allow: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'true = permitir, false = denegar (override del rol)'
    }
}, {
    tableName: 'user_permissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['usuario_id', 'permission_id']
        }
    ]
});

module.exports = { UserPermission };
