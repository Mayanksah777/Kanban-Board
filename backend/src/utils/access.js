const Board = require('../models/Board');
const Workspace = require('../models/Workspace');

async function userCanAccessBoard(userId, boardId) {
  const board = await Board.findById(boardId);
  if (!board) {
    return null;
  }

  const workspace = await Workspace.findOne({
    _id: board.workspaceId,
    'members.userId': userId
  });

  if (!workspace) {
    return null;
  }

  return board;
}

module.exports = {
  userCanAccessBoard
};