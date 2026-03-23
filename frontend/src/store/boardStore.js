function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function reorderCardsById(cards, orderIds) {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const ordered = [];

  orderIds.forEach((id) => {
    if (cardMap.has(id)) {
      ordered.push(cardMap.get(id));
      cardMap.delete(id);
    }
  });

  return [...ordered, ...Array.from(cardMap.values())];
}

export function findCardById(state, cardId) {
  for (const column of state?.columns || []) {
    const card = column.cards.find((item) => item.id === cardId);
    if (card) {
      return card;
    }
  }
  return null;
}

export function applyCardMoveOptimistic(state, payload) {
  if (!state) {
    return state;
  }

  const {
    cardId,
    sourceColumnId,
    destinationColumnId,
    destinationIndex,
    incrementVersion = false
  } = payload;

  const nextState = cloneState(state);
  const sourceColumn = nextState.columns.find((column) => column.id === sourceColumnId);
  const destinationColumn = nextState.columns.find((column) => column.id === destinationColumnId);

  if (!sourceColumn || !destinationColumn) {
    return state;
  }

  const cardIndex = sourceColumn.cards.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) {
    return state;
  }

  const [card] = sourceColumn.cards.splice(cardIndex, 1);
  const safeIndex = Math.max(0, Math.min(destinationIndex, destinationColumn.cards.length));

  card.columnId = destinationColumnId;
  if (incrementVersion) {
    card.version += 1;
  }

  destinationColumn.cards.splice(safeIndex, 0, card);

  sourceColumn.cards.forEach((item, index) => {
    item.position = index;
  });

  destinationColumn.cards.forEach((item, index) => {
    item.position = index;
  });

  sourceColumn.cardOrder = sourceColumn.cards.map((item) => item.id);
  destinationColumn.cardOrder = destinationColumn.cards.map((item) => item.id);

  return nextState;
}

export function applyCardUpdateOptimistic(state, payload) {
  if (!state) {
    return state;
  }

  const { cardId, title, description, incrementVersion = false } = payload;
  const nextState = cloneState(state);

  for (const column of nextState.columns) {
    const card = column.cards.find((item) => item.id === cardId);
    if (!card) {
      continue;
    }

    card.title = title;
    card.description = description;
    if (incrementVersion) {
      card.version += 1;
    }
    return nextState;
  }

  return state;
}

export function applyCardDeleteOptimistic(state, payload) {
  if (!state) {
    return state;
  }

  const { cardId, columnId } = payload;
  const nextState = cloneState(state);
  const column = nextState.columns.find((item) => item.id === columnId);

  if (!column) {
    return state;
  }

  column.cards = column.cards.filter((card) => card.id !== cardId);
  column.cardOrder = column.cards.map((card) => card.id);
  column.cards.forEach((card, index) => {
    card.position = index;
  });

  return nextState;
}

export function applyCardCreatedOptimistic(state, payload) {
  if (!state) {
    return state;
  }

  const { columnId, card } = payload;
  const nextState = cloneState(state);
  const column = nextState.columns.find((item) => item.id === columnId);

  if (!column) {
    return state;
  }

  column.cards.push(card);
  column.cardOrder = column.cards.map((item) => item.id);
  column.cards.forEach((item, index) => {
    item.position = index;
  });

  return nextState;
}

export function applyCardUpdatedEvent(state, payload) {
  if (!state) {
    return state;
  }

  const nextState = cloneState(state);

  if (payload.action === 'created') {
    const targetColumn = nextState.columns.find((column) => column.id === payload.columnId || column.id === payload.card.columnId);
    if (!targetColumn) {
      return state;
    }

    if (payload.clientTempId) {
      const tempIndex = targetColumn.cards.findIndex((card) => card.id === payload.clientTempId);
      if (tempIndex !== -1) {
        targetColumn.cards[tempIndex] = payload.card;
      } else if (!targetColumn.cards.some((card) => card.id === payload.card.id)) {
        targetColumn.cards.push(payload.card);
      }
    } else if (!targetColumn.cards.some((card) => card.id === payload.card.id)) {
      targetColumn.cards.push(payload.card);
    }

    targetColumn.cardOrder = targetColumn.cards.map((card) => card.id);
    targetColumn.cards.forEach((card, index) => {
      card.position = index;
    });

    return nextState;
  }

  if (payload.action === 'updated') {
    for (const column of nextState.columns) {
      const card = column.cards.find((item) => item.id === payload.card.id);
      if (card) {
        Object.assign(card, payload.card);
        return nextState;
      }
    }

    return nextState;
  }

  if (payload.action === 'deleted') {
    const column = nextState.columns.find((item) => item.id === payload.columnId);
    if (!column) {
      return state;
    }

    column.cards = column.cards.filter((card) => card.id !== payload.cardId);
    column.cardOrder = column.cards.map((card) => card.id);
    column.cards.forEach((card, index) => {
      card.position = index;
    });

    return nextState;
  }

  return state;
}

export function applyCardMovedEvent(state, payload) {
  if (!state) {
    return state;
  }

  const moved = applyCardMoveOptimistic(state, {
    cardId: payload.card.id,
    sourceColumnId: payload.sourceColumnId,
    destinationColumnId: payload.destinationColumnId,
    destinationIndex: payload.destinationIndex,
    incrementVersion: false
  });

  if (!moved) {
    return state;
  }

  const nextState = cloneState(moved);

  for (const column of nextState.columns) {
    const card = column.cards.find((item) => item.id === payload.card.id);
    if (card) {
      Object.assign(card, payload.card);
      break;
    }
  }

  const sourceColumn = nextState.columns.find((column) => column.id === payload.sourceColumnId);
  const destinationColumn = nextState.columns.find((column) => column.id === payload.destinationColumnId);

  if (sourceColumn && payload.sourceCardOrder?.length) {
    sourceColumn.cards = reorderCardsById(sourceColumn.cards, payload.sourceCardOrder);
    sourceColumn.cardOrder = sourceColumn.cards.map((card) => card.id);
    sourceColumn.cards.forEach((card, index) => {
      card.position = index;
    });
  }

  if (destinationColumn && payload.destinationCardOrder?.length) {
    destinationColumn.cards = reorderCardsById(destinationColumn.cards, payload.destinationCardOrder);
    destinationColumn.cardOrder = destinationColumn.cards.map((card) => card.id);
    destinationColumn.cards.forEach((card, index) => {
      card.position = index;
    });
  }

  return nextState;
}

export function snapshotState(state) {
  return cloneState(state);
}