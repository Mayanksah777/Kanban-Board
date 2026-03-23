import { useDraggable } from '@dnd-kit/core';

export default function CardItem({ card, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      cardId: card.id,
      columnId: card.columnId
    }
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
        isDragging ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onEdit(card)}
          className="flex-1 text-left"
        >
          <p className="text-sm font-semibold text-slate-800">{card.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description || 'No description'}</p>
          <p className="mt-2 text-[11px] text-slate-400">v{card.version}</p>
        </button>

        <button
          type="button"
          aria-label="Drag card"
          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
      </div>
    </div>
  );
}
