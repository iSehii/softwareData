const jwt = require("jsonwebtoken");
const { obtenerPermisosPorRol } = require('../controllers/authController');

exports.verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Token requerido',
                message: 'Debe proporcionar un token de autenticación válido'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                console.log('❌ [AUTH] Token inválido:', err.message);
                return res.status(401).json({ 
                    error: 'Token inválido',
                    message: 'El token proporcionado no es válido o ha expirado'
                });
            }

            // Obtener permisos del rol del usuario (igual que en login)
            const permisos = await obtenerPermisosPorRol(decoded.id_rol);

            // Incluir información del usuario en req.user
            req.user = {
                id: decoded.id,
                username: decoded.username,
                correo: decoded.correo,
                id_rol: decoded.id_rol,
                permissions: permisos
            };

            console.log(`✅ [AUTH] Usuario autenticado: ${req.user.username} (ID: ${req.user.id})`);
            
            next();
        });
    } catch (error) {
        console.error('❌ [AUTH] Error en verificación de token:', error);
        res.status(500).json({ 
            error: 'Error interno',
            message: 'Error interno del servidor durante la verificación del token'
        });
    }
};