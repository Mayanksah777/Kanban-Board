import { useDroppable } from '@dnd-kit/core';

export default function DropSlot({ columnId, index }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${columnId}-${index}`,
    data: {
      type: 'slot',
      columnId,
      index
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-2 rounded transition ${isOver ? 'bg-blue-400/80' : 'bg-transparent'}`}
    />
  );
}
