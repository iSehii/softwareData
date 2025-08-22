const { DataTypes } = require('sequelize');
const { databaseMySQL } = require('../config/SQL');

const RolePermission = databaseMySQL.define('RolePermission', {
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'roles',
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
    }
}, {
    tableName: 'role_permissions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['role_id', 'permission_id']
        }
    ]
});

module.exports = { RolePermission };
