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
app.use('/', require('./routes/index'))
app.use(morgan('dev'));
console.log(expressListEndpoints(app));

app.use(bodyParser.json());
app.use(express.json());
conectarNoSQL();
conectarMySQL();

app.listen(port, () => {
    console.log(`Ejecutando en: http://localhost:${port}`);
});
