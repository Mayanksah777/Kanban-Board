const express = require('express');
const { getBoards, getBoardStateById } = require('../controllers/boardController');

const router = express.Router();

router.get('/', getBoards);
router.get('/:boardId/state', getBoardStateById);

module.exports = router;