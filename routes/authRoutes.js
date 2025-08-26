const { Router } = require('express');
const { login, register, verifyToken, refreshToken, verificarCodigoActivacion } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verificar', verifyToken);
router.post('/refresh', refreshToken);
router.post('/verificar-codigo', verificarCodigoActivacion);

module.exports = router;
