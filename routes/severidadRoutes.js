const { Router } = require('express');
const { obtenerSeveridad, obtenerSeveridades, eliminarSeveridad, actualizarSeveridad, crearSeveridad } = require('../controllers/severidadController');

const router = Router();

router.get('/', obtenerSeveridades);
router.get('/:id', obtenerSeveridad);
router.post('/', crearSeveridad);
router.put('/:id', actualizarSeveridad);
router.delete('/:id', eliminarSeveridad);

module.exports = router;
