const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImagenAnalizadaSchema = new Schema({
  imagen_original_s3_key: {
    type: String,
    required: true
  },
  color_dominante: {
    type: String,
    required: true
  },
  imperfecciones: [{
    label: {
      type: String,
      required: false
    },
    bbox: {
      type: [Number],
      required: false
    },
    x: {
      type: Number,
      required: false
    },
    y: {
      type: Number,
      required: false
    }
  }],
  imagen_resultado_s3_key: {
    type: String,
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
