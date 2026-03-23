const Board = require('../models/Board');
const Column = require('../models/Column');
const Card = require('../models/Card');
const { toClientBoard, toClientColumn, toClientCard } = require('./serialize');

function sortByIdOrder(items, idOrder, fallbackSort = null) {
  const map = new Map(items.map((item) => [item._id.toString(), item]));
  const ordered = [];

  idOrder.forEach((id) => {
    const key = id.toString();
    if (map.has(key)) {
      ordered.push(map.get(key));
      map.delete(key);
    }
  });

  const leftovers = Array.from(map.values());
  if (fallbackSort) {
    leftovers.sort(fallbackSort);
  }

  return [...ordered, ...leftovers];
}

async function buildBoardState(boardId) {
  const board = await Board.findById(boardId).lean();
  if (!board) {
    return null;
  }

  const columns = await Column.find({ boardId }).lean();
  const cards = await Card.find({ boardId }).lean();

  const cardsByColumn = cards.reduce((accumulator, card) => {
    const key = card.columnId.toString();
    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(card);
    return accumulator;
  }, new Map());

  const orderedColumns = sortByIdOrder(columns, board.columnOrder, (a, b) => a.position - b.position);

  const clientColumns = orderedColumns.map((column) => {
    const columnCards = cardsByColumn.get(column._id.toString()) || [];
    const orderedCards = sortByIdOrder(columnCards, column.cardOrder, (a, b) => a.position - b.position);

    return toClientColumn(
      column,
      orderedCards.map((card) => toClientCard(card))
    );
  });

  return {
    board: toClientBoard(board),
    columns: clientColumns
  };
}

module.exports = {
  buildBoardState
};