const { Carroceria } = require('../models/carroceriaModel');
const { Reporte } = require('../models/reporteModel');
const { Imperfeccion } = require('../models/imperfeccionModel');
const ImagenesAnalizadas = require('../models/ImagenesAnalizadasModel');
const { Usuario } = require('../models/usuarioModel');
const { Op } = require('sequelize');

// Función para calcular KPIs de calidad del mes actual (OPTIMIZADA)
exports.getCalidadPorDia = async (req, res) => {
    try {
        const { fecha } = req.query;
        let fechaInicio, fechaFin;

        if (fecha) {
            // Si se especifica una fecha, calcular para ese mes
            const fechaObj = new Date(fecha);
            fechaInicio = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), 1); // Primer día del mes
            fechaFin = new Date(fechaInicio.getTime() + 24 * 60 * 60 * 1000); // Día actual o fin del mes
        } else {
            // Por defecto, calcular para el mes actual (desde el primer día hasta hoy)
            const hoy = new Date();
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1); // Primer día del mes actual
            fechaFin = new Date(hoy.getTime() + 24 * 60 * 60 * 1000); // Hasta hoy
        }

        console.log(`[KPI] Calculando calidad del mes: ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);

        // Ejecutar todas las consultas en paralelo para máximo rendimiento
        const [
            carroceriasDelMes,
            reportesConImperfecciones,
            totalImperfeccionesResult,
            carroceriasConImagenAnalizada
        ] = await Promise.all([
            // 1. Total de carrocerías del mes
            Carroceria.count({
                where: {
                    createdAt: {
                        [Op.gte]: fechaInicio,
                        [Op.lt]: fechaFin
                    }
                }
            }),

            // 2. Reportes con imperfecciones del mes
            Reporte.count({
                where: {
                    id_imperfecciones: {
                        [Op.ne]: null
                    },
                    createdAt: {
                        [Op.gte]: fechaInicio,
                        [Op.lt]: fechaFin
                    }
                }
            }),

            // 3. Total de imperfecciones detectadas del mes (usando agregación MongoDB)
            ImagenesAnalizadas.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: fechaInicio,
                            $lt: fechaFin
                        }
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
                        total_imperfecciones: { $sum: "$imperfecciones_count" },
                        carrocerias_con_imagen: { $sum: 1 }
                    }
                }
            ]),

            // 4. Carrocerías con imagen analizada del mes (usando agregación)
            ImagenesAnalizadas.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: fechaInicio,
                            $lt: fechaFin
                        },
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

        // Extraer resultados de las agregaciones
        const totalImperfecciones = totalImperfeccionesResult[0]?.total_imperfecciones || 0;
        const carroceriasConImagenAnalizadaCount = carroceriasConImagenAnalizada[0]?.count || 0;

        // 5. Cálculos optimizados (sin bucles)
        const porcentajeCalidadGeneral = carroceriasDelMes > 0 
            ? ((carroceriasDelMes - reportesConImperfecciones) / carroceriasDelMes) * 100 
            : 0;

        const porcentajeCarroceriasSinImperfecciones = porcentajeCalidadGeneral;
        const porcentajeCarroceriasConImperfecciones = carroceriasDelMes > 0 
            ? (reportesConImperfecciones / carroceriasDelMes) * 100 
            : 0;

        // 6. MEJORADO: Imperfecciones por carrocería normalizado de 0 a 1
        let imperfeccionesPorCarroceria = 0;
        if (carroceriasDelMes > 0) {
            // Calcular el promedio real de imperfecciones por carrocería
            const promedioReal = totalImperfecciones / carroceriasDelMes;
            
            // Normalizar a un rango de 0 a 1 usando una función logarítmica
            // Esto da más peso a las diferencias en valores bajos
            if (promedioReal > 0) {
                imperfeccionesPorCarroceria = Math.min(1, promedioReal / (1 + promedioReal));
            }
        }

        const porcentajeImagenesAnalizadas = carroceriasDelMes > 0 
            ? (carroceriasConImagenAnalizadaCount / carroceriasDelMes) * 100 
            : 0;

        // 7. Score de calidad optimizado usando el nuevo indicador
        const factorSeveridad = imperfeccionesPorCarroceria; // Ya está normalizado de 0 a 1
        const scoreCalidad = Math.max(0, 100 - (porcentajeCarroceriasConImperfecciones * factorSeveridad));

        const kpis = {
            periodo: 'Mes actual',
            fecha_inicio: fechaInicio.toISOString().split('T')[0],
            fecha_fin: fechaFin.toISOString().split('T')[0],
            resumen: {
                total_carrocerias: carroceriasDelMes,
                carrocerias_con_imperfecciones: reportesConImperfecciones,
                carrocerias_sin_imperfecciones: carroceriasDelMes - reportesConImperfecciones,
                total_imperfecciones_detectadas: totalImperfecciones,
                carrocerias_con_imagen_analizada: carroceriasConImagenAnalizadaCount
            },
            porcentajes: {
                calidad_general: Math.round(porcentajeCalidadGeneral * 100) / 100,
                carrocerias_sin_imperfecciones: Math.round(porcentajeCarroceriasSinImperfecciones * 100) / 100,
                carrocerias_con_imperfecciones: Math.round(porcentajeCarroceriasConImperfecciones * 100) / 100,
                imagenes_analizadas: Math.round(porcentajeImagenesAnalizadas * 100) / 100
            },
            metricas: {
                imperfecciones_por_carroceria: Math.round(imperfeccionesPorCarroceria * 1000) / 1000, // 3 decimales
                score_calidad: Math.round(scoreCalidad * 100) / 100
            },
            interpretacion: {
                nivel_calidad: scoreCalidad >= 90 ? 'Excelente' : 
                              scoreCalidad >= 80 ? 'Muy Bueno' : 
                              scoreCalidad >= 70 ? 'Bueno' : 
                              scoreCalidad >= 60 ? 'Aceptable' : 
                              scoreCalidad >= 50 ? 'Regular' : 'Necesita Mejora',
                recomendacion: scoreCalidad >= 80 ? 'Mantener estándares actuales' :
                              scoreCalidad >= 60 ? 'Revisar procesos de inspección' :
                              'Implementar mejoras urgentes en control de calidad',
                nivel_imperfecciones: imperfeccionesPorCarroceria <= 0.1 ? 'Muy Bajo' :
                                    imperfeccionesPorCarroceria <= 0.3 ? 'Bajo' :
                                    imperfeccionesPorCarroceria <= 0.5 ? 'Moderado' :
                                    imperfeccionesPorCarroceria <= 0.7 ? 'Alto' : 'Muy Alto'
            }
        };

        console.log(`[KPI] KPIs del mes calculados: Score de calidad: ${kpis.metricas.score_calidad}%, Imperfecciones por carrocería: ${kpis.metricas.imperfecciones_por_carroceria}`);

        res.json({
            success: true,
            message: 'KPIs de calidad del mes calculados exitosamente',
            data: kpis
        });

    } catch (error) {
        console.error('[KPI] Error al calcular KPIs de calidad del mes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al calcular KPIs de calidad del mes',
            details: error.message
        });
    }
};

// Función para obtener KPIs de calidad de la última semana (OPTIMIZADA)
exports.getCalidadUltimaSemana = async (req, res) => {
    try {
        const hoy = new Date();
        const inicioSemana = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Consulta agregada para obtener todos los datos de la semana en una sola consulta
        const datosSemana = await Carroceria.findAll({
            attributes: [
                [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'fecha'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total_carrocerias']
            ],
            where: {
                createdAt: {
                    [Op.gte]: inicioSemana
                }
            },
            group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
            order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']],
            raw: true
        });

        // Consulta agregada para reportes con imperfecciones de la semana
        const reportesSemana = await Reporte.findAll({
            attributes: [
                [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'fecha'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total_reportes']
            ],
            where: {
                id_imperfecciones: {
                    [Op.ne]: null
                },
                createdAt: {
                    [Op.gte]: inicioSemana
                }
            },
            group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
            raw: true
        });

        // Consulta agregada para imperfecciones de la semana (MongoDB)
        const imperfeccionesSemana = await ImagenesAnalizadas.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: inicioSemana
                    }
                }
            },
            {
                $project: {
                    fecha: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
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
                    _id: "$fecha",
                    total_imperfecciones: { $sum: "$imperfecciones_count" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Crear mapa de datos para acceso rápido
        const reportesMap = new Map(reportesSemana.map(r => [r.fecha, parseInt(r.total_reportes)]));
        const imperfeccionesMap = new Map(imperfeccionesSemana.map(i => [i._id, i.total_imperfecciones]));

        // Procesar KPIs por día usando los datos agregados
        const kpisSemana = datosSemana.map(dato => {
            const fecha = dato.fecha;
            const totalCarrocerias = parseInt(dato.total_carrocerias);
            const reportesConImperfecciones = reportesMap.get(fecha) || 0;
            const totalImperfecciones = imperfeccionesMap.get(fecha) || 0;

            const porcentajeCalidad = totalCarrocerias > 0 
                ? ((totalCarrocerias - reportesConImperfecciones) / totalCarrocerias) * 100 
                : 0;

            return {
                fecha: fecha,
                total_carrocerias: totalCarrocerias,
                carrocerias_con_imperfecciones: reportesConImperfecciones,
                total_imperfecciones: totalImperfecciones,
                porcentaje_calidad: Math.round(porcentajeCalidad * 100) / 100
            };
        });

        // Calcular promedios de la semana
        const totalCarroceriasSemana = kpisSemana.reduce((sum, kpi) => sum + kpi.total_carrocerias, 0);
        const totalImperfeccionesSemana = kpisSemana.reduce((sum, kpi) => sum + kpi.total_imperfecciones, 0);
        const promedioCalidadSemana = kpisSemana.reduce((sum, kpi) => sum + kpi.porcentaje_calidad, 0) / 7;

        const resumenSemana = {
            periodo: 'Última semana',
            fecha_inicio: inicioSemana.toISOString().split('T')[0],
            fecha_fin: hoy.toISOString().split('T')[0],
            total_carrocerias: totalCarroceriasSemana,
            total_imperfecciones: totalImperfeccionesSemana,
            promedio_calidad: Math.round(promedioCalidadSemana * 100) / 100,
            tendencia: promedioCalidadSemana > 80 ? 'Mejorando' : 
                      promedioCalidadSemana > 60 ? 'Estable' : 'Necesita atención'
        };

        res.json({
            success: true,
            message: 'KPIs de la última semana calculados exitosamente',
            data: {
                resumen_semana: resumenSemana,
                kpis_por_dia: kpisSemana
            }
        });

    } catch (error) {
        console.error('[KPI] Error al calcular KPIs de la semana:', error);
        res.status(500).json({
            success: false,
            error: 'Error al calcular KPIs de la semana',
            details: error.message
        });
    }
};

// Función para obtener tendencias de calidad (YA OPTIMIZADA)
exports.getTendenciasCalidad = async (req, res) => {
    try {
        const { dias = 30 } = req.query;
        const hoy = new Date();
        const fechaInicio = new Date(hoy.getTime() - dias * 24 * 60 * 60 * 1000);

        // Obtener datos agregados por día en una sola consulta
        const datosAgregados = await Carroceria.findAll({
            attributes: [
                [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'fecha'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total_carrocerias']
            ],
            where: {
                createdAt: {
                    [Op.gte]: fechaInicio
                }
            },
            group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
            order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']],
            raw: true
        });

        // Calcular tendencias optimizado
        const tendencias = datosAgregados.map((dato, index) => {
            const fecha = dato.fecha;
            const total = parseInt(dato.total_carrocerias);
            
            let tendencia = 'Estable';
            if (index > 0) {
                const anterior = parseInt(datosAgregados[index - 1].total_carrocerias);
                if (total > anterior) tendencia = 'Subiendo';
                else if (total < anterior) tendencia = 'Bajando';
            }

            return {
                fecha: fecha,
                total_carrocerias: total,
                tendencia: tendencia
            };
        });

        res.json({
            success: true,
            message: 'Tendencias de calidad calculadas exitosamente',
            data: {
                periodo_dias: dias,
                fecha_inicio: fechaInicio.toISOString().split('T')[0],
                fecha_fin: hoy.toISOString().split('T')[0],
                tendencias: tendencias
            }
        });

    } catch (error) {
        console.error('[KPI] Error al calcular tendencias:', error);
        res.status(500).json({
            success: false,
            error: 'Error al calcular tendencias',
            details: error.message
        });
    }
};
