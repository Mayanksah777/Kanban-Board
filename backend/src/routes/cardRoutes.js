const express = require('express');
const { createCard } = require('../controllers/cardController');

const router = express.Router();

router.post('/', createCard);

module.exports = router;