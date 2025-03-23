const express = require('express');
const router = express.Router();
require('dotenv').config();
router.use(express.json());
const { Index } = require('../controllers/indexController');
const rolRoutes = require('./rolRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const carroceriaRoutes = require('./carroceriaRoutes');
const imperfeccionRoutes = require('./imperfeccionRoutes');
const reporteRoutes = require('./reporteRoutes');

// router.use('/', Index);
router.use('/roles', rolRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/carrocerias', carroceriaRoutes);
router.use('/imperfecciones', imperfeccionRoutes);
router.use('/reportes', reporteRoutes);
module.exports = router;