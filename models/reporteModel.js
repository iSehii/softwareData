const sequelize = require('../config/SQL');
module.exports = (sequelize, DataTypes) => {
    const Reporte = sequelize.define('Reporte', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        prioridad: DataTypes.INTEGER,
        descripcion: DataTypes.STRING(100),
        id_imperfecciones: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Imperfecciones',
                key: 'id'
            }
        },
        id_carrocerias: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Carrocerias',
                key: 'id'
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'reportes',
        timestamps: true
    });

    return Reporte;
};
