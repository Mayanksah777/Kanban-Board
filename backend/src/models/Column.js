const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    cardOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
      }
    ],
    position: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Column', columnSchema);