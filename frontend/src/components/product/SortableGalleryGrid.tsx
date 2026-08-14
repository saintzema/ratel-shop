"use client";

import React from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag-to-reorder gallery that actually WRAPS.
 *
 * The previous implementation used framer-motion's <Reorder>, which only
 * compares position along a single axis — so the gallery had to be one
 * horizontally-scrolling row or dragging broke. On a phone that meant you
 * could only ever see 3–4 slots and could never drag an image from the end
 * of the row to the front.
 *
 * dnd-kit's rectSortingStrategy is rect-based rather than axis-based, so a
 * wrapping grid reorders correctly in both directions. TouchSensor carries an
 * activation delay so a normal tap still opens the file picker and only a
 * deliberate press-and-hold starts a drag — without it, every tap on a mobile
 * slot would be swallowed as a drag gesture.
 */

function SortableSlot({
    id,
    children,
    onRemove,
    showRemove,
}: {
    id: string;
    children: React.ReactNode;
    onRemove?: () => void;
    showRemove?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn("relative touch-none", isDragging && "z-50 opacity-80 scale-105")}
            {...attributes}
            {...listeners}
        >
            {children}
            {showRemove && (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                    }}
                    className="absolute -top-1 -right-1 h-6 w-6 bg-white border border-gray-200 text-gray-500 hover:text-rose-500 rounded-full shadow-md flex items-center justify-center z-10"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

export function SortableGalleryGrid({
    keys,
    onReorder,
    renderSlot,
    onRemove,
    allowRemove,
    trailing,
}: {
    /** Stable unique key per slot, parallel to the caller's data array. */
    keys: string[];
    /** Receives the reordered keys; caller maps them back onto its own array. */
    onReorder: (nextKeys: string[]) => void;
    renderSlot: (index: number) => React.ReactNode;
    onRemove?: (index: number) => void;
    allowRemove?: boolean;
    /** e.g. the "+ add another" button, rendered as a non-sortable grid cell. */
    trailing?: React.ReactNode;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        // Press-and-hold to drag on touch, so a plain tap still opens the picker.
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = keys.indexOf(String(active.id));
        const newIndex = keys.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onReorder(arrayMove(keys, oldIndex, newIndex));
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={keys} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {keys.map((key, i) => (
                        <SortableSlot
                            key={key}
                            id={key}
                            showRemove={allowRemove}
                            onRemove={() => onRemove?.(i)}
                        >
                            {renderSlot(i)}
                        </SortableSlot>
                    ))}
                    {trailing}
                </div>
            </SortableContext>
        </DndContext>
    );
}
