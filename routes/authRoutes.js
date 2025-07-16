const { Router } = require('express');
const { login, register, verifyToken } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verificar', verifyToken);

module.exports = router;
