const mongoose = require("mongoose");

const imagenSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  imagen: { type: String, required: true },
});

// Middleware para asignar un ID numérico secuencial antes de guardar
imagenSchema.pre("save", async function (next) {
  if (!this.id) {
    const lastImage = await this.constructor.findOne().sort("-id");
    this.id = lastImage ? lastImage.id + 1 : 1;
  }
  next();
});

const Imagen = mongoose.model("Imagen", imagenSchema);

module.exports = Imagen;
