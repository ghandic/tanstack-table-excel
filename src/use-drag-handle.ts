import { useState, useCallback, useEffect } from "react";
import { Cell, Column, Row, Table } from "@tanstack/react-table";
import { cn } from "./lib/utils";

type DragAndDropState<T> = {
  dragging: boolean;
  dragStartCell: Cell<T, unknown> | null;
  dragEndCell: Cell<T, unknown> | null;
  previewCells: { row: Row<T>; column: Column<T, unknown> }[];
  selectedCells: { row: Row<T>; column: Column<T, unknown> }[];
  autoFillCell: { row: Row<T>; column: Column<T, unknown> } | null;
};

export function useDragHandle<T>(
  table: Table<T>,
  data: T[],
  setData: (data: T[]) => void
) {
  const [state, setState] = useState<DragAndDropState<T>>({
    dragging: false,
    dragStartCell: null,
    dragEndCell: null,
    previewCells: [],
    selectedCells: [],
    autoFillCell: null,
  });

  const handleMouseUp = () => {
    document.body.style.cursor = "";
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = (
    _:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
    cellInfo: Cell<T, unknown>
  ) => {
    setState((prevState) => ({
      ...prevState,
      dragging: true,
      dragStartCell: cellInfo,
    }));
    document.body.style.cursor = "cell";
    window.addEventListener("mouseup", handleMouseUp);
  };

  const setSelectedCellsFromPreview = useCallback(
    (cells: { row: Row<T>; column: Column<T, unknown> }[]) => {
      const selectedCells = cells.map((cell) => {
        const row = cell.row;
        const column = cell.column;
        return { row, column };
      });
      setState((prevState) => ({
        ...prevState,
        selectedCells,
      }));
    },
    []
  );

  const performAutofill = useCallback(
    (startCell: Cell<T, unknown>, endCell: Cell<T, unknown>) => {
      const startRowIndex = startCell.row.index;
      const endRowIndex = endCell.row.index;
      const allColumns = table.getAllColumns();
      const startColumnIndex = allColumns.findIndex(
        (col) => col.id === startCell.column.id
      );
      const endColumnIndex = allColumns.findIndex(
        (col) => col.id === endCell.column.id
      );

      const minRowIndex = Math.min(startRowIndex, endRowIndex);
      const maxRowIndex = Math.max(startRowIndex, endRowIndex);
      const minColumnIndex = Math.min(startColumnIndex, endColumnIndex);
      const maxColumnIndex = Math.max(startColumnIndex, endColumnIndex);

      const newData = [...data];
      const valueToFill = startCell.getValue();

      for (let i = minRowIndex; i <= maxRowIndex; i++) {
        for (let j = minColumnIndex; j <= maxColumnIndex; j++) {
          const columnId = allColumns[j].id;
          // @ts-expect-error - This is a hack to get around the fact that we can't use the column accessor directly
          newData[i][columnId] = valueToFill;
        }
      }

      setData(newData);
      setSelectedCellsFromPreview(state.previewCells); // Set the selection to the previous preview cells
    },
    [data, setData, table, setSelectedCellsFromPreview, state.previewCells]
  );

  const updatePreviewCells = (
    startCell: Cell<T, unknown>,
    endCell: Cell<T, unknown>
  ) => {
    const startRowIndex = startCell.row.index;
    const endRowIndex = endCell.row.index;
    const allColumns = table.getAllColumns();
    const startColumnIndex = allColumns.findIndex(
      (col) => col.id === startCell.column.id
    );
    const endColumnIndex = allColumns.findIndex(
      (col) => col.id === endCell.column.id
    );

    const minRowIndex = Math.min(startRowIndex, endRowIndex);
    const maxRowIndex = Math.max(startRowIndex, endRowIndex);
    const minColumnIndex = Math.min(startColumnIndex, endColumnIndex);
    const maxColumnIndex = Math.max(startColumnIndex, endColumnIndex);

    const newPreviewCells: {
      row: Row<T>;
      column: Column<T, unknown>;
    }[] = [];
    for (let i = minRowIndex; i <= maxRowIndex; i++) {
      for (let j = minColumnIndex; j <= maxColumnIndex; j++) {
        const row = table.getRowModel().rows[i];
        const column = allColumns[j];
        newPreviewCells.push({ row, column });
      }
    }
    setState((prevState) => ({
      ...prevState,
      previewCells: newPreviewCells,
    }));
  };

  const handleMouseMove = (
    e:
      | React.MouseEvent<HTMLTableCellElement>
      | React.TouchEvent<HTMLTableCellElement>,
    cellInfo: Cell<T, unknown>
  ) => {
    if (state.dragging && state.dragStartCell && cellInfo) {
      const cellRect = e.currentTarget.getBoundingClientRect();
      const mouseX =
        "touches" in e
          ? e.touches[0].clientX - cellRect.left
          : e.clientX - cellRect.left;
      const mouseY =
        "touches" in e
          ? e.touches[0].clientY - cellRect.top
          : e.clientY - cellRect.top;

      const isOverHalfWidth = mouseX > cellRect.width / 2;
      const isOverHalfHeight = mouseY > cellRect.height / 2;

      const startRowIndex = state.dragStartCell.row.index;
      const startColumnIndex = table
        .getAllColumns()
        .findIndex(
          (col) =>
            state.dragStartCell && col.id === state.dragStartCell.column.id
        );
      const currentRowIndex = cellInfo.row.index;
      const currentColumnIndex = table
        .getAllColumns()
        .findIndex((col) => col.id === cellInfo.column.id);

      const isVerticalMovement = currentRowIndex !== startRowIndex;
      const isHorizontalMovement = currentColumnIndex !== startColumnIndex;

      if (
        (isVerticalMovement && isOverHalfHeight) ||
        (isHorizontalMovement && isOverHalfWidth)
      ) {
        setState((prevState) => ({
          ...prevState,
          dragEndCell: cellInfo,
        }));
        updatePreviewCells(state.dragStartCell, cellInfo);
      }
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (state.dragging) {
        setState((prevState) => ({
          ...prevState,
          dragging: false,
        }));
        if (state.dragStartCell && state.dragEndCell) {
          performAutofill(state.dragStartCell, state.dragEndCell);
        }
        setState((prevState) => ({
          ...prevState,
          previewCells: [],
        }));
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [state.dragging, state.dragStartCell, state.dragEndCell, performAutofill]);

  const setSelectedCells = (
    cells: { row: Row<T>; column: Column<T, unknown> }[]
  ) => {
    setState((prevState) => ({
      ...prevState,
      selectedCells: cells,
    }));
  };

  const setPreviewCells = (
    cells: { row: Row<T>; column: Column<T, unknown> }[]
  ) => {
    setState((prevState) => ({
      ...prevState,
      previewCells: cells,
    }));
  };

  const isAutofillCell = (cellInfo: Cell<T, unknown>) => {
    return (
      state.autoFillCell &&
      cellInfo.row.index === state.autoFillCell.row.index &&
      cellInfo.column.id === state.autoFillCell.column.id
    );
  };

  const isEdgeCell = (
    cellInfo: Cell<T, unknown>,
    cells: { row: Row<T>; column: Column<T, unknown> }[]
  ) => {
    const rowIndex = cellInfo.row.index;
    const columnId = cellInfo.column.id;
    const allColumns = table.getAllColumns();
    const columnIndex = allColumns.findIndex((col) => col.id === columnId);
    const filteredCells = cells.filter(
      (cell) => cell.row.index === rowIndex && cell.column.id === columnId
    );

    const isTopEdge =
      filteredCells.length > 0 &&
      !cells.some(
        (cell) => cell.row.index === rowIndex - 1 && cell.column.id === columnId
      );
    const isBottomEdge =
      filteredCells.length > 0 &&
      !cells.some(
        (cell) => cell.row.index === rowIndex + 1 && cell.column.id === columnId
      );
    const isLeftEdge =
      filteredCells.length > 0 &&
      !cells.some(
        (cell) =>
          cell.row.index === rowIndex &&
          allColumns.findIndex((col) => col.id === cell.column.id) ===
            columnIndex - 1
      );
    const isRightEdge =
      filteredCells.length > 0 &&
      !cells.some(
        (cell) =>
          cell.row.index === rowIndex &&
          allColumns.findIndex((col) => col.id === cell.column.id) ===
            columnIndex + 1
      );

    return { isTopEdge, isBottomEdge, isLeftEdge, isRightEdge };
  };

  const getCellBorderClass = (
    cellInfo: Cell<T, unknown>,
    options = {
      previewCellBorderColor: "#107c4180",
      previewCellBorderWidth: 2,
      previewCellClassName: "",
      selectedCellBorderColor: "#9E9E9E",
      selectedCellBorderWidth: 2,
      selectedCellClassName: "bg-gray-100",
    }
  ) => {
    const previewEdges = isEdgeCell(cellInfo, state.previewCells);
    const selectedEdges = isEdgeCell(cellInfo, state.selectedCells);

    return cn(
      previewEdges.isTopEdge
        ? `border-t-${options.previewCellBorderWidth} border-[${options.previewCellBorderColor}] ${options.previewCellClassName}`
        : "",
      previewEdges.isBottomEdge
        ? `border-b-${options.previewCellBorderWidth} border-[${options.previewCellBorderColor}] ${options.previewCellClassName}`
        : "",
      previewEdges.isLeftEdge
        ? `border-l-${options.previewCellBorderWidth} border-[${options.previewCellBorderColor}] ${options.previewCellClassName}`
        : "",
      previewEdges.isRightEdge
        ? `border-r-${options.previewCellBorderWidth} border-[${options.previewCellBorderColor}] ${options.previewCellClassName}`
        : "",
      selectedEdges.isTopEdge
        ? `border-t-${options.selectedCellBorderWidth} border-[${options.selectedCellBorderColor}] ${options.selectedCellClassName}`
        : "",
      selectedEdges.isBottomEdge
        ? `border-b-${options.selectedCellBorderWidth} border-[${options.selectedCellBorderColor}] ${options.selectedCellClassName}`
        : "",
      selectedEdges.isLeftEdge
        ? `border-l-${options.selectedCellBorderWidth} border-[${options.selectedCellBorderColor}] ${options.selectedCellClassName}`
        : "",
      selectedEdges.isRightEdge
        ? `border-r-${options.selectedCellBorderWidth} border-[${options.selectedCellBorderColor}]  ${options.selectedCellClassName}`
        : ""
    );
  };

  return {
    state,
    isAutofillCell,
    isEdgeCell,
    getCellBorderClass,
    setSelectedCells,
    setPreviewCells,
    handleMouseDown,
    handleMouseMove,
    setAutofillCell: (cell: Cell<T, unknown>) => {
      setState((prevState) => ({
        ...prevState,
        autoFillCell: cell,
        selectedCells: [],
        previewCells: [],
      }));
    },
  };
}
