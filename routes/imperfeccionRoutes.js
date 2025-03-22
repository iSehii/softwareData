const { Router } = require('express');
const { obtenerImperfeccion, obtenerImperfecciones, eliminarImperfeccion, actualizarImperfeccion, crearImperfeccion } = require('../controllers/imperfeccionController');

const router = Router();

router.get('/', obtenerImperfecciones);
router.get('/:id', obtenerImperfeccion);
router.post('/', crearImperfeccion);
router.put('/:id', actualizarImperfeccion);
router.delete('/:id', eliminarImperfeccion);

module.exports = router;
