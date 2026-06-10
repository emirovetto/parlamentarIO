"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reordenarPuntos, eliminarPunto } from "../actions";

type Punto = {
  id: string;
  orden: number;
  titulo: string;
  tratado: boolean;
  expedienteNro?: string | null;
};

function PuntoItem({ punto, editable, onEliminar }: { punto: Punto; editable: boolean; onEliminar: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: punto.id,
    disabled: !editable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 ${
        isDragging ? "border-blue-400 shadow-lg" : "border-slate-200"
      }`}
    >
      {editable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar punto: ${punto.titulo}`}
          className="cursor-grab touch-none text-slate-400 hover:text-slate-600"
        >
          ⠿
        </button>
      ) : null}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {punto.orden}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{punto.titulo}</p>
        {punto.expedienteNro ? <p className="text-xs text-slate-500">Expte. {punto.expedienteNro}</p> : null}
      </div>
      {punto.tratado ? (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Tratado</span>
      ) : null}
      {editable ? (
        <button
          type="button"
          onClick={() => onEliminar(punto.id)}
          className="text-xs text-red-600 underline"
          aria-label={`Eliminar punto: ${punto.titulo}`}
        >
          Quitar
        </button>
      ) : null}
    </li>
  );
}

export function OrdenDelDiaEditor({
  sesionId,
  puntos: puntosIniciales,
  editable,
}: {
  sesionId: string;
  puntos: Punto[];
  editable: boolean;
}) {
  const [puntos, setPuntos] = useState(puntosIniciales);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = puntos.findIndex((p) => p.id === active.id);
    const newIndex = puntos.findIndex((p) => p.id === over.id);
    const reordenados = arrayMove(puntos, oldIndex, newIndex).map((p, i) => ({ ...p, orden: i + 1 }));
    setPuntos(reordenados);
    startTransition(() => {
      reordenarPuntos(sesionId, reordenados.map((p) => p.id));
    });
  }

  function handleEliminar(puntoId: string) {
    setPuntos((prev) => prev.filter((p) => p.id !== puntoId).map((p, i) => ({ ...p, orden: i + 1 })));
    startTransition(() => {
      eliminarPunto(sesionId, puntoId);
    });
  }

  if (puntos.length === 0) {
    return <p className="px-1 py-4 text-sm text-slate-500">Sin puntos en el Orden del Día.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={puntos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {puntos.map((p) => (
            <PuntoItem key={p.id} punto={p} editable={editable} onEliminar={handleEliminar} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
