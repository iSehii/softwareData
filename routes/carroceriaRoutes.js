const { Router } = require('express');
const { obtenerCarroceria, obtenerCarrocerias, eliminarCarroceria, actualizarCarroceria, crearCarroceria, obtenerFolio } = require('../controllers/carroceriaController');

const router = Router();

router.get('/', obtenerCarrocerias);
router.get('/folio', obtenerFolio);
router.get('/:id', obtenerCarroceria);
router.post('/', crearCarroceria);
router.put('/:id', actualizarCarroceria);
router.delete('/:id', eliminarCarroceria);

module.exports = router;
