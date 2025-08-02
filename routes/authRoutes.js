const { Router } = require('express');
const { login, register, verifyToken, refreshToken } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verificar', verifyToken);
router.post('/refresh', refreshToken);

module.exports = router;
