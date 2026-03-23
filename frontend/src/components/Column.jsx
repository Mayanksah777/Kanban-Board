import { useDroppable } from '@dnd-kit/core';
import CardItem from './CardItem';
import DropSlot from './DropSlot';

export default function Column({ column, onCreateCard, onEditCard }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id
    }
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full min-h-[540px] w-80 shrink-0 flex-col rounded-xl border p-4 transition ${
        isOver ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white/90'
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{column.title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{column.cards.length}</span>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <DropSlot columnId={column.id} index={0} />
        {column.cards.map((card, index) => (
          <div key={card.id} className="space-y-1">
            <CardItem card={card} onEdit={onEditCard} />
            <DropSlot columnId={column.id} index={index + 1} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onCreateCard(column)}
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
      >
        + Add card
      </button>
    </section>
  );
}
