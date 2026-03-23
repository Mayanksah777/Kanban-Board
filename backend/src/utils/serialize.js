function toClientCard(card) {
  return {
    id: card._id.toString(),
    boardId: card.boardId.toString(),
    columnId: card.columnId.toString(),
    title: card.title,
    description: card.description,
    position: card.position,
    version: card.version
  };
}

function toClientColumn(column, cards) {
  return {
    id: column._id.toString(),
    boardId: column.boardId.toString(),
    title: column.title,
    cardOrder: column.cardOrder.map((id) => id.toString()),
    cards
  };
}

function toClientBoard(board) {
  return {
    id: board._id.toString(),
    workspaceId: board.workspaceId.toString(),
    title: board.title,
    columnOrder: board.columnOrder.map((id) => id.toString())
  };
}

module.exports = {
  toClientCard,
  toClientColumn,
  toClientBoard
};