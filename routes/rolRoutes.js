const { Router } = require('express');
const { obtenerRol, obtenerRoles, eliminarRol, actualizarRol, crearRol } = require('../controllers/rolController');

const router = Router();

router.get('/', obtenerRoles);
router.get('/:id', obtenerRol);
router.post('/', crearRol);
router.put('/:id', actualizarRol);
router.delete('/:id', eliminarRol);

module.exports = router;
