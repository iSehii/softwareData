// ================================================================= //
// IMPORTS: Organizados por tipo para mayor claridad
// ================================================================= //

// --- Modelos de la Base de Datos ---
const Feedback = require("../models/feedbackModel");
const { Reporte } = require("../models/reporteModel");
const { Carroceria } = require("../models/carroceriaModel");
const { Imperfeccion } = require("../models/imperfeccionModel");
const { Usuario } = require("../models/usuarioModel");
const { Rol } = require("../models/rolModel");
const { Permission } = require("../models/permissionModel");
const { UserPermission } = require("../models/userPermissionModel");
const { RolePermission } = require("../models/rolePermissionModel");
const { Prioridad } = require("../models/prioridadModel");
const { Severidad } = require("../models/severidadModel");
const ImagenesAnalizadas = require("../models/ImagenesAnalizadasModel");

// --- Librerías y Configuración ---
const { Op } = require('sequelize');
const sequelize = require("../config/SQL");
const jwt = require("jsonwebtoken");
// Gemini: Se importa el SDK oficial de Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// ================================================================= //
// INICIALIZACIÓN DE SERVICIOS
// ================================================================= //

// Gemini: Se inicializa el cliente de Google AI con la API Key
// Usando gemini-2.0-flash que es más rápido y tiene mejor disponibilidad
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


// ================================================================= //
// LÓGICA DE NEGOCIO Y ACCESO A DATOS (Funciones de Ayuda)
// (Estas funciones no necesitan cambios, ya que su lógica es independiente del modelo de IA)
// ================================================================= //

/**
 * Obtiene y consolida los permisos de un usuario basados en su rol y sus permisos individuales.
 * @param {number} userId - El ID del usuario.
 * @param {number} roleId - El ID del rol del usuario.
 * @returns {Promise<Array<Object>>} Un array de objetos de permiso.
 */
async function getUserPermissions(userId, roleId) {
    try {
        console.log(`[DEBUG] Obteniendo permisos para usuario ${userId}, rol ${roleId}`);
        
        const [rolePerms, userPerms] = await Promise.all([
            RolePermission.findAll({
                where: { role_id: roleId },
                include: [{ model: Permission, as: 'Permission', required: true }]
            }),
            UserPermission.findAll({
                where: { usuario_id: userId },
                include: [{ model: Permission, as: 'Permission', required: true }]
            })
        ]);

        console.log(`[DEBUG] Permisos de rol encontrados:`, rolePerms.length);
        console.log(`[DEBUG] Permisos de usuario encontrados:`, userPerms.length);

        const permissions = new Map();

        rolePerms.forEach(rp => {
            const perm = rp.Permission;
            permissions.set(`${perm.module}:${perm.action}`, perm);
        });

        userPerms.forEach(up => {
            const perm = up.Permission;
            const key = `${perm.module}:${perm.action}`;
            if (up.allow) {
                permissions.set(key, perm);
            } else {
                permissions.delete(key);
            }
        });

        const result = Array.from(permissions.values());
        console.log(`[DEBUG] Permisos consolidados:`, result.map(p => `${p.module}:${p.action}`));
        
        return result;
    } catch (error) {
        console.error('Error crítico al obtener permisos:', error);
        return []; // Retornar un array vacío en caso de error para no detener la operación.
    }
}

/**
 * Obtiene el contexto de datos del sistema basado en los permisos del usuario y la consulta.
 * (Esta función se mantiene igual)
 * @param {number} userId - El ID del usuario.
 * @param {Array<Object>} permissions - Los permisos del usuario.
 * @param {string} query - La consulta del usuario.
 * @returns {Promise<Object>} Un objeto con el contexto de datos.
 */
