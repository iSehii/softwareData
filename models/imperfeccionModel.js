const sequelize = require('../config/SQL');
module.exports = (sequelize, DataTypes) => {
    const Imperfeccion = sequelize.define('Imperfeccion', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        coordenadas: DataTypes.STRING(45),
        severidad: DataTypes.INTEGER,
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'imperfecciones',
        timestamps: true
    });

    return Imperfeccion;
};
