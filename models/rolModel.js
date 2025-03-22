const sequelize = require('../config/SQL');
module.exports = (sequelize, DataTypes) => {
    const Rol = sequelize.define('Rol', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        }
    }, {
        tableName: 'roles',
        timestamps: false
    });

    return Rol;
};
