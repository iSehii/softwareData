const { Router } = require('express');
const { obtenerPrioridad, obtenerPrioridades, eliminarPrioridad, actualizarPrioridad, crearPrioridad } = require('../controllers/prioridadController');

const router = Router();

router.get('/', obtenerPrioridades);
router.get('/:id', obtenerPrioridad);
router.post('/', crearPrioridad);
router.put('/:id', actualizarPrioridad);
router.delete('/:id', eliminarPrioridad);

module.exports = router;
