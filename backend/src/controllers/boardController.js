const Board = require('../models/Board');
const Column = require('../models/Column');
const Workspace = require('../models/Workspace');
const { buildBoardState } = require('../utils/boardState');

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

function toBoardResponse(board) {
  return {
    id: board._id.toString(),
    workspaceId: board.workspaceId.toString(),
    title: board.title,
    columnOrder: board.columnOrder.map((id) => id.toString()),
    createdAt: board.createdAt
  };
}

async function getBoards(req, res, next) {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.query;

    if (workspaceId) {
      const hasAccess = await Workspace.exists({
        _id: workspaceId,
        'members.userId': userId
      });

      if (!hasAccess) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const workspaceBoards = await Board.find({ workspaceId }).sort({ createdAt: 1 });
      return res.json({
        boards: workspaceBoards.map(toBoardResponse)
      });
    }

    const workspaces = await Workspace.find({ 'members.userId': userId }).select('_id');

    const workspaceIds = workspaces.map((workspace) => workspace._id);
    const boards = await Board.find({ workspaceId: { $in: workspaceIds } }).sort({ createdAt: 1 });

    return res.json({
      boards: boards.map(toBoardResponse)
    });
  } catch (error) {
    return next(error);
  }
}

async function createBoard(req, res, next) {
  try {
    const { workspaceId, title } = req.body;

    if (!workspaceId || !title || !title.trim()) {
      return res.status(400).json({ message: 'workspaceId and title are required' });
    }

    const board = await Board.create({
      workspaceId,
      title: title.trim(),
      columnOrder: []
    });

    const columns = await Column.create(
      DEFAULT_COLUMNS.map((columnTitle, index) => ({
        boardId: board._id,
        title: columnTitle,
        cardOrder: [],
        position: index
      }))
    );

    board.columnOrder = columns.map((column) => column._id);
    await board.save();

    return res.status(201).json({ board: toBoardResponse(board) });
  } catch (error) {
    return next(error);
  }
}

async function getBoardById(req, res, next) {
  try {
    return res.json({ board: toBoardResponse(req.board) });
  } catch (error) {
    return next(error);
  }
}

async function getBoardStateById(req, res, next) {
  try {
    const boardId = req.board._id.toString();

    const state = await buildBoardState(boardId);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBoard,
  getBoardById,
  getBoards,
  getBoardStateById
};
