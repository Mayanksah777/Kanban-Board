import { useEffect, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import Column from '../components/Column';
import CardModal from '../components/CardModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getBoardState, logout } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import {
  applyCardCreatedOptimistic,
  applyCardDeleteOptimistic,
  applyCardMoveOptimistic,
  applyCardMovedEvent,
  applyCardUpdatedEvent,
  applyCardUpdateOptimistic,
  findCardById,
  snapshotState
} from '../store/boardStore';

function rollbackKey(action, cardId) {
  return `${action}:${cardId}`;
}

function resolveDropTarget(overData, boardState) {
  if (overData?.type === 'slot') {
    return {
      destinationColumnId: overData.columnId,
      destinationIndex: overData.index
    };
  }

  if (overData?.type === 'column') {
    const destinationColumn = boardState.columns.find((column) => column.id === overData.columnId);
    return {
      destinationColumnId: overData.columnId,
      destinationIndex: destinationColumn ? destinationColumn.cards.length : 0
    };
  }

  return null;
}

export default function BoardPage({ auth, onAuthChange, onSwitchWorkspace }) {
  const [boardState, setBoardState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const rollbackRef = useRef(new Map());
  const { message, showToast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const boardId = auth.boardId;

  useEffect(() => {
    let ignore = false;

    async function loadBoard() {
      if (!boardId) {
        setLoading(false);
        return;
      }

      try {
        const state = await getBoardState(boardId);
        if (!ignore) {
          setBoardState(state);
        }
      } catch (error) {
        if (!ignore) {
          showToast('Failed to load board');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBoard();

    return () => {
      ignore = true;
    };
  }, [boardId, showToast]);

  useEffect(() => {
    if (!auth.accessToken || !boardId) {
      return undefined;
    }

    const socket = connectSocket(auth.accessToken);

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('board:join', { boardId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleBoardState = (nextState) => {
      setBoardState(nextState);
    };

    const handleCardMoved = (payload) => {
      setBoardState((previous) => applyCardMovedEvent(previous, payload));
      rollbackRef.current.delete(rollbackKey('move', payload.card.id));
    };

    const handleCardUpdated = (payload) => {
      setBoardState((previous) => applyCardUpdatedEvent(previous, payload));

      if (payload.action === 'updated' && payload.card?.id) {
        rollbackRef.current.delete(rollbackKey('update', payload.card.id));
      }

      if (payload.action === 'deleted' && payload.cardId) {
        rollbackRef.current.delete(rollbackKey('delete', payload.cardId));
      }
    };

    const handleCardRejected = (payload) => {
      const key = rollbackKey(payload.action, payload.cardId);
      const snapshot = rollbackRef.current.get(key);

      if (snapshot) {
        setBoardState(snapshot);
        rollbackRef.current.delete(key);
      } else if (payload.serverCard) {
        setBoardState((previous) =>
          applyCardUpdatedEvent(previous, {
            action: 'updated',
            card: payload.serverCard
          })
        );
      }

      showToast('Update conflict');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('board:state', handleBoardState);
    socket.on('card:moved', handleCardMoved);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:rejected', handleCardRejected);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('board:state', handleBoardState);
      socket.off('card:moved', handleCardMoved);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:rejected', handleCardRejected);
      disconnectSocket();
    };
  }, [auth.accessToken, boardId, showToast]);

  function saveRollback(action, cardId) {
    if (!boardState) {
      return;
    }

    rollbackRef.current.set(rollbackKey(action, cardId), snapshotState(boardState));
  }

  function handleDragEnd(event) {
    if (!boardState) {
      return;
    }

    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'card') {
      return;
    }

    const cardId = activeData.cardId;
    const sourceColumnId = activeData.columnId;
    const target = resolveDropTarget(overData, boardState);
    if (!target) {
      return;
    }

    const { destinationColumnId } = target;
    const sourceColumn = boardState.columns.find((column) => column.id === sourceColumnId);
    if (!sourceColumn) {
      return;
    }

    const sourceIndex = sourceColumn.cards.findIndex((card) => card.id === cardId);
    if (sourceIndex === -1) {
      return;
    }

    let destinationIndex = target.destinationIndex;
    if (sourceColumnId === destinationColumnId && destinationIndex > sourceIndex) {
      destinationIndex -= 1;
    }

    if (sourceColumnId === destinationColumnId && destinationIndex === sourceIndex) {
      return;
    }

    const card = findCardById(boardState, cardId);
    if (!card) {
      return;
    }

    saveRollback('move', cardId);

    setBoardState((previous) =>
      applyCardMoveOptimistic(previous, {
        cardId,
        sourceColumnId,
        destinationColumnId,
        destinationIndex,
        incrementVersion: true
      })
    );

    const socket = connectSocket(auth.accessToken);
    socket.emit('card:move', {
      boardId,
      cardId,
      sourceColumnId,
      destinationColumnId,
      destinationIndex,
      clientVersion: card.version
    });
  }

  function handleCreateCard(column) {
    const title = window.prompt('Card title');
    if (!title || !title.trim()) {
      return;
    }

    const tempId = `temp-${Date.now()}`;

    setBoardState((previous) =>
      applyCardCreatedOptimistic(previous, {
        columnId: column.id,
        card: {
          id: tempId,
          boardId,
          columnId: column.id,
          title: title.trim(),
          description: '',
          position: column.cards.length,
          version: 0
        }
      })
    );

    const socket = connectSocket(auth.accessToken);
    socket.emit('card:create', {
      boardId,
      columnId: column.id,
      title: title.trim(),
      description: '',
      clientTempId: tempId
    });
  }

  function handleSaveCard(card, updates) {
    if (!updates.title?.trim()) {
      showToast('Title is required');
      return;
    }

    const liveCard = findCardById(boardState, card.id);
    if (!liveCard) {
      return;
    }

    saveRollback('update', card.id);

    setBoardState((previous) =>
      applyCardUpdateOptimistic(previous, {
        cardId: card.id,
        title: updates.title.trim(),
        description: updates.description,
        incrementVersion: true
      })
    );

    const socket = connectSocket(auth.accessToken);
    socket.emit('card:update', {
      boardId,
      cardId: card.id,
      title: updates.title.trim(),
      description: updates.description,
      clientVersion: liveCard.version
    });

    setSelectedCard(null);
  }

  function handleDeleteCard(card) {
    const liveCard = findCardById(boardState, card.id);
    if (!liveCard) {
      return;
    }

    saveRollback('delete', card.id);

    setBoardState((previous) =>
      applyCardDeleteOptimistic(previous, {
        cardId: card.id,
        columnId: card.columnId
      })
    );

    const socket = connectSocket(auth.accessToken);
    socket.emit('card:delete', {
      boardId,
      cardId: card.id,
      clientVersion: liveCard.version
    });

    setSelectedCard(null);
  }

  async function handleLogout() {
    try {
      if (auth.refreshToken) {
        await logout({ refreshToken: auth.refreshToken });
      }
    } catch (error) {
      // ignore logout errors to avoid blocking local sign-out
    }

    onAuthChange(null);
  }

  if (loading) {
    return <main className="p-6 text-sm text-slate-600">Loading board...</main>;
  }

  if (!boardState) {
    return (
      <main className="p-6 text-sm text-slate-600">
        Could not load board.
        <button type="button" className="ml-2 text-blue-600" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <Toast message={message} />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{boardState.board.title}</h1>
          <p className="text-sm text-slate-500">Realtime collaborative board</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isConnected ? 'Live connected' : 'Reconnecting...'}
          </span>
          <button
            type="button"
            onClick={onSwitchWorkspace}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Workspaces
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Logout
          </button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex min-h-[550px] gap-4 overflow-x-auto pb-3">
          {boardState.columns.map((column) => (
            <Column key={column.id} column={column} onCreateCard={handleCreateCard} onEditCard={setSelectedCard} />
          ))}
        </div>
      </DndContext>

      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} onSave={handleSaveCard} onDelete={handleDeleteCard} />
    </main>
  );
}
