const mongoose = require('mongoose');
require('dotenv').config();
const conectarNoSQL = async () => {
    try {
        await mongoose.connect(process.env.DB_URI, {
            dbName: 'lumet'
        });
        console.log('Conectado a base de datos NoSQL: lumet');
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
    }
};

module.exports = conectarNoSQL;
