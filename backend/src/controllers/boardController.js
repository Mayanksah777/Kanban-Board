const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const { buildBoardState } = require('../utils/boardState');

async function getBoards(req, res, next) {
  try {
    const userId = req.user.id;

    const workspaces = await Workspace.find({
      'members.userId': userId
    }).select('_id');

    const workspaceIds = workspaces.map((workspace) => workspace._id);
    const boards = await Board.find({ workspaceId: { $in: workspaceIds } });

    return res.json({
      boards: boards.map((board) => ({
        id: board._id.toString(),
        workspaceId: board.workspaceId.toString(),
        title: board.title,
        columnOrder: board.columnOrder.map((id) => id.toString())
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function getBoardStateById(req, res, next) {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

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

    const state = await buildBoardState(boardId);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getBoards,
  getBoardStateById
};