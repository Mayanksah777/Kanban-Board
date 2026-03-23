const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    columnOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Column'
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);