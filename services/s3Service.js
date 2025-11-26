const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Sube una imagen a S3
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {string} contentType - Tipo MIME de la imagen
 * @param {string} key - Clave única para la imagen en S3 (opcional, se genera si no se proporciona)
 * @returns {Promise<{key: string, url: string}>}
 */
const subirImagen = async (buffer, contentType, key = null) => {
    try {
        if (!key) {
            // Generar una clave única basada en timestamp y random
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            key = `imagenes/${timestamp}-${random}`;
        }

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Generar URL firmada (válida por 1 hora por defecto)
        const url = await getSignedUrl(s3Client, new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }), { expiresIn: 3600 });

        return { key, url };
    } catch (error) {
        console.error('Error al subir imagen a S3:', error);
        throw new Error(`Error al subir imagen a S3: ${error.message}`);
    }
};

/**
 * Obtiene una imagen de S3
 * @param {string} key - Clave de la imagen en S3
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
const obtenerImagen = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        const contentType = response.ContentType || 'image/jpeg';

        return { buffer, contentType };
    } catch (error) {
        console.error('Error al obtener imagen de S3:', error);
        throw new Error(`Error al obtener imagen de S3: ${error.message}`);
    }
};

/**
 * Obtiene una URL firmada para acceder a una imagen
 * @param {string} key - Clave de la imagen en S3
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 3600)
 * @returns {Promise<string>}
 */
const obtenerUrlFirmada = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Error al generar URL firmada:', error);
        throw new Error(`Error al generar URL firmada: ${error.message}`);
    }
};

/**
 * Elimina una imagen de S3
 * @param {string} key - Clave de la imagen en S3
 * @returns {Promise<void>}
 */
const eliminarImagen = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error al eliminar imagen de S3:', error);
        throw new Error(`Error al eliminar imagen de S3: ${error.message}`);
    }
};

module.exports = {
    subirImagen,
    obtenerImagen,
    obtenerUrlFirmada,
    eliminarImagen,
};

