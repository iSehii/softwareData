const { Router } = require('express');
const { obtenerReporte, obtenerReportes, eliminarReporte, actualizarReporte, crearReporte } = require('../controllers/reporteController');

const router = Router();

router.get('/', obtenerReportes);
router.get('/:id', obtenerReporte);
router.post('/', crearReporte);
router.put('/:id', actualizarReporte);
router.delete('/:id', eliminarReporte);

module.exports = router;
