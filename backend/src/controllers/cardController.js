const Board = require('../models/Board');
const Column = require('../models/Column');
const Card = require('../models/Card');
const Workspace = require('../models/Workspace');
const { toClientCard } = require('../utils/serialize');

async function createCard(req, res, next) {
  try {
    const { boardId, columnId, title, description = '' } = req.body;
    const userId = req.user.id;

    if (!boardId || !columnId || !title) {
      return res.status(400).json({ message: 'boardId, columnId and title are required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const hasAccess = await Workspace.exists({
      _id: board.workspaceId,
      'members.userId': userId
    });

    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const column = await Column.findOne({ _id: columnId, boardId });
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const card = await Card.create({
      boardId,
      columnId,
      title,
      description,
      position: column.cardOrder.length,
      version: 0
    });

    column.cardOrder.push(card._id);
    await column.save();

    req.io.to(boardId.toString()).emit('card:updated', {
      action: 'created',
      card: toClientCard(card),
      columnId: column._id.toString()
    });

    return res.status(201).json({ card: toClientCard(card) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCard
};