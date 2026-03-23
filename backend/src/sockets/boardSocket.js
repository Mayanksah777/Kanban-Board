const Column = require('../models/Column');
const Card = require('../models/Card');
const { userCanAccessBoard } = require('../utils/access');
const { hasVersionConflict } = require('../utils/conflict');
const { buildBoardState } = require('../utils/boardState');
const { toClientCard } = require('../utils/serialize');

function clampIndex(index, max) {
  const numeric = Number.isInteger(index) ? index : 0;
  if (numeric < 0) {
    return 0;
  }
  if (numeric > max) {
    return max;
  }
  return numeric;
}

async function setCardPositions(cardIds) {
  if (!cardIds.length) {
    return;
  }

  const operations = cardIds.map((cardId, position) => ({
    updateOne: {
      filter: { _id: cardId },
      update: { position }
    }
  }));

  await Card.bulkWrite(operations);
}

function emitRejection(socket, payload) {
  socket.emit('card:rejected', payload);
}

async function handleBoardJoin(io, socket, payload = {}) {
  const { boardId } = payload;

  if (!boardId) {
    return;
  }

  const board = await userCanAccessBoard(socket.user.id, boardId);
  if (!board) {
    return;
  }

  socket.join(boardId.toString());
  const state = await buildBoardState(boardId);
  socket.emit('board:state', state);
}

async function handleCardCreate(io, socket, payload = {}) {
  const {
    boardId,
    columnId,
    title,
    description = '',
    clientTempId = null
  } = payload;

  if (!boardId || !columnId || !title) {
    return;
  }

  const board = await userCanAccessBoard(socket.user.id, boardId);
  if (!board) {
    return;
  }

  const column = await Column.findOne({ _id: columnId, boardId });
  if (!column) {
    return;
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

  io.to(boardId.toString()).emit('card:updated', {
    action: 'created',
    card: toClientCard(card),
    columnId: columnId.toString(),
    clientTempId
  });
}

async function handleCardUpdate(io, socket, payload = {}) {
  const { boardId, cardId, title, description, clientVersion } = payload;

  if (!boardId || !cardId) {
    return;
  }

  const board = await userCanAccessBoard(socket.user.id, boardId);
  if (!board) {
    return;
  }

  const card = await Card.findOne({ _id: cardId, boardId });
  if (!card) {
    return;
  }

  if (hasVersionConflict(clientVersion, card.version)) {
    emitRejection(socket, {
      action: 'update',
      cardId,
      clientVersion,
      serverVersion: card.version,
      serverCard: toClientCard(card)
    });
    return;
  }

  if (typeof title === 'string') {
    card.title = title;
  }

  if (typeof description === 'string') {
    card.description = description;
  }

  card.version += 1;
  await card.save();

  io.to(boardId.toString()).emit('card:updated', {
    action: 'updated',
    card: toClientCard(card)
  });
}

async function handleCardMove(io, socket, payload = {}) {
  const {
    boardId,
    cardId,
    sourceColumnId,
    destinationColumnId,
    destinationIndex = 0,
    clientVersion
  } = payload;

  if (!boardId || !cardId || !sourceColumnId || !destinationColumnId) {
    return;
  }

  const board = await userCanAccessBoard(socket.user.id, boardId);
  if (!board) {
    return;
  }

  const card = await Card.findOne({ _id: cardId, boardId });
  if (!card) {
    return;
  }

  if (hasVersionConflict(clientVersion, card.version)) {
    emitRejection(socket, {
      action: 'move',
      cardId,
      clientVersion,
      serverVersion: card.version,
      serverCard: toClientCard(card)
    });
    return;
  }

  const sourceColumn = await Column.findOne({ _id: sourceColumnId, boardId });
  const destinationColumn = await Column.findOne({ _id: destinationColumnId, boardId });

  if (!sourceColumn || !destinationColumn) {
    return;
  }

  const movedCardId = card._id.toString();
  const sourceOrder = sourceColumn.cardOrder.map((id) => id.toString()).filter((id) => id !== movedCardId);

  if (sourceColumnId === destinationColumnId) {
    const safeIndex = clampIndex(destinationIndex, sourceOrder.length);
    sourceOrder.splice(safeIndex, 0, movedCardId);
    sourceColumn.cardOrder = sourceOrder;

    await sourceColumn.save();
    await setCardPositions(sourceOrder);

    card.position = safeIndex;
    card.version += 1;
    await card.save();

    io.to(boardId.toString()).emit('card:moved', {
      card: toClientCard(card),
      sourceColumnId,
      destinationColumnId,
      destinationIndex: safeIndex,
      sourceCardOrder: sourceOrder,
      destinationCardOrder: sourceOrder
    });

    return;
  }

  const destinationOrder = destinationColumn.cardOrder
    .map((id) => id.toString())
    .filter((id) => id !== movedCardId);

  const safeIndex = clampIndex(destinationIndex, destinationOrder.length);
  destinationOrder.splice(safeIndex, 0, movedCardId);

  sourceColumn.cardOrder = sourceOrder;
  destinationColumn.cardOrder = destinationOrder;

  await sourceColumn.save();
  await destinationColumn.save();

  await setCardPositions(sourceOrder);
  await setCardPositions(destinationOrder);

  card.columnId = destinationColumn._id;
  card.position = safeIndex;
  card.version += 1;
  await card.save();

  io.to(boardId.toString()).emit('card:moved', {
    card: toClientCard(card),
    sourceColumnId,
    destinationColumnId,
    destinationIndex: safeIndex,
    sourceCardOrder: sourceOrder,
    destinationCardOrder: destinationOrder
  });
}

async function handleCardDelete(io, socket, payload = {}) {
  const { boardId, cardId, clientVersion } = payload;

  if (!boardId || !cardId) {
    return;
  }

  const board = await userCanAccessBoard(socket.user.id, boardId);
  if (!board) {
    return;
  }

  const card = await Card.findOne({ _id: cardId, boardId });
  if (!card) {
    return;
  }

  if (hasVersionConflict(clientVersion, card.version)) {
    emitRejection(socket, {
      action: 'delete',
      cardId,
      clientVersion,
      serverVersion: card.version,
      serverCard: toClientCard(card)
    });
    return;
  }

  const column = await Column.findById(card.columnId);
  if (column) {
    const nextOrder = column.cardOrder
      .map((id) => id.toString())
      .filter((id) => id !== cardId.toString());

    column.cardOrder = nextOrder;
    await column.save();
    await setCardPositions(nextOrder);
  }

  await card.deleteOne();

  io.to(boardId.toString()).emit('card:updated', {
    action: 'deleted',
    cardId,
    columnId: card.columnId.toString()
  });
}

function registerBoardSocket(io, socket) {
  socket.on('board:join', async (payload) => {
    await handleBoardJoin(io, socket, payload);
  });

  socket.on('card:create', async (payload) => {
    await handleCardCreate(io, socket, payload);
  });

  socket.on('card:update', async (payload) => {
    await handleCardUpdate(io, socket, payload);
  });

  socket.on('card:move', async (payload) => {
    await handleCardMove(io, socket, payload);
  });

  socket.on('card:delete', async (payload) => {
    await handleCardDelete(io, socket, payload);
  });
}

module.exports = {
  registerBoardSocket
};