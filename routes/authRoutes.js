const { Router } = require('express');
const { login, register, verifyToken, refreshToken, verificarCodigoActivacion, reenviarCodigoActivacion, confirmarAcceso } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verificar', verifyToken);
router.post('/refresh', refreshToken);
router.post('/verificar-codigo', verificarCodigoActivacion);
router.post('/reenviar-codigo', reenviarCodigoActivacion);
router.post('/access-code', confirmarAcceso);
//TEST SONAR CLOUD
module.exports = router;
