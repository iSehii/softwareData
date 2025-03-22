const sequelize = require('../config/SQL');
module.exports = (sequelize, DataTypes) => {
    const Carroceria = sequelize.define('Carroceria', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        no_parte: DataTypes.INTEGER,
        color: DataTypes.STRING(45),
        panel: DataTypes.STRING(45),
        descripcion: DataTypes.STRING(45),
        lote: DataTypes.STRING(45),
        estado: DataTypes.INTEGER,
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'carrocerias',
        timestamps: true
    });

    return Carroceria;
};
