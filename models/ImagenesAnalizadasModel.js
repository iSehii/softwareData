const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImagenAnalizadaSchema = new Schema({
  imagen_original_id: {
    type: Schema.Types.ObjectId,
    ref: 'Imagens',
    required: true
  },
  color_dominante: {
    type: String,
    required: true
  },
  imperfecciones: [{
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    }
  }],
  imagen_resultado: {
    type: Buffer,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ImagenAnalizada = mongoose.model("imagenes_analizadas", ImagenAnalizadaSchema);

module.exports = ImagenAnalizada;
