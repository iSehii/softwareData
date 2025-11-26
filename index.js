const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const conectarNoSQL = require('./config/NoSQL');
const { conectarMySQL } = require('./config/SQL');
const bodyParser = require('body-parser'); 
const routes = require('./routes');
const app = express();
const port = process.env.PORT || 3006;
require('./models/relaciones');
require('dotenv').config();

const expressListEndpoints = require('express-list-endpoints');

app.use(cors());
app.use(morgan('dev'));
// Aumentar límite de JSON para permitir payloads más grandes (250MB)
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

app.use('/', require('./routes/index'));


conectarNoSQL();
conectarMySQL();

app.listen(port, () => {
    console.log(expressListEndpoints(app)); 
    console.log(`Ejecutando en: http://localhost:${port}`);
});