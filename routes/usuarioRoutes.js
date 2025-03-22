const { Router } = require('express');
const { obtenerUsuario, obtenerUsuarios, eliminarUsuario, actualizarUsuario, crearUsuario } = require('../controllers/usuarioController');

const router = Router();

router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;
