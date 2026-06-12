"use client";

import { Pencil, Trash2 } from "lucide-react";

export function RowActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Delete ${label}?`)) onDelete();
        }}
        aria-label={`Delete ${label}`}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
