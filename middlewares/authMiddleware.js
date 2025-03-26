const jwt = require("jsonwebtoken");
exports.verificarToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Token requerido" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token inválido" });
        req.user = decoded;
        next();
    });
};