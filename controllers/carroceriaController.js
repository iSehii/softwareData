const { Carroceria } = require('../config/SQL')();

exports.obtenerCarrocerias = async (req, res) => {
    try {
        const carrocerias = await Carroceria.findAll();
        return res.json(carrocerias);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }
        return res.json(carroceria);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearCarroceria = async (req, res) => {
    try {
        const {
            no_parte, color, panel, descripcion,
            lote, estado, carroceriascol, created_by
        } = req.body;
        const nuevaCarroceria = await Carroceria.create({
            no_parte,
            color,
            panel,
            descripcion,
            lote,
            estado,
            carroceriascol,
            created_by
        });
        return res.status(201).json(nuevaCarroceria);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            no_parte, color, panel, descripcion,
            lote, estado, carroceriascol, created_by
        } = req.body;
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }
        await carroceria.update({
            no_parte,
            color,
            panel,
            descripcion,
            lote,
            estado,
            carroceriascol,
            created_by
        });
        return res.json(carroceria);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }
        await carroceria.destroy();
        return res.json({ message: 'Carrocería eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
