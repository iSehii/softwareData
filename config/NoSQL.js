const mongoose = require('mongoose');
require('dotenv').config();
const conectarNoSQL = async () => {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log('Conectado a base de datos NoSQL');
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
    }
};

module.exports = conectarNoSQL;
