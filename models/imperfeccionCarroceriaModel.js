const sequelize = require('../config/SQL');
module.exports = (sequelize, DataTypes) => {
    const ImperfeccionCarroceria = sequelize.define('ImperfeccionCarroceria', {
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
                name: 'imp_car_idx',  
                unique: true,
                fields: ['id_imperfecciones', 'id_carrocerias']
            }
        ]
    });

    return ImperfeccionCarroceria;
};
