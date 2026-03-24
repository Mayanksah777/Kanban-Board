const express = require('express');
const {
  createBoard,
  getBoardById,
  getBoards,
  getBoardStateById
} = require('../controllers/boardController');
const { requireWorkspaceMember } = require('../middlewares/workspaceAuthMiddleware');
const { requireBoardAccess } = require('../middlewares/boardAccessMiddleware');

const router = express.Router();

router.get('/', getBoards);
router.post('/', requireWorkspaceMember({ source: 'body', field: 'workspaceId' }), createBoard);
router.get('/:boardId', requireBoardAccess, getBoardById);
router.get('/:boardId/state', requireBoardAccess, getBoardStateById);

module.exports = router;
