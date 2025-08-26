const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Usuario } = require('../models/usuarioModel');
const { Permission } = require('../models/permissionModel');
const { RolePermission } = require('../models/rolePermissionModel');
const { UserPermission } = require('../models/userPermissionModel');
const { CodigoUsuario } = require('../models/codigoUsuarioModel');
const { sendEmail } = require('./correosController');
const { Rol } = require('../models/rolModel');

require("dotenv").config();

// Función para generar código único de 6 dígitos
async function generarCodigoUnico() {
    let intentos = 0;
    while (intentos < 100) {
        // Generar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Verificar que no exista en la base de datos
        const codigoExistente = await CodigoUsuario.findOne({ 
            where: { codigo: codigo } 
        });
        
        if (!codigoExistente) {
            return codigo;
        }
        intentos++;
    }
    throw new Error('No se pudo generar un código único después de 100 intentos');
}

// Función auxiliar para obtener permisos del rol (para login)
async function obtenerPermisosPorRol(roleId) {
    try {
        if (!roleId) {
            console.log('[AUTH] Usuario sin rol asignado');
            return [];
        }
        
        // Usar la consulta que funciona directamente
        const rolePermissions = await RolePermission.findAll({
            where: { role_id: roleId },
            include: [{
                model: Permission,
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        const permisos = rolePermissions.map(rp => ({
            module: rp.Permission.module,
            action: rp.Permission.action,
            descripcion: rp.Permission.descripcion
        }));
        
        console.log(`[AUTH] Permisos del rol ${roleId}: ${permisos.length} permisos obtenidos`);
        
        return permisos;
    } catch (error) {
        console.error('[AUTH] Error al obtener permisos del rol:', error);
        return [];
    }
}

// Función auxiliar para obtener permisos efectivos de un usuario (para consultas específicas)
async function obtenerPermisosEfectivosUsuario(userId, roleId) {
    try {
        // Obtener permisos del rol
        const permisosRol = await Permission.findAll({
            include: [{
                model: RolePermission,
                where: { role_id: roleId },
                attributes: []
            }],
            attributes: ['id', 'module', 'action', 'descripcion']
        });
        
        // Obtener overrides del usuario
        const overrides = await UserPermission.findAll({
            where: { usuario_id: userId },
            include: [{
                model: Permission,
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        // Procesar permisos efectivos
        const permisosEfectivos = [];
        
        // Agregar permisos del rol
        permisosRol.forEach(permiso => {
            permisosEfectivos.push({
                module: permiso.module,
                action: permiso.action,
                descripcion: permiso.descripcion
            });
        });
        
        // Aplicar overrides
        overrides.forEach(override => {
            const permiso = override.Permission;
            const index = permisosEfectivos.findIndex(p => 
                p.module === permiso.module && p.action === permiso.action
            );
            
            if (override.allow) {
                // Permitir explícitamente
                if (index === -1) {
                    permisosEfectivos.push({
                        module: permiso.module,
                        action: permiso.action,
                        descripcion: permiso.descripcion
                    });
                }
            } else {
                // Denegar explícitamente
                if (index !== -1) {
                    permisosEfectivos.splice(index, 1);
                }
            }
        });
        
        return permisosEfectivos;
    } catch (error) {
        console.error('Error al obtener permisos efectivos del usuario:', error);
        return [];
    }
}

exports.register = async (req, res) => {
    try {
        const { username, nombre, correo, clave, id_rol, codigo } = req.body;

        if (!username || !nombre || !correo || !clave || !id_rol) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Verificar que el username no esté duplicado
        const usuarioExistente = await Usuario.findOne({ where: { username } });
        if (usuarioExistente) {
            return res.status(400).json({ message: "El nombre de usuario ya existe" });
        }

        // Verificar que el correo no esté duplicado
        const correoExistente = await Usuario.findOne({ where: { correo } });
        if (correoExistente) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        const claveEncriptada = await bcrypt.hash(clave, 10);
        const rolExiste = await Rol.findByPk(id_rol);
        if (!rolExiste) {
            return res.status(400).json({ message: "El rol no existe" });
        }
        if (rolExiste.codigo != codigo) {
            return res.status(400).json({ message: "El código es inválido" });
        }
        // Crear usuario con estado pendiente
        const user = await Usuario.create({ 
            username: username.trim(),
            nombre: nombre.trim(),
            correo: correo.trim().toLowerCase(),
            clave: claveEncriptada, 
            id_rol,
            verificado: false,
            fecha_verificacion: null,
            estado: true
        });

        // Generar código de activación
        const codigoActivacion = await generarCodigoUnico();
        const nuevoCodigo = await CodigoUsuario.create({
            codigo: codigoActivacion,
            usuario_id: user.id,
            tipo: 'ACTIVACION',
            fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            ip_creacion: req.ip || req.connection.remoteAddress
        });

        // Generar token de activación
        const tokenActivacion = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                correo: user.correo, 
                id_rol: user.id_rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        const enlaceActivacion = `https://lumet-inspection.com/registro/verificar?token=${tokenActivacion}`;

        // Generar QR para el código
        let qrCodeBuffer;
        try {
            const QRCode = require('qrcode');
            qrCodeBuffer = await QRCode.toBuffer(codigoActivacion, {
                width: 512,
                height: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            console.log('QR generado exitosamente para código de activación');
        } catch (qrError) {
            console.warn('Error generando QR para código:', qrError);
        }

        // Email de bienvenida con código de activación
        const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 40px 20px;
                }
                .email-wrapper {
                    width: 100%;
                    max-width: 650px;
                    margin: 0 auto;
                }
                .container {
                    background: #ffffff;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    text-align: center;
                    padding: 40px 30px 30px;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                }
                .header img {
                    max-width: 180px;
                    height: auto;
                }
                .content {
                    padding: 50px 40px;
                    text-align: center;
                }
                .welcome-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 8px 20px;
                    border-radius: 25px;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .content h1 {
                    font-size: 32px;
                    font-weight: 700;
                    color: #1a202c;
                    margin: 0 0 25px 0;
                }
                .content p {
                    font-size: 16px;
                    color: #4a5568;
                    line-height: 1.7;
                    margin: 0 0 20px 0;
                }
                .codigo-activacion {
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                    border: 2px dashed #667eea;
                    border-radius: 16px;
                    padding: 30px;
                    margin: 30px 0;
                    text-align: center;
                }
                .codigo-numero {
                    font-size: 48px;
                    font-weight: bold;
                    color: #667eea;
                    letter-spacing: 8px;
                    margin: 20px 0;
                    font-family: 'Courier New', monospace;
                }
                .info-card {
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: left;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 12px 0;
                    border-bottom: 1px solid #e2e8f0;
                }
                .info-row:last-child {
                    margin-bottom: 0;
                    border-bottom: none;
                }
                .info-label {
                    font-weight: 600;
                    color: #2d3748;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .info-value {
                    font-weight: 600;
                    color: #667eea;
                    font-size: 16px;
                }
                .button {
                    display: inline-block;
                    padding: 16px 40px;
                    margin: 35px 0 25px 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .qr-section {
                    margin-top: 40px;
                    padding: 30px;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-radius: 20px;
                    border: 2px dashed #cbd5e0;
                }
                .qr-code img {
                    width: 160px;
                    height: 160px;
                    border-radius: 16px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    border: 4px solid #ffffff;
                }
                .footer {
                    text-align: center;
                    padding: 40px 30px;
                    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
                    color: #a0aec0;
                }
                .footer p {
                    font-size: 14px;
                    margin: 8px 0;
                    line-height: 1.6;
                }
                .expiry-warning {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    color: #856404;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="container">
                    <div class="header">
                        <img src="https://lumet-inspection.com/assets/Logo-DZtMWJpU.png" alt="Logo de la Empresa">
                    </div>
                    <div class="content">
                        <div class="welcome-badge">Registro Exitoso</div>
                        <h1>¡Hola, ${nombre}!</h1>
                        <p>
                            Tu cuenta ha sido registrada exitosamente. Para comenzar a usar la plataforma, 
                            necesitas activar tu cuenta usando el código de activación que aparece a continuación.
                        </p>

                        <div class="codigo-activacion">
                            <p><strong>Código de Activación:</strong></p>
                            <div class="codigo-numero">${codigoActivacion}</div>
                            <p>Ingresa este código en la aplicación para activar tu cuenta</p>
                            <div class="expiry-warning">
                                ⏰ Este código expira en 24 horas
                            </div>
                        </div>
                        <div class="info-card">
                            <p><strong>Información del usuario:</strong></p>
                            <div class="info-row">
                                <span class="info-label">Usuario: <strong style="color: #667eea;">${(username).toLowerCase()}</strong></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Correo: <strong style="color: #667eea;">${(correo).toLowerCase()}</strong></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Rol: <strong style="color: #667eea;">${(rolExiste.nombre).toLowerCase()}</strong></span>
                            </div>
                        </div>
                        
                        <a href="https://lumet-inspection.com/registro/verificar?correo=${correo}" class="button" style="text-decoration: none; color: white;">Activar cuenta</a>
                        
                        ${qrCodeBuffer ? `
                        <div class="qr-section">
                            <p>Código QR de activación</p>
                            <div class="qr-code">
                                <img src="cid:qrcode" alt="Código QR de activación">
                            </div>
                            <p>Escanea este QR para obtener el código de activación</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Lumet Inspection. Todos los derechos reservados.</p>
                        <p>Si tienes problemas para activar tu cuenta, contacta a nuestro equipo de soporte.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Enviar email con código de activación
        try {
            const emailData = {
                filename: 'qrcode.png',
                content: qrCodeBuffer ? qrCodeBuffer.toString('base64') : '',
                encoding: 'base64',
                cid: 'qrcode'
            };
            
            await sendEmail(
                correo,
                `¡Hola! ${nombre} - Activa tu cuenta`,
                emailHTML,
                qrCodeBuffer ? [emailData] : []
            );
            
            console.log('Email de activación enviado exitosamente');
        } catch (emailError) {
            console.warn('Error enviando email de activación:', emailError);
        }

        res.json({ 
            message: "Usuario registrado exitosamente. Revisa tu correo para activar tu cuenta.", 
            user: {
                id: user.id,
                username: user.username,
                nombre: user.nombre,
                correo: user.correo,
                verificado: user.verificado,
                estado: user.estado
            },
            expira_en: nuevoCodigo.fecha_expiracion
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: "Error en el registro", error: error.message });
    }
};

// Función para verificar código de activación
exports.verificarCodigoActivacion = async (req, res) => {
    try {
        const { codigo, correo } = req.body;
        
        if (!codigo) {
            return res.status(400).json({ error: 'El código es requerido' });
        }
        if (!correo) {
            return res.status(400).json({ error: 'El correo es requerido' });
        }
        const usuario = await Usuario.findOne({ where: { correo } });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (usuario.verificado) {
            return res.status(400).json({ error: 'La cuenta ya está activada' });
        }
        // Buscar el código en la base de datos
        const codigoUsuario = await CodigoUsuario.findOne({
            where: { 
                codigo: codigo,
                tipo: 'ACTIVACION',
                usado: false
            },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'username', 'nombre', 'correo', 'verificado', 'estado']
            }]
        });

        if (!codigoUsuario) {
            return res.status(404).json({ error: 'Código de activación no válido' });
        }

        // Verificar si el código ha expirado
        if (new Date() > codigoUsuario.fecha_expiracion) {
            return res.status(400).json({ error: 'El código de activación ha expirado' });
        }

        // Si es el primer intento exitoso, marcar como usado y activar usuario
        if (codigoUsuario.usado == true) {
            return res.json({
                message: 'Código válido, pero ya se ha usado anteriormente',
            });
        } else {
            await codigoUsuario.update({ 
                usado: true,
                fecha_uso: new Date()
            });
            
            // Activar el usuario 
            await codigoUsuario.usuario.update({
                verificado: true,
                fecha_verificacion: new Date()
            });
            
            const emailHTML = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 40px 20px;
                    }
                    .email-wrapper {
                        width: 100%;
                        max-width: 650px;
                        margin: 0 auto;
                    }
                    .container {
                        background: #ffffff;
                        border-radius: 20px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .header {
                        text-align: center;
                        padding: 40px 30px 30px;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    }
                    .header img {
                        max-width: 180px;
                        height: auto;
                    }
                    .content {
                        padding: 50px 40px;
                        text-align: center;
                    }
                    .welcome-badge {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 8px 20px;
                        border-radius: 25px;
                        font-size: 14px;
                        font-weight: 500;
                        margin-bottom: 20px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .content h1 {
                        font-size: 32px;
                        font-weight: 700;
                        color: #1a202c;
                        margin: 0 0 25px 0;
                    }
                    .content p {
                        font-size: 16px;
                        color: #4a5568;
                        line-height: 1.7;
                        margin: 0 0 20px 0;
                    }
                    .codigo-activacion {
                        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                        border: 2px dashed #667eea;
                        border-radius: 16px;
                        padding: 30px;
                        margin: 30px 0;
                        text-align: center;
                    }
                    .codigo-numero {
                        font-size: 48px;
                        font-weight: bold;
                        color: #667eea;
                        letter-spacing: 8px;
                        margin: 20px 0;
                        font-family: 'Courier New', monospace;
                    }
                    .info-card {
                        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 25px;
                        margin: 30px 0;
                        text-align: left;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                        padding: 12px 0;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .info-row:last-child {
                        margin-bottom: 0;
                        border-bottom: none;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #2d3748;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .info-value {
                        font-weight: 600;
                        color: #667eea;
                        font-size: 16px;
                    }
                    .button {
                        display: inline-block;
                        padding: 16px 40px;
                        margin: 35px 0 25px 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 50px;
                        font-weight: 600;
                        font-size: 16px;
                        transition: all 0.3s ease;
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .qr-section {
                        margin-top: 40px;
                        padding: 30px;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        border-radius: 20px;
                        border: 2px dashed #cbd5e0;
                    }
                    .qr-code img {
                        width: 160px;
                        height: 160px;
                        border-radius: 16px;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                        border: 4px solid #ffffff;
                    }
                    .footer {
                        text-align: center;
                        padding: 40px 30px;
                        background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
                        color: #a0aec0;
                    }
                    .footer p {
                        font-size: 14px;
                        margin: 8px 0;
                        line-height: 1.6;
                    }
                    .expiry-warning {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 8px;
                        padding: 15px;
                        margin: 20px 0;
                        color: #856404;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="container">
                        <div class="header">
                            <img src="https://lumet-inspection.com/assets/Logo-DZtMWJpU.png" alt="Logo de la Empresa">
                        </div>
                        <div class="content">
                            <div class="welcome-badge">Registro Exitoso</div>
                            <h1>Bienvenido a Lumet Inspection, ${codigoUsuario.usuario.nombre}!</h1>
                            <p>
                                    Tu cuenta ha sido activada exitosamente. Para comenzar a usar la plataforma, 
                                    puedes iniciar sesión usando tu usuario y contraseña.
                            </p>
                            <div class="info-card">
                                <p><strong>Información del usuario:</strong></p>
                                <div class="info-row">
                                    <span class="info-label">Usuario: <strong style="color: #667eea;">${(username).toLowerCase()}</strong></span>
                                </div>
                            </div>
                            
                            <a href="https://lumet-inspection.com/login" class="button" style="text-decoration: none; color: white;">Iniciar sesión</a>
                            
                            ${qrCodeBuffer ? `
                            <div class="qr-section">
                                <p>Código QR de inicio de sesión</p>
                                <div class="qr-code">
                                    <img src="cid:qrcode" alt="Código QR de activación">
                                </div>
                                <p>Escanea este QR para ir al inicio de sesión</p>
                            </div>
                            ` : ''}
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Lumet Inspection. Todos los derechos reservados.</p>
                            <p>Si tienes problemas para activar tu cuenta, contacta a nuestro equipo de soporte.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `;
    
            // Enviar email con código de activación
            try {
                const emailData = {
                    filename: 'qrcode.png',
                    content: qrCodeBuffer ? qrCodeBuffer.toString('base64') : '',
                    encoding: 'base64',
                    cid: 'qrcode'
                };
                
                await sendEmail(
                    correo,
                    `¡Hola! ${nombre} - Cuenta verificada`,
                    emailHTML,
                    qrCodeBuffer ? [emailData] : []
                );
                
                console.log('Email de confirmación enviado exitosamente');
            } catch (emailError) {
                console.warn('Error enviando email de confirmación:', emailError);
            }


            return res.json({
                message: 'Cuenta activada exitosamente',
                usuario: {
                    id: codigoUsuario.usuario.id,
                    username: codigoUsuario.usuario.username,
                    nombre: codigoUsuario.usuario.nombre,
                    verificado: true
                }
            });
        } 

    } catch (error) {
        console.error('Error al verificar código de activación:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, clave } = req.body;

        if (!username || !clave) {
            return res.status(400).json({ message: "Usuario y contraseña son requeridos" });
        }

        const user = await Usuario.findOne({ where: { username } });

        if (!user) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        const isMatch = await bcrypt.compare(clave, user.clave);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }

        // Obtener permisos del rol del usuario (para login)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                correo: user.correo, 
                id_rol: user.id_rol,
                permissions: permisos
            },
            process.env.JWT_SECRET,
            { expiresIn: "100h" }
        );

        console.log(`[AUTH] Login exitoso para usuario ${user.username} con ${permisos.length} permisos del rol`);

        res.json({ 
            message: "Inicio de sesión exitoso", 
            token: token, 
            usuario: user,
            permissions: permisos
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: "Error en el login", error: error.message });
    }
};

exports.verificarUsuarioPorToken = async (token) => {
    try {
        if (!token) {
            return false;
        }

        if (token.startsWith('Bearer ')) {
            token = token.substring(7);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findByPk(decoded.id);

        if (!user) { 
            return false;
        }

        return user;
    } catch (error) {
        console.error('Error al verificar usuario por token:', error);
        return false;
    }
};

exports.verifyToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization; // Espera 'Bearer TOKEN'

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log(req.headers.authorization)
            return res.status(401).json({ message: "Token no proporcionado o formato incorrecto" });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Obtener permisos del rol (para verificación de token)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        res.json({ 
            message: "Token válido", 
            usuario: user,
            permissions: permisos
        });
    } catch (error) {
        console.log(error)
        console.log(req.headers)
        res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Obtener permisos del rol (para refresh de token)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        // Generate new token
        const newToken = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                id_rol: user.id_rol,
                permissions: permisos
            },
            process.env.JWT_SECRET,
            { expiresIn: "100h" }
        );

        res.json({ 
            message: "Token renovado exitosamente", 
            newToken: newToken,
            usuario: user,
            permissions: permisos
        });
    } catch (error) {
        console.log('Token refresh error:', error);
        res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};

// Exportar la función para uso en middleware
exports.obtenerPermisosPorRol = obtenerPermisosPorRol;