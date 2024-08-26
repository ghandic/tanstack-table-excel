import * as React from "react";
import { Cell, flexRender } from "@tanstack/react-table";
import { TableCell } from "@/components/ui/table";
import { cn } from "../lib/utils";
import { useDragHandle } from "../use-drag-handle";

type DraggableTableCellProps<T> = {
  cell: Cell<T, unknown>;
  dragHandle: ReturnType<typeof useDragHandle<T>>;
  asChild?: boolean;
  children?: React.ReactElement;
};

export function DraggableTableCell<T>({
  cell,
  dragHandle,
  asChild = false,
  children,
}: DraggableTableCellProps<T>) {
  const borderClass = dragHandle.getCellBorderClass(cell);
  const eventHandlers = {
    onMouseMove: (e: React.MouseEvent<HTMLTableCellElement>) =>
      dragHandle.handleMouseMove(e, cell),
    onTouchMove: (e: React.TouchEvent<HTMLTableCellElement>) =>
      dragHandle.handleMouseMove(e, cell),
    onClick: () => {
      dragHandle.setAutofillCell(cell);
      dragHandle.setSelectedCells([]);
      dragHandle.setPreviewCells([]);
    },
  };

  const dragHandleDiv = dragHandle.isAutofillCell(cell) && (
    <div
      className="absolute z-10 bottom-[-5px] right-[-5px] w-2.5 h-2.5 border-2 border-[#107c41] bg-white cursor-cell"
      onMouseDown={(e) => dragHandle.handleMouseDown(e, cell)}
      onTouchStart={(e) => dragHandle.handleMouseDown(e, cell)}
    />
  );

  if (asChild && children) {
    return React.cloneElement(children, {
      ...eventHandlers,
      className: cn(
        children.props.className,
        "relative select-none",
        borderClass,
        dragHandle.isAutofillCell(cell)
          ? "border-2 border-[#107c41] bg-transparent"
          : ""
      ),
      children: (
        <>
          {children.props.children}
          {dragHandleDiv}
        </>
      ),
    });
  }

  return (
    <TableCell
      key={cell.id}
      className={cn(
        "relative select-none",
        borderClass,
        dragHandle.isAutofillCell(cell)
          ? "border-2 border-[#107c41] bg-transparent"
          : ""
      )}
      {...eventHandlers}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
      {dragHandleDiv}
    </TableCell>
  );
}
