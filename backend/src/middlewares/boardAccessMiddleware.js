const Board = require('../models/Board');
const Workspace = require('../models/Workspace');

async function requireBoardAccess(req, res, next) {
  try {
    const boardId = req.params.boardId || req.body.boardId;

    if (!boardId) {
      return res.status(400).json({ message: 'boardId is required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const workspace = await Workspace.findById(board.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const membership = workspace.members.find((member) => member.userId.toString() === req.user.id);
    if (!membership) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.board = board;
    req.workspace = workspace;
    req.workspaceMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireBoardAccess
};
