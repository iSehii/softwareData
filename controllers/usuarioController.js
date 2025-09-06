const { Usuario } = require('../models/usuarioModel');
const { Rol } = require('../models/rolModel');
const { verificarUsuarioPorToken } = require('./authController');
const { sendEmail } = require('./correosController');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

exports.obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll();
        if (!usuarios) {
            return res.status(404).json({ message: 'No hay usuarios registrados' });
        }
        return res.json(usuarios);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        return res.json(usuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerUsuarioPorCorreo = async (req, res) => {
    try {
        const { correo } = req.params;
        const usuario = await Usuario.findOne({ where: { correo } });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        return res.json(usuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearUsuario = async (req, res) => {
    try {
        const { username, nombre, correo, clave, id_rol } = req.body;
        
        // Validaciones básicas
        if (!username || !nombre || !correo || !clave || !id_rol) {
            return res.status(400).json({ 
                error: 'Todos los campos son requeridos: username, nombre, correo, clave, id_rol' 
            });
        }

        // Verificar que el rol existe
        const rolExiste = await Rol.findByPk(id_rol);
        if (!rolExiste) {
            return res.status(400).json({ error: 'El rol especificado no existe' });
        }

        // Verificar que el username no esté duplicado
        const usuarioExistente = await Usuario.findOne({ where: { username } });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }

        // Verificar que el correo no esté duplicado
        const correoExistente = await Usuario.findOne({ where: { correo } });
        if (correoExistente) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(clave, 10);
        
        const nuevoUsuario = await Usuario.create({
            username: username.trim(),
            nombre: nombre.trim(),
            correo: correo.trim().toLowerCase(),
            clave: hashedPassword,
            id_rol,
            verificado: false,
            fecha_verificacion: null,
            estado: true
        });

        // Obtener información del admin que crea el usuario (opcional)
        let adminInfo = { nombre: 'Administrador' };
        try {
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                const token = req.headers.authorization.substring(7);
                if (token && token !== 'undefined' && token !== 'null') {
                    const adminUser = await verificarUsuarioPorToken(token);
                    if (adminUser && adminUser.nombre) {
                        adminInfo = { nombre: adminUser.nombre };
                    }
                }
            } else if (req.headers.authorization) {
                const adminUser = await verificarUsuarioPorToken(req.headers.authorization);
                if (adminUser && adminUser.nombre) {
                    adminInfo = { nombre: adminUser.nombre };
                }
            }
        } catch (adminError) {
            console.warn('No se pudo obtener info del admin:', adminError);
        }

        // Generar token de activación (sin permisos por ahora)
        const tokenActivacion = jwt.sign(
            { 
                id: nuevoUsuario.id, 
                username: nuevoUsuario.username, 
                correo: nuevoUsuario.correo, 
                id_rol: nuevoUsuario.id_rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );

        const enlaceActivacion = `https://lumet-inspection.com/registro/verificar?token=${tokenActivacion}`;
        
        // Intentar generar QR simple (sin logo por ahora)
        let qrCodeBuffer;
        try {
            const QRCode = require('qrcode');
            qrCodeBuffer = await QRCode.toBuffer(enlaceActivacion, {
                width: 512,
                height: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            console.log('QR generado exitosamente, tamaño:', qrCodeBuffer.length, 'bytes');
        } catch (qrError) {
            console.warn('Error generando QR:', qrError);
            qrCodeBuffer = null;
        }

        const emailHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
        }
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
            position: relative;
        }
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        }
        .header {
            text-align: center;
            padding: 40px 30px 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            position: relative;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
        }
        .header img {
            max-width: 180px;
            height: auto;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }
        .content {
            padding: 50px 40px;
            text-align: center;
            background: #ffffff;
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
            line-height: 1.2;
        }
        .content p {
            font-size: 16px;
            color: #4a5568;
            line-height: 1.7;
            margin: 0 0 20px 0;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
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
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
        }
        .qr-section {
            margin-top: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 20px;
            border: 2px dashed #cbd5e0;
        }
        .qr-section p {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 18px;
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
        .footer .copyright {
            font-weight: 600;
            color: #e2e8f0;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
            margin: 30px 0;
        }
        @media (max-width: 600px) {
            body {
                padding: 20px 10px;
            }
            .content {
                padding: 30px 25px;
            }
            .content h1 {
                font-size: 26px;
            }
            .info-card {
                padding: 20px;
            }
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .button {
                padding: 14px 30px;
                font-size: 15px;
            }
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
                <div class="welcome-badge">Cuenta Creada</div>
                <h1>¡Bienvenido, ${nombre}!</h1>
                <p>
                    El administrador <strong>${adminInfo.nombre}</strong> ha creado tu cuenta exitosamente.
                    Para comenzar a usar la plataforma, necesitas activar tu cuenta.
                </p>
                
                <div class="info-card">
                    <div class="info-row">
                        <span class="info-label">Usuario</span>
                        <span class="info-value">${username}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Rol Asignado</span>
                        <span class="info-value">${rolExiste.nombre}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Creado por</span>
                        <span class="info-value">${adminInfo.nombre}</span>
                    </div>
                </div>

                <div class="divider"></div>
                
                <p>
                    Puedes activar tu cuenta haciendo clic en el siguiente botón o escaneando el código QR a continuación.
                </p>
                
                <a style="text-decoration: none; color: white;" href="${enlaceActivacion}" class="button">Activar mi cuenta</a>
                
                ${
                  qrCodeBuffer
                    ? `
                <div class="qr-section">
                    <p>📱 Escanear para activar</p>
                    <img src="cid:qrcode" alt="Código QR de activación">
                </div>
                `
                    : ""
                }
            </div>
            <div class="footer">
                <p class="copyright">&copy; ${new Date().getFullYear()} Lumet Inspection. Todos los derechos reservados.</p>
                <p>Si tienes problemas para activar tu cuenta, contacta a nuestro equipo de soporte.</p>
            </div>
        </div>
    </div>
</body>
</html>
`

        // Enviar email (con o sin QR)
        try {
            const emailData = {
                filename: 'qrcode.png',
                content: qrCodeBuffer ? qrCodeBuffer.toString('base64') : '',
                encoding: 'base64',
                cid: 'qrcode'
            };
            
            console.log('Enviando email a:', correo);
            console.log('QR incluido:', !!qrCodeBuffer);
            if (qrCodeBuffer) {
                console.log('Tamaño del QR en base64:', emailData.content.length, 'caracteres');
            }
            
            await sendEmail(
                correo,
                `¡Bienvenido! ${nombre} - Activa tu cuenta.`,
                emailHTML,
                qrCodeBuffer ? [emailData] : []
            );
            
            console.log('Email enviado exitosamente');
        } catch (emailError) {
            console.warn('Error enviando email:', emailError);
            // Continuar aunque falle el email
        }

        return res.status(201).json({
            message: 'Usuario creado exitosamente',
            usuario: {
                id: nuevoUsuario.id,
                username: nuevoUsuario.username,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                id_rol: nuevoUsuario.id_rol,
                verificado: nuevoUsuario.verificado,
                estado: nuevoUsuario.estado
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, nombre, correo, clave, id_rol, id_usuario } = req.body;
        const hashedPassword = await bcrypt.hash(clave, 10);

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await usuario.update({
            username,
            nombre,
            correo,
            clave: hashedPassword,
            id_rol,
            id_usuario
        });

        return res.json(usuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await usuario.destroy();
        return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
