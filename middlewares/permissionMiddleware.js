// Middleware para verificar permisos específicos
function checkPermission(module, action) {
    return (req, res, next) => {
        try {
            const userPermissions = req.user?.permissions || [];
            
            // Verificar si el usuario tiene el permiso requerido
            const hasPermission = userPermissions.some(perm => 
                perm.module === module && perm.action === action
            );
            
            if (!hasPermission) {
                console.log(`❌ [PERMISSION] Usuario ${req.user?.id} no tiene permiso ${module}:${action}`);
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    message: `No tienes permiso para realizar la acción ${action} en el módulo ${module}`,
                    required: { module, action },
                    userPermissions: userPermissions
                });
            }
            
            console.log(`✅ [PERMISSION] Usuario ${req.user?.id} tiene permiso ${module}:${action}`);
            next();
        } catch (error) {
            console.error('❌ [PERMISSION] Error al verificar permisos:', error);
            res.status(500).json({ error: 'Error interno al verificar permisos' });
        }
    };
}

// Middleware para verificar múltiples permisos (OR lógico)
function checkAnyPermission(permissions) {
    return (req, res, next) => {
        try {
            const userPermissions = req.user?.permissions || [];
            
            // Verificar si el usuario tiene al menos uno de los permisos requeridos
            const hasAnyPermission = permissions.some(({ module, action }) =>
                userPermissions.some(perm => perm.module === module && perm.action === action)
            );
            
            if (!hasAnyPermission) {
                console.log(`❌ [PERMISSION] Usuario ${req.user?.id} no tiene ninguno de los permisos requeridos:`, permissions);
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    message: 'No tienes permisos suficientes para realizar esta acción',
                    required: permissions,
                    userPermissions: userPermissions
                });
            }
            
            console.log(`✅ [PERMISSION] Usuario ${req.user?.id} tiene al menos uno de los permisos requeridos`);
            next();
        } catch (error) {
            console.error('❌ [PERMISSION] Error al verificar permisos:', error);
            res.status(500).json({ error: 'Error interno al verificar permisos' });
        }
    };
}

// Middleware para verificar múltiples permisos (AND lógico)
function checkAllPermissions(permissions) {
    return (req, res, next) => {
        try {
            const userPermissions = req.user?.permissions || [];
            
            // Verificar si el usuario tiene todos los permisos requeridos
            const hasAllPermissions = permissions.every(({ module, action }) =>
                userPermissions.some(perm => perm.module === module && perm.action === action)
            );
            
            if (!hasAllPermissions) {
                console.log(`❌ [PERMISSION] Usuario ${req.user?.id} no tiene todos los permisos requeridos:`, permissions);
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    message: 'No tienes todos los permisos necesarios para realizar esta acción',
                    required: permissions,
                    userPermissions: userPermissions
                });
            }
            
            console.log(`✅ [PERMISSION] Usuario ${req.user?.id} tiene todos los permisos requeridos`);
            next();
        } catch (error) {
            console.error('❌ [PERMISSION] Error al verificar permisos:', error);
            res.status(500).json({ error: 'Error interno al verificar permisos' });
        }
    };
}

// Constantes para módulos y acciones comunes
const MODULES = {
    USUARIOS: 'USUARIOS',
    CARROCERIAS: 'CARROCERIAS',
    REPORTES: 'REPORTES',
    ROLES: 'ROLES',
    PERMISOS: 'PERMISOS',
    FEEDBACK: 'FEEDBACK'
};

const ACTIONS = {
    VIEW: 'VIEW',
    CREATE: 'CREATE',
    EDIT: 'EDIT',
    DELETE: 'DELETE'
};

module.exports = {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    MODULES,
    ACTIONS
};