async function getSystemDataContext(userId, permissions, query) {
    const context = {};
    const userPermissions = new Set(permissions.map(p => `${p.module}:${p.action}`));
    const lowerQuery = query.toLowerCase();

    // Array de promesas para ejecutar consultas en paralelo
    const promises = [];

    // --- KPIs Generales (siempre disponibles) ---
        promises.push((async () => {
        const [totalCarrocerias, totalReportes, reportesPendientes, reportesCompletados, totalUsuarios, totalImperfecciones, totalRoles, totalPermissions] = await Promise.all([
                Carroceria.count(),
                Reporte.count(),
                Reporte.count({ where: { status: 'Pendiente' } }),
                Reporte.count({ where: { status: 'Completado' } }),
                Usuario.count(),
            Imperfeccion.count(),
            Rol.count(),
            Permission.count()
            ]);
            
                    // Calcular imperfecciones por carrocería (KPI clave de calidad)
        // Método más preciso: considerar solo carrocerías con imperfecciones
        let imperfeccionesPorCarroceria = 0;
        
        if (totalCarrocerias > 0 && totalImperfecciones > 0) {
            // Opción 1: Promedio simple (total imperfecciones / total carrocerías)
            imperfeccionesPorCarroceria = (totalImperfecciones / totalCarrocerias).toFixed(3);
            
            // Opción 2: Solo carrocerías con imperfecciones (más estricto)
            // const carroceriasConImperfecciones = await Carroceria.count({
            //     include: [{
            //         model: Reporte,
            //         as: 'reportes',
            //         where: { id_imperfecciones: { [Op.ne]: null } },
            //         required: true
            //     }]
            // });
            // imperfeccionesPorCarroceria = carroceriasConImperfecciones > 0 ? 
            //     (totalImperfecciones / carroceriasConImperfecciones).toFixed(3) : 0;
        }
        
        context.kpis = {
            totalCarrocerias,
            totalReportes,
            reportesPendientes,
            reportesCompletados,
            totalUsuarios,
            totalImperfecciones,
            totalRoles,
            totalPermissions,
            porcentajeCompletado: totalReportes > 0 ? ((reportesCompletados / totalReportes) * 100).toFixed(2) : 0,
            imperfeccionesPorCarroceria: parseFloat(imperfeccionesPorCarroceria),
            // EXPLICACIÓN DE KPIs:
            // - totalCarrocerias: Número total de carrocerías registradas en el sistema
            // - totalReportes: Cantidad total de reportes de inspección generados
            // - reportesPendientes: Reportes que aún no han sido completados
            // - reportesCompletados: Reportes finalizados exitosamente
            // - totalUsuarios: Usuarios activos en el sistema
            // - totalImperfecciones: Defectos detectados en todas las carrocerías
            // - totalRoles: Roles de usuario definidos en el sistema
            // - totalPermissions: Permisos disponibles para asignar
            // - porcentajeCompletado: % de reportes completados vs total
            // - imperfeccionesPorCarroceria: Promedio de defectos por carrocería (META: 0.0) siempre siempre
         };
        })());

    // --- KPIs Avanzados de Calidad (siempre disponibles) ---
    promises.push((async () => {
        try {
            const hoy = new Date();
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const inicioSemana = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

            // KPIs del mes actual
            const [
                carroceriasDelMes,
                reportesConImperfecciones,
                totalImperfeccionesResult,
                carroceriasConImagenAnalizada
            ] = await Promise.all([
                Carroceria.count({
                    where: {
                        createdAt: { [Op.gte]: inicioMes }
                    }
                }),
                Reporte.count({
                    where: {
                        id_imperfecciones: { [Op.ne]: null },
                        createdAt: { [Op.gte]: inicioMes }
                    }
                }),
                ImagenesAnalizadas.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: inicioMes }
                        }
                    },
                    {
                        $project: {
                            imperfecciones_count: {
                                $cond: {
                                    if: { $isArray: "$imperfecciones" },
                                    then: { $size: "$imperfecciones" },
                                    else: 0
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total_imperfecciones: { $sum: "$imperfecciones_count" }
                        }
                    }
                ]),
                ImagenesAnalizadas.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: inicioMes },
                            imperfecciones: { $exists: true, $ne: [] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }
                    ])
            ]);

            // KPIs de la semana
            const carroceriasSemana = await Carroceria.count({
                where: {
                    createdAt: { [Op.gte]: inicioSemana }
                }
            });

            const reportesSemana = await Reporte.count({
                where: {
                    id_imperfecciones: { [Op.ne]: null },
                    createdAt: { [Op.gte]: inicioSemana }
                }
            });

            // Cálculos de calidad
            const totalImperfecciones = totalImperfeccionesResult[0]?.total_imperfecciones || 0;
            const carroceriasConImagenAnalizadaCount = carroceriasConImagenAnalizada[0]?.count || 0;

            const porcentajeCalidadMes = carroceriasDelMes > 0 
                ? ((carroceriasDelMes - reportesConImperfecciones) / carroceriasDelMes) * 100 
                : 0;

            const porcentajeCalidadSemana = carroceriasSemana > 0 
                ? ((carroceriasSemana - reportesSemana) / carroceriasSemana) * 100 
                : 0;

            const imperfeccionesPorCarroceria = carroceriasDelMes > 0 
                ? Math.min(1, (totalImperfecciones / carroceriasDelMes) / (1 + (totalImperfecciones / carroceriasDelMes)))
                : 0;

            const scoreCalidad = Math.max(0, 100 - (porcentajeCalidadMes * imperfeccionesPorCarroceria));

            // Solo métricas mensuales básicas
            context.kpisAvanzados = {
                mes_actual: {
                    total_carrocerias: carroceriasDelMes,
                    carrocerias_con_imperfecciones: reportesConImperfecciones,
                    total_imperfecciones: totalImperfecciones,
                    porcentaje_calidad: Math.round(porcentajeCalidadMes * 100) / 100,
                    imperfecciones_por_carroceria: Math.round(imperfeccionesPorCarroceria * 1000) / 1000,
                    score_calidad: Math.round(scoreCalidad * 100) / 100
                }
            };

        } catch (kpiError) {
            console.error('Error obteniendo KPIs avanzados:', kpiError);
            // No agregar al contexto si falla
        }
    })());

    // --- KPIs por Período (cuando se mencionan KPIs, métricas o indicadores) ---
    if (lowerQuery.includes('kpi') || lowerQuery.includes('métrica') || lowerQuery.includes('metricas') || 
        lowerQuery.includes('indicador') || lowerQuery.includes('indicadores') || lowerQuery.includes('rendimiento') ||
        lowerQuery.includes('calidad') || lowerQuery.includes('estadística') || lowerQuery.includes('estadisticas')) {
        
        // Solo agregar KPIs básicos del mes si se solicitan
        if (context.kpisAvanzados && context.kpisAvanzados.mes_actual) {
            context.kpisPorPeriodo = {
                mesActual: context.kpisAvanzados.mes_actual
            };
        }
    }

    // --- Reportes Recientes ---
    if (lowerQuery.includes('reporte') || userPermissions.has('REPORTES:VIEW')) {
        promises.push((async () => {
            const reportes = await Reporte.findAll({
                include: [
                    { model: Prioridad, as: 'prioridad' }, 
                    { model: Usuario, as: 'usuarioReporte', attributes: ['nombre'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            context.reportes = reportes.map(r => r.toJSON());
        })());
    }
    
    // --- Carrocerías Recientes ---
    if (lowerQuery.includes('carrocería') || lowerQuery.includes('carroceria') || userPermissions.has('CARROCERIAS:VIEW')) {
        promises.push((async () => {
            try {
                const carrocerias = await Carroceria.findAll({
                    include: [
                        { model: Usuario, as: 'usuarioCarroceria', attributes: ['nombre'] }
                    ],
                    order: [['createdAt', 'DESC']],
                    limit: 10
                });
                context.carrocerias = carrocerias.map(c => c.toJSON());
            } catch (carroceriaError) {
                console.error('Error obteniendo carrocerías:', carroceriaError);
                // No agregar al contexto si falla
            }
        })());
    }

    // --- Usuarios Recientes ---
    if (lowerQuery.includes('usuario') || lowerQuery.includes('usuarios') || userPermissions.has('USUARIOS:VIEW')) {
        promises.push((async () => {
            const usuarios = await Usuario.findAll({
                include: [
                    { model: Rol, as: 'rol', attributes: ['nombre'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            context.usuarios = usuarios.map(u => u.toJSON());
        })());
    }

    // --- Roles y Permisos ---
    if (lowerQuery.includes('rol') || lowerQuery.includes('permiso') || lowerQuery.includes('permission') || userPermissions.has('ROLES:VIEW')) {
        promises.push((async () => {
            const [roles, permissions] = await Promise.all([
                Rol.findAll({
                    include: [
                        { model: Permission, as: 'permissions', through: { attributes: [] } }
                    ],
                    limit: 10
                }),
                Permission.findAll({
                    include: [
                        { model: Rol, as: 'roles', through: { attributes: [] } }
                    ],
                    limit: 20
                })
            ]);
            context.roles = roles.map(r => r.toJSON());
            context.permissions = permissions.map(p => p.toJSON());
        })());
    }

    // --- Imperfecciones Recientes ---
    if (lowerQuery.includes('imperfección') || lowerQuery.includes('imperfeccion') || userPermissions.has('IMPERFECCIONES:VIEW')) {
        promises.push((async () => {
            try {
                        const imperfecciones = await Imperfeccion.findAll({
            include: [
                { model: Usuario, as: 'usuarioImperfeccion', attributes: ['nombre'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });
                context.imperfecciones = imperfecciones.map(i => i.toJSON());
            } catch (imperfeccionError) {
                console.error('Error obteniendo imperfecciones:', imperfeccionError);
                // No agregar al contexto si falla
            }
        })());
    }

    // --- Prioridades y Severidades ---
    if (lowerQuery.includes('prioridad') || lowerQuery.includes('severidad')) {
        promises.push((async () => {
            const [prioridades, severidades] = await Promise.all([
                Prioridad.findAll({ limit: 10 }),
                Severidad.findAll({ limit: 10 })
            ]);
            context.prioridades = prioridades.map(p => p.toJSON());
            context.severidades = severidades.map(s => s.toJSON());
        })());
    }

    // --- Feedbacks Recientes ---
    if (lowerQuery.includes('feedback') || lowerQuery.includes('comentario') || userPermissions.has('FEEDBACK:VIEW')) {
        promises.push((async () => {
            try {
                const feedbacks = await Feedback.find({}, { imagen: 0 })
                    .sort({ createdAt: -1 })
                    .limit(10);
                context.feedbacks = feedbacks.map(f => f.toObject());
                console.log(feedbacks+"feedbacks");
            } catch (feedbackError) {
                console.error('Error obteniendo feedbacks:', feedbackError);
                // No agregar al contexto si falla
            }
        })());
    }

    // Ejecutar promesas con manejo individual de errores
    try {
        const results = await Promise.allSettled(promises);
        
        // Procesar resultados y manejar errores individuales
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Error en consulta ${index}:`, result.reason);
                // No agregar error al contexto, solo log
            }
        });
        
    } catch (dbError) {
        console.error('Error general al obtener el contexto de la base de datos:', dbError);
        // No agregar error al contexto, permitir que funcione con datos parciales
    }

    return context;
}


/**
 * Calcula el tiempo transcurrido desde una fecha hasta ahora.
 * (Esta función se mantiene igual)
 */
function getTiempoTranscurrido(fecha) {
    // ... Lógica idéntica a la original
}

// ================================================================= //
// GENERACIÓN DE RESPUESTA HTML (Componentes Visuales)
// (Estas funciones no necesitan cambios)
// ================================================================= //

/**
 * Crea una tarjeta de KPI.
 * (Esta función se mantiene igual)
 */
function createKpiCard(title, value, description, icon, iconColor) {
    // ... Lógica idéntica a la original
}

/**
 * Genera botones de navegación rápida.
 * (Esta función se mantiene igual)
 */
function createNavigationButtons() {
    // ... Lógica idéntica a la original
}




// ================================================================= //
// CONTROLADOR PRINCIPAL DEL ENDPOINT
// ================================================================= //

/**
 * Procesa una consulta de chat, obtiene contexto y devuelve una respuesta HTML generada por Gemini.
 */
exports.chat = async (req, res) => {
    try {
        const { mensaje, id: userId, id_rol: roleId } = req.body;

        if (!mensaje || !userId || !roleId) {
            return res.status(400).send('<p>Error: Faltan parámetros requeridos (mensaje, id, id_rol).</p>');
        }

        // 1. Obtener Permisos y Contexto en paralelo
        const permissions = await getUserPermissions(userId, roleId);
        const context = await getSystemDataContext(userId, permissions, mensaje);

        // Log para debugging
        console.log(`[DEBUG] Usando modelo Gemini: gemini-2.0-flash`);
        console.log(`[DEBUG] Tamaño del contexto: ${JSON.stringify(context).length} caracteres`);
        console.log(`[DEBUG] Contexto obtenido:`, Object.keys(context));
        console.log(`[DEBUG] KPIs disponibles:`, context.kpis ? Object.keys(context.kpis) : 'No disponible');

        // 2. Gemini: Construir el Prompt optimizado para el modelo 2.0-flash
        const systemPrompt = `Eres un asistente inteligente de "Lumet Inspection", sistema de control de calidad industrial.

IMPORTANTE: Responde SOLO con JSON válido, SIN formato markdown, SIN \`\`\`json, SIN \`\`\`.

Estructura requerida:
{
  "titulo": "string",
  "descripcion": "string en español",
  "componentes": [
    {"tipo": "kpi", "valor": "string", "etiqueta": "string"},
    {"tipo": "lista", "titulo": "string", "items": [{"titulo_item": "string", "subtitulo_item": "string"}]},
    {"tipo": "alerta", "mensaje": "string"}
  ],
  "acciones_rapidas": [
    {
      "titulo": "string",
      "ruta": "string (ruta del frontend)",
      "icono": "string (nombre del icono)",
      "color": "string (color del botón)",
      "descripcion": "string (descripción corta)"
    }
  ]
}

INSTRUCCIONES PARA ACCIONES RÁPIDAS:
- Analiza la consulta del usuario y el contexto disponible
- Sugiere 3-5 acciones relevantes basadas en:
  * Lo que está preguntando el usuario
  * Los datos disponibles en el contexto
  * Las rutas del frontend disponibles
- Usa estas rutas del frontend:
  * /dashboard - Panel principal
  * /reportes - Lista de reportes
  * /reportes/nuevo - Crear reporte
  * /carrocerias - Lista de carrocerías
  * /carrocerias/nuevo - Crear carrocería
  * /usuarios - Lista de usuarios
  * /usuarios/nuevo - Crear usuario
  * /roles - Gestión de roles
  * /imperfecciones - Lista de imperfecciones
  * /imperfecciones/nuevo - Crear imperfección
  * /severidades - Gestión de severidades
  * /prioridades - Gestión de prioridades
  * /feedbacks - Comentarios del sistema
  * /kpis/calidad-dia - KPIs diarios
  * /kpis/calidad-semana - KPIs semanales
  * /kpis/tendencias - Análisis de tendencias

ANÁLISIS DE CALIDAD DISPONIBLE:
- KPIs básicos: totales de carrocerías, reportes, usuarios, etc.
- KPIs por período: hoy, últimos 3 días, última semana, mes actual
- Meta global: 0.0 imperfecciones por carrocería (calidad perfecta)
- Interpretación automática: nivel de calidad, recomendaciones, estado de meta
- Score de calidad: métrica compuesta de 0-100
- Tendencias temporales: comparación entre períodos y progreso hacia la meta
- Análisis comparativo: identificar mejoras o deterioros en el tiempo

EXPLICACIÓN COMPLETA DE KPIs:

KPIs BÁSICOS (context.kpis):
- totalCarrocerias: Número total de carrocerías registradas en el sistema
- totalReportes: Cantidad total de reportes de inspección generados
- reportesPendientes: Reportes que aún no han sido completados
- reportesCompletados: Reportes finalizados exitosamente
- totalUsuarios: Usuarios activos en el sistema
- totalImperfecciones: Defectos detectados en todas las carrocerías
- totalRoles: Roles de usuario definidos en el sistema
- totalPermissions: Permisos disponibles para asignar
- porcentajeCompletado: % de reportes completados vs total
- imperfeccionesPorCarroceria: Promedio de defectos por carrocería (META: 0.0)

KPIs POR PERÍODO (context.kpisPorPeriodo):
- hoy: Métricas del mes actual
- ultimos3Dias: Métricas del mes actual
- ultimaSemana: Métricas del mes actual
- mesActual: Métricas del mes actual
siempre con el mes actual

MÉTRICAS CLAVE DE CALIDAD:
- imperfecciones_por_carroceria: Defectos promedio por carrocería (META: 0.0)
- score_calidad: Puntuación de 0-100 basada en calidad general
- porcentaje_cumplimiento: % de acercamiento a la meta de 0.0
- estado_meta: 🎯 Meta Cumplida, ✅ Muy Cerca, 🟡 Cerca, 🟠 Lejos, 🔴 Muy Lejos

IMPORTANTE: La meta es 0.0 imperfecciones por carrocería (calidad perfecta).
ÚSALO para:
1. Proporcionar análisis comparativos entre períodos
2. Mostrar el progreso hacia la meta de calidad perfecta
3. Identificar tendencias de mejora o deterioro
4. Dar recomendaciones específicas basadas en el estado de la meta
5. Comparar rendimiento actual vs períodos anteriores
6. Explicar el significado y propósito de cada KPI

ACCIONES RÁPIDAS OBLIGATORIAS:
SIEMPRE incluye acciones_rapidas con botones de navegación del frontend.
Las rutas disponibles son:
- /dashboard - Panel principal
- /reportes - Lista de reportes
- /carrocerias - Gestión de carrocerías
- /usuarios - Gestión de usuarios
- /roles - Gestión de roles
- /imperfecciones - Gestión de imperfecciones
- /kpis/calidad-dia - KPIs del día
- /kpis/calidad-semana - KPIs de la semana
- /kpis/tendencias - Análisis de tendencias
- /feedbacks - Comentarios del sistema

REGLA: Cada respuesta DEBE incluir acciones_rapidas con al menos 3-4 botones
relevantes al contexto de la consulta del usuario.

FORMATO OBLIGATORIO DE RESPUESTA:
{
  "titulo": "Título de la respuesta",
  "descripcion": "Descripción detallada",
  "componentes": [...],
  "acciones_rapidas": [
    {
      "titulo": "Ver Dashboard",
      "ruta": "/dashboard",
      "icono": "dashboard",
      "color": "blue",
      "descripcion": "Ir al panel principal"
    }
  ]
}

NUNCA omitas el campo acciones_rapidas. Es OBLIGATORIO.

CONTEXTO: ${JSON.stringify(context)}
CONSULTA: "${mensaje}"

RESPUESTA:`;

        // 3. Gemini: Llamar a la API de Gemini con manejo de reintentos
        let aiResponseText;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
        const result = await geminiModel.generateContent(systemPrompt);
        const response = await result.response;
                aiResponseText = response.text();
                break; // Si es exitoso, salir del bucle
            } catch (geminiError) {
                retryCount++;
                console.error(`Error de Gemini (intento ${retryCount}/${maxRetries}):`, geminiError.message);
                
                // Si es error de cuota (429), esperar antes de reintentar
                if (geminiError.status === 429 && retryCount < maxRetries) {
                    const retryDelay = geminiError.errorDetails?.[2]?.retryDelay || '5s';
                    const delayMs = parseInt(retryDelay) * 1000;
                    console.log(`Esperando ${retryDelay} antes de reintentar...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                
                // Si no es error de cuota o se agotaron los reintentos, lanzar el error
                throw geminiError;
            }
        }
        
        // Si después de todos los reintentos no se pudo obtener respuesta
        if (!aiResponseText) {
            // Fallback: generar una respuesta básica basada en el contexto
            aiResponseText = generateFallbackResponse(mensaje, context);
        }
        
        // 4. Gemini: Procesar la respuesta JSON del modelo
        let aiResponseHtml;
        try {
            // Limpiar la respuesta de Gemini para extraer solo el JSON
            let cleanResponse = aiResponseText.trim();
            
            // Remover marcadores de código markdown si existen
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '');
            }
            if (cleanResponse.endsWith('```')) {
                cleanResponse = cleanResponse.replace(/\s*```$/, '');
            }
            
            // Log para debugging
            console.log(`[DEBUG] Respuesta original de Gemini: ${aiResponseText.substring(0, 100)}...`);
            console.log(`[DEBUG] Respuesta limpia: ${cleanResponse.substring(0, 100)}...`);
            
            // Intentar parsear el JSON limpio
            const aiJson = JSON.parse(cleanResponse);
            
            // Construir el HTML a partir del JSON estructurado
            let componentsHtml = aiJson.componentes.map(comp => {
                if (comp.tipo === 'kpi') {
                    return `<div class="bg-gray-700 border border-gray-600 p-4 rounded-lg">
                                <div class="text-3xl font-bold text-emerald-400">${comp.valor}</div>
                                <div class="text-sm text-gray-300">${comp.etiqueta}</div>
                            </div>`;
                }
                if (comp.tipo === 'lista') {
                    const itemsHtml = comp.items.map(item => 
                        `<div class="bg-gray-700 border border-gray-600 p-3 rounded-lg">
                            <div class="font-semibold text-white">${item.titulo_item}</div>
                            <div class="text-sm text-gray-400">${item.subtitulo_item}</div>
                        </div>`
                    ).join('');
                    return `<div><h3 class="text-lg font-semibold text-emerald-400 mb-3">${comp.titulo}</h3><div class="space-y-3">${itemsHtml}</div></div>`;
                }
                if (comp.tipo === 'alerta') {
                    return `<div class="bg-amber-900 border border-amber-700 p-4 rounded-lg text-amber-200">${comp.mensaje}</div>`;
                }
                return '';
            }).join('');

            aiResponseHtml = `
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-sm">
                    <h2 class="text-2xl font-semibold text-emerald-400 mb-4">${aiJson.titulo}</h2>
                    <p class="text-gray-300 leading-relaxed mb-6">${aiJson.descripcion.replace(/\n/g, '<br>')}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${componentsHtml}
                    </div>
                </div>
                
                <script>
                    // Inyectar las acciones rápidas en el DOM
                    if (${JSON.stringify(aiJson.acciones_rapidas || [])}) {
                        procesarAccionesRapidas(${JSON.stringify(aiJson.acciones_rapidas || [])});
                    }
                </script>
            `;

        } catch (jsonError) {
            console.error("Error al analizar JSON de Gemini:", jsonError);
            console.error("Respuesta recibida de Gemini:", aiResponseText);
            // Si falla el JSON, muestra la respuesta de texto plano como fallback
            aiResponseHtml = `<div class="prose prose-lg max-w-none text-gray-300">${aiResponseText.replace(/\n/g, '<br>')}</div>`;
        }
        
        // 5. Generar y enviar la respuesta HTML completa
        const fullHtmlResponse = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Respuesta del Chatbot - Lumet Inspection</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-900 min-h-screen">
                <div class="container mx-auto px-4 py-8 max-w-4xl">
                    <!-- Header -->
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-white mb-2">Lumetcito</h1>
                        <p class="text-gray-400">Control de calidad</p>
                    </div>

                    <!-- Consulta del Usuario -->
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
                        <div class="flex items-start space-x-3">
                            <div class="bg-emerald-600 text-white rounded-full p-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                            </div>
                            <div class="flex-1">
                                <p class="text-sm text-emerald-400 font-medium">Tu consulta:</p>
                                <p class="text-white">${mensaje}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Respuesta de la IA -->
                    <div class="mb-6">
                        ${aiResponseHtml}
                    </div>

                    <!-- Acciones Rápidas Sugeridas por IA -->
                    <div id="acciones-rapidas" class="mb-6">
                        <!-- Se llenará dinámicamente con JavaScript -->
                    </div>

                    <!-- Botones de Navegación -->


                    <!-- Footer -->
                    <div class="text-center mt-8 text-gray-500 text-sm">
                        <p>Lumet Inspection IA</p>
                    </div>
                </div>

                <script>
                    // Función para procesar las acciones rápidas sugeridas por Gemini
                    function procesarAccionesRapidas(accionesRapidas) {
                        const container = document.getElementById('acciones-rapidas');
                        if (!accionesRapidas || accionesRapidas.length === 0) {
                            container.style.display = 'none';
                            return;
                        }

                        const html = \`
                            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-sm">
                                <h3 class="text-xl font-semibold text-emerald-400 mb-4 flex items-center">
                                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    Acciones Sugeridas por IA
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    \${accionesRapidas.map(accion => \`
                                        <button 
                                            onclick="navegarA('\${accion.ruta}')" 
                                            class="\${getColorClasses(accion.color)} p-4 rounded-lg border border-transparent hover:border-current transition-all duration-200 transform hover:scale-105 group"
                                            title="\${accion.descripcion}"
                                        >
                                            <div class="flex items-center space-x-3">
                                                <div class="\${getIconClasses(accion.icono)} text-2xl group-hover:scale-110 transition-transform"></div>
                                                <div class="text-left">
                                                    <div class="font-semibold text-white group-hover:text-white">\${accion.titulo}</div>
                                                    <div class="text-xs opacity-90">\${accion.descripcion}</div>
                                                </div>
                                            </div>
                                        </button>
                                    \`).join('')}
                                </div>
                            </div>
                        \`;
                        
                        container.innerHTML = html;
                        container.style.display = 'block';
                    }

                    // Función para obtener clases de color CSS
                    function getColorClasses(color) {
                        const colorMap = {
                            'blue': 'bg-blue-500 hover:bg-blue-600 text-white',
                            'green': 'bg-green-500 hover:bg-green-600 text-white',
                            'red': 'bg-red-500 hover:bg-red-600 text-white',
                            'yellow': 'bg-yellow-500 hover:bg-yellow-600 text-white',
                            'purple': 'bg-purple-500 hover:bg-purple-600 text-white',
                            'indigo': 'bg-indigo-500 hover:bg-indigo-600 text-white',
                            'pink': 'bg-pink-500 hover:bg-pink-600 text-white',
                            'gray': 'bg-gray-500 hover:bg-gray-600 text-white'
                        };
                        return colorMap[color] || 'bg-blue-500 hover:bg-blue-600 text-white';
                    }

                    // Función para obtener iconos
                    function getIconClasses(icono) {
                        const iconMap = {
                            'dashboard': 'fas fa-tachometer-alt',
                            'reportes': 'fas fa-file-alt',
                            'carrocerias': 'fas fa-truck',
                            'usuarios': 'fas fa-users',
                            'roles': 'fas fa-user-shield',
                            'imperfecciones': 'fas fa-exclamation-triangle',
                            'severidades': 'fas fa-exclamation-circle',
                            'prioridades': 'fas fa-sort-amount-up',
                            'feedbacks': 'fas fa-comments',
                            'kpis': 'fas fa-chart-line',
                            'chart-line': 'fas fa-chart-line',
                            'chart-bar': 'fas fa-chart-bar',
                            'chart-pie': 'fas fa-chart-pie',
                            'analytics': 'fas fa-chart-area',
                            'nuevo': 'fas fa-plus',
                            'editar': 'fas fa-edit',
                            'ver': 'fas fa-eye',
                            'lista': 'fas fa-list',
                            'configuracion': 'fas fa-cog',
                            'quality': 'fas fa-award',
                            'trending': 'fas fa-trending-up',
                            'insights': 'fas fa-lightbulb'
                        };
                        return iconMap[icono] || 'fas fa-arrow-right';
                    }

                    // Función para navegar a las rutas
                    function navegarA(ruta) {
                        if (ruta.startsWith('/')) {
                            window.location.href = ruta;
                        } else {
                            console.log('Navegando a:', ruta);
                        }
                    }

                    // Procesar acciones rápidas cuando se carga la página
                    document.addEventListener('DOMContentLoaded', function() {
                        // Intentar extraer las acciones rápidas del contexto de la respuesta
                        const respuestaContainer = document.querySelector('.bg-gray-800.border.border-gray-700');
                        if (respuestaContainer) {
                            // Buscar si hay un script o data attribute con las acciones
                            const scriptTags = document.querySelectorAll('script');
                            scriptTags.forEach(script => {
                                if (script.textContent.includes('acciones_rapidas')) {
                                    try {
                                        const match = script.textContent.match(/acciones_rapidas.*?\[(.*?)\]/s);
                                        if (match) {
                                            const acciones = JSON.parse('[' + match[1] + ']');
                                            procesarAccionesRapidas(acciones);
                                        }
                                    } catch (e) {
                                        console.log('No se pudieron procesar las acciones rápidas');
                                    }
                                }
                            });
                        }
                    });
                </script>

                <!-- Font Awesome para iconos -->
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(fullHtmlResponse);

    } catch (err) {
        console.error("Error catastrófico en /api/chat:", err);
        
        let errorMessage = 'Lo sentimos, ha ocurrido un error interno en el servidor del asistente.';
        let errorDetails = '';
        
        // Manejo específico de errores de Gemini
        if (err.status === 429) {
            errorMessage = 'El servicio de IA está temporalmente sobrecargado.';
            errorDetails = 'Has excedido la cuota de solicitudes. Por favor, espera unos minutos antes de intentar nuevamente.';
        } else if (err.message.includes('quota') || err.message.includes('Too Many Requests')) {
            errorMessage = 'Límite de solicitudes alcanzado.';
            errorDetails = 'El servicio de IA ha alcanzado su límite de uso. Intenta nuevamente en unos minutos.';
        } else if (err.message.includes('API key') || err.message.includes('authentication')) {
            errorMessage = 'Error de configuración del servicio de IA.';
            errorDetails = 'Contacta al administrador del sistema.';
        }
        
        res.status(500).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc2626; margin-bottom: 20px;">Error del Asistente</h1>
                <p style="color: #374151; font-size: 18px; margin-bottom: 15px;">${errorMessage}</p>
                ${errorDetails ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">${errorDetails}</p>` : ''}
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: left;">
                    <p style="color: #374151; font-size: 14px; margin: 0;">
                        <strong>Sugerencia:</strong> Intenta nuevamente en unos minutos o contacta al soporte técnico si el problema persiste.
                    </p>
                </div>
            </div>
        `);
    }
};
// ... (Puedes mantener los otros endpoints como getChatbotStats, getUserHistory, etc., si aún los necesitas.
//      Su lógica interna no necesita cambiar, pero ahora entiendes el patrón para mejorar su salida si es necesario).

// ================================================================= //
// ENDPOINTS AUXILIARES (Estadísticas, Historial, etc.)
// ================================================================= //

/**
 * Devuelve estadísticas generales del sistema para un panel de control.
 */
exports.getChatbotStats = async (req, res) => {
    try {
        console.log(`[DEBUG] getChatbotStats llamado con:`, { userId: req.body.id, roleId: req.body.id_rol });
        
        const { id: userId, id_rol: roleId } = req.body;
        if (!userId || !roleId) {
            console.log(`[DEBUG] Faltan parámetros: userId=${userId}, roleId=${roleId}`);
            return res.status(400).json({ error: "Faltan id o id_rol." });
        }
        
                console.log(`[DEBUG] Usuario ${userId} solicitando estadísticas del sistema`);

        const [
            totalCarrocerias,
            totalReportes,
            totalImperfecciones,
            totalUsuarios,
            totalRoles,
            totalPermissions,
            reportesPendientes,
            reportesCompletados,
            carroceriasDelMes,
            reportesDelMes
        ] = await Promise.all([
            Carroceria.count(),
            Reporte.count(),
            Imperfeccion.count(),
            Usuario.count(),
            Rol.count(),
            Permission.count(),
            Reporte.count({ where: { status: 'Pendiente' } }),
            Reporte.count({ where: { status: 'Completado' } }),
            Carroceria.count({
                where: {
                    createdAt: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            }),
            Reporte.count({
                where: {
                    createdAt: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            })
        ]);
        
        // Calcular métricas adicionales
        const porcentajeCompletado = totalReportes > 0 ? ((reportesCompletados / totalReportes) * 100).toFixed(2) : 0;
        const porcentajePendientes = totalReportes > 0 ? ((reportesPendientes / totalReportes) * 100).toFixed(2) : 0;
        const actividadMes = carroceriasDelMes + reportesDelMes;
        
        res.status(200).json({
            success: true,
            message: 'Estadísticas del sistema obtenidas exitosamente',
            data: {
                // Totales generales
            totalCarrocerias,
            totalReportes,
            totalImperfecciones,
            totalUsuarios,
                totalRoles,
                totalPermissions,
                
                // Estados de reportes
            reportesPendientes,
            reportesCompletados,
                porcentajeCompletado: parseFloat(porcentajeCompletado),
                porcentajePendientes: parseFloat(porcentajePendientes),
                
                // Actividad del mes
                carroceriasDelMes,
                reportesDelMes,
                actividadMes,
                
                // Métricas calculadas
                promedioReportesPorUsuario: totalUsuarios > 0 ? (totalReportes / totalUsuarios).toFixed(2) : 0,
                promedioCarroceriasPorUsuario: totalUsuarios > 0 ? (totalCarrocerias / totalUsuarios).toFixed(2) : 0,
                
                // Timestamp
                timestamp: new Date().toISOString(),
                ultimaActualizacion: new Date().toLocaleString('es-ES', {
                    timeZone: 'America/Mexico_City',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno al obtener las estadísticas.' });
    }
};


exports.getUserHistory = async (req, res) => {
        try {
        console.log(`[DEBUG] getUserHistory llamado con:`, req.body);
        
        const { targetUserId, id: requestingUserId, id_rol: requestingUserRoleId } = req.body;
    
            if (!targetUserId || !requestingUserId || !requestingUserRoleId) {
            console.log(`[DEBUG] Faltan parámetros: targetUserId=${targetUserId}, requestingUserId=${requestingUserId}, requestingUserRoleId=${requestingUserRoleId}`);
            return res.status(400).json({ 
                error: "Faltan parámetros requeridos", 
                required: ["targetUserId", "id", "id_rol"],
                received: { targetUserId, requestingUserId, requestingUserRoleId }
            });
            }
    
            // --- Verificación de Permisos ---
        console.log(`[DEBUG] Verificando permisos para usuario ${requestingUserId} con rol ${requestingUserRoleId}`);
            const permissions = await getUserPermissions(requestingUserId, requestingUserRoleId);
        console.log(`[DEBUG] Permisos obtenidos:`, permissions.map(p => `${p.module}:${p.action}`));
        
            const canViewUsers = permissions.some(p => p.module === 'USUARIOS' && p.action === 'VIEW');
            if (!canViewUsers) {
            console.log(`[DEBUG] Usuario ${requestingUserId} no tiene permisos USUARIOS:VIEW`);
            return res.status(403).json({ 
                error: 'Acceso denegado', 
                message: 'No tienes permisos para ver el historial de otros usuarios.',
                requiredPermission: 'USUARIOS:VIEW',
                userPermissions: permissions.map(p => `${p.module}:${p.action}`)
            });
        }

        // --- Obtención de Datos del Usuario Objetivo ---
        console.log(`[DEBUG] Obteniendo datos del usuario objetivo ${targetUserId}`);
            const targetUser = await Usuario.findByPk(targetUserId, {
                include: [{ model: Rol, as: 'rol', attributes: ['nombre'] }]
            });
    
            if (!targetUser) {
            console.log(`[DEBUG] Usuario objetivo ${targetUserId} no encontrado`);
            return res.status(404).json({ 
                error: 'Usuario objetivo no encontrado',
                targetUserId: targetUserId
            });
        }

        console.log(`[DEBUG] Usuario objetivo encontrado: ${targetUser.nombre} (${targetUser.username})`);

        // --- Obtención de Actividad del Usuario ---
        console.log(`[DEBUG] Obteniendo actividad del usuario ${targetUserId}`);
                        const [userReports, userCarrocerias, userImperfecciones] = await Promise.all([
                Reporte.findAll({ 
                    where: { id_usuario: targetUserId }, 
                    limit: 50, 
                    order: [['createdAt', 'DESC']]
                }),
                Carroceria.findAll({ 
                    where: { id_usuario: targetUserId }, 
                    limit: 50, 
                    order: [['createdAt', 'DESC']]
                }),
                Imperfeccion.findAll({ 
                    where: { id_usuario: targetUserId }, 
                    limit: 50, 
                    order: [['createdAt', 'DESC']]
                })
            ]);

        console.log(`[DEBUG] Actividad obtenida: ${userReports.length} reportes, ${userCarrocerias.length} carrocerías, ${userImperfecciones.length} imperfecciones`);

        // --- Cálculo de Métricas de Actividad ---
        const totalReportes = userReports.length;
        const totalCarrocerias = userCarrocerias.length;
        const totalImperfecciones = userImperfecciones.length;
        
        // Calcular actividad por mes
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const reportesDelMes = userReports.filter(r => new Date(r.createdAt) >= inicioMes).length;
        const carroceriasDelMes = userCarrocerias.filter(c => new Date(c.createdAt) >= inicioMes).length;
        const imperfeccionesDelMes = userImperfecciones.filter(i => new Date(i.createdAt) >= inicioMes).length;

        // Calcular actividad por semana
        const inicioSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const reportesDeLaSemana = userReports.filter(r => new Date(r.createdAt) >= inicioSemana).length;
        const carroceriasDeLaSemana = userCarrocerias.filter(c => new Date(c.createdAt) >= inicioSemana).length;
        const imperfeccionesDeLaSemana = userImperfecciones.filter(i => new Date(i.createdAt) >= inicioSemana).length;
    
            const history = {
            success: true,
            message: `Historial del usuario ${targetUser.nombre} obtenido exitosamente`,
                usuario: {
                    id: targetUser.id,
                    nombre: targetUser.nombre,
                    username: targetUser.username,
                email: targetUser.email,
                    rol: targetUser.rol?.nombre || 'Sin rol',
                    estado: targetUser.estado,
                fechaRegistro: targetUser.createdAt,
                ultimaActividad: targetUser.updatedAt
                },
  resumenActividad: {
                totalReportes,
                totalCarrocerias,
                totalImperfecciones,
                actividadTotal: totalReportes + totalCarrocerias + totalImperfecciones
            },
            actividadReciente: {
                mesActual: {
                    reportes: reportesDelMes,
                    carrocerias: carroceriasDelMes,
                    imperfecciones: imperfeccionesDelMes,
                    total: reportesDelMes + carroceriasDelMes + imperfeccionesDelMes
                },
                ultimaSemana: {
                    reportes: reportesDeLaSemana,
                    carrocerias: carroceriasDeLaSemana,
                    imperfecciones: imperfeccionesDeLaSemana,
                    total: reportesDeLaSemana + carroceriasDeLaSemana + imperfeccionesDeLaSemana
                }
            },
            datosDetallados: {
                reportesRecientes: userReports.slice(0, 10).map(r => ({
                    id: r.id,
                    titulo: r.titulo || 'Sin título',
                    descripcion: r.descripcion,
                    status: r.status,
                    fechaCreacion: r.createdAt,
                    fechaActualizacion: r.updatedAt
                })),
                carroceriasRecientes: userCarrocerias.slice(0, 10).map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    modelo: c.modelo,
                    estado: c.estado,
                    fechaCreacion: c.createdAt,
                    fechaActualizacion: c.updatedAt
                })),
                imperfeccionesRecientes: userImperfecciones.slice(0, 10).map(i => ({
                    id: i.id,
                    nombre: i.nombre,
                    descripcion: i.descripcion,
                    fechaCreacion: i.createdAt,
                    fechaActualizacion: i.updatedAt
                }))
            },
            timestamp: new Date().toISOString()
        };

        console.log(`[DEBUG] Historial enviado exitosamente para usuario ${targetUserId}`);
            res.status(200).json(history);
    
        } catch (error) {
            console.error('Error obteniendo historial del usuario:', error);
        res.status(500).json({ 
            error: 'Error interno al obtener el historial del usuario',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        }
    };
    


exports.testRelations = async (req, res) => {
        try {
            const { id: userId, id_rol: roleId } = req.body;
            if (!userId || !roleId) {
                return res.status(400).json({ error: "Faltan id o id_rol." });
            }
    
            const [permissions, usuario] = await Promise.all([
                getUserPermissions(userId, roleId),
                Usuario.findByPk(userId, { include: [{ model: Rol, as: 'rol' }] })
            ]);
    
            res.status(200).json({
                success: true,
                message: 'Las relaciones y permisos fueron consultados exitosamente.',
                usuario: usuario ? {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    rol: usuario.rol?.nombre || 'Sin rol'
                } : null,
                permisosObtenidos: permissions.map(p => `${p.module}:${p.action}`)
            });
    
        } catch (error) {
            console.error('Error en test de relaciones:', error);
            res.status(500).json({
                success: false,
                error: 'Error en el test de relaciones.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

// ================================================================= //
// FUNCIONES DE FALLBACK Y UTILIDADES
// ================================================================= //

/**
 * Genera una respuesta de fallback cuando Gemini no está disponible
 */
function generateFallbackResponse(mensaje, context) {
    const lowerQuery = mensaje.toLowerCase();
    
    // Respuestas predefinidas basadas en palabras clave
    if (lowerQuery.includes('kpi') || lowerQuery.includes('estadística') || lowerQuery.includes('rendimiento') || 
        lowerQuery.includes('calidad') || lowerQuery.includes('métrica') || lowerQuery.includes('metricas') ||
        lowerQuery.includes('indicador') || lowerQuery.includes('indicadores')) {
        
        if (context.kpisPorPeriodo) {
            const kpisHoy = context.kpisPorPeriodo.hoy;
            const metaGlobal = context.kpisPorPeriodo.metaGlobal;
            
            return JSON.stringify({
                titulo: "KPIs del Día Actual",
                descripcion: `Análisis detallado de la calidad del sistema Lumet Inspection para hoy. ${kpisHoy.interpretacion.recomendacion}`,
                componentes: [
                    {
                        tipo: "kpi",
                        valor: kpisHoy.metricas.score_calidad + "%",
                        etiqueta: "Score de Calidad del Día"
                    },
                    {
                        tipo: "kpi",
                        valor: kpisHoy.porcentajes.calidad_general + "%",
                        etiqueta: "Calidad General del Día"
                    },
                    {
                        tipo: "kpi",
                        valor: kpisHoy.resumen.total_carrocerias.toString(),
                        etiqueta: "Carrocerías del Día"
                    },
                    {
                        tipo: "kpi",
                        valor: kpisHoy.resumen.total_imperfecciones_detectadas.toString(),
                        etiqueta: "Imperfecciones Detectadas"
                    },
                    {
                        tipo: "kpi",
                        valor: kpisHoy.metricas.imperfecciones_por_carroceria.toString(),
                        etiqueta: "Imperfecciones por Carrocería"
                    },
                    {
                        tipo: "kpi",
                        valor: kpisHoy.metricas.porcentaje_cumplimiento + "%",
                        etiqueta: "Cumplimiento de Meta"
                    },
                    {
                        tipo: "alerta",
                        mensaje: `Meta: ${metaGlobal.descripcion}. Estado: ${kpisHoy.interpretacion.estado_meta}. ${kpisHoy.interpretacion.recomendacion}`
                    }
                ],
                acciones_rapidas: [
                    {
                        titulo: "Ver KPIs del Día",
                        ruta: "/kpis/calidad-dia",
                        icono: "kpis",
                        color: "blue",
                        descripcion: "Análisis completo del día"
                    },
                    {
                        titulo: "Ver KPIs de la Semana",
                        ruta: "/kpis/calidad-semana",
                        icono: "chart-line",
                        color: "green",
                        descripcion: "Análisis semanal"
                    },
                    {
                        titulo: "Ver Tendencias",
                        ruta: "/kpis/tendencias",
                        icono: "trending",
                        color: "purple",
                        descripcion: "Análisis de tendencias"
                    }
                ]
            });
        } else if (context.kpisAvanzados) {
            return JSON.stringify({
                titulo: "Análisis de Calidad del Sistema",
                descripcion: `Análisis detallado de la calidad del sistema Lumet Inspection. ${context.kpisAvanzados.interpretacion.recomendacion}`,
                componentes: [
                    {
                        tipo: "kpi",
                        valor: context.kpisAvanzados.mes_actual.score_calidad + "%",
                        etiqueta: "Score de Calidad"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpisAvanzados.mes_actual.porcentaje_calidad + "%",
                        etiqueta: "Calidad del Mes"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpisAvanzados.semana_actual.porcentaje_calidad + "%",
                        etiqueta: "Calidad de la Semana"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpisAvanzados.mes_actual.total_carrocerias.toString(),
                        etiqueta: "Carrocerías del Mes"
                    },
                    {
                        tipo: "alerta",
                        mensaje: `Nivel de calidad: ${context.kpisAvanzados.interpretacion.nivel_calidad}. ${context.kpisAvanzados.interpretacion.recomendacion}`
                    }
                ],
                acciones_rapidas: [
                    {
                        titulo: "Ver KPIs del Día",
                        ruta: "/kpis/calidad-dia",
                        icono: "kpis",
                        color: "blue",
                        descripcion: "Análisis del día actual"
                    },
                    {
                        titulo: "Ver Tendencias",
                        ruta: "/kpis/tendencias",
                        icono: "trending",
                        color: "green",
                        descripcion: "Análisis de tendencias"
                    },
                    {
                        titulo: "Ver Reportes",
                        ruta: "/reportes",
                        icono: "reportes",
                        color: "purple",
                        descripcion: "Lista de reportes del sistema"
                    }
                ]
            });
        } else if (context.kpis) {
            return JSON.stringify({
                titulo: "Estadísticas del Sistema",
                descripcion: "Aquí tienes un resumen de las métricas principales del sistema:",
                componentes: [
                    {
                        tipo: "kpi",
                        valor: context.kpis.totalCarrocerias.toString(),
                        etiqueta: "Total Carrocerías"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpis.totalReportes.toString(),
                        etiqueta: "Total Reportes"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpis.porcentajeCompletado + "%",
                        etiqueta: "Reportes Completados"
                    },
                    {
                        tipo: "kpi",
                        valor: context.kpis.imperfeccionesPorCarroceria.toString(),
                        etiqueta: "Imperfecciones por Carrocería"
                    }
                ],
                acciones_rapidas: [
                    {
                        titulo: "Ver KPIs del Día",
                        ruta: "/kpis/calidad-dia",
                        icono: "kpis",
                        color: "blue",
                        descripcion: "Análisis detallado del día"
                    }
                ]
            });
        }
    }
    
    if (lowerQuery.includes('reporte') || lowerQuery.includes('reportes')) {
        if (context.reportes && context.reportes.length > 0) {
            const items = context.reportes.slice(0, 3).map(r => ({
                titulo_item: `Reporte #${r.id}`,
                subtitulo_item: `Estado: ${r.status} - Prioridad: ${r.prioridad?.nombre || 'N/A'}`
            }));
            
            return JSON.stringify({
                titulo: "Reportes Recientes",
                descripcion: "Aquí tienes los reportes más recientes del sistema:",
                componentes: [
                    {
                        tipo: "lista",
                        titulo: "Reportes Recientes",
                        items: items
                    }
                ]
            });
        }
    }
    
    // Respuesta genérica
    return JSON.stringify({
        titulo: "Información del Sistema",
        descripcion: "El servicio de IA no está disponible en este momento, pero puedo mostrarte información básica del sistema.",
        componentes: [
            {
                tipo: "alerta",
                mensaje: "Modo de respaldo activado. Las respuestas pueden ser limitadas."
            }
        ],
        acciones_rapidas: [
            {
                titulo: "Ver Dashboard",
                ruta: "/dashboard",
                icono: "dashboard",
                color: "blue",
                descripcion: "Panel principal del sistema"
            },
            {
                titulo: "Ver Reportes",
                ruta: "/reportes",
                icono: "reportes",
                color: "green",
                descripcion: "Lista de reportes del sistema"
            },
            {
                titulo: "Ver KPIs",
                ruta: "/kpis/calidad-dia",
                icono: "kpis",
                color: "purple",
                descripcion: "Métricas de calidad del día"
            }
        ]
    });
}