import * as React from "react";
import {
  Cell,
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "./lib/utils";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  visits: number;
  status: string;
  progress: number;
};

const defaultData: Person[] = [
  {
    firstName: "tanner",
    lastName: "linsley",
    age: 24,
    visits: 100,
    status: "In Relationship",
    progress: 50,
  },
  {
    firstName: "tandy",
    lastName: "miller",
    age: 40,
    visits: 40,
    status: "Single",
    progress: 80,
  },
  {
    firstName: "joe",
    lastName: "dirte",
    age: 45,
    visits: 20,
    status: "Complicated",
    progress: 10,
  },
];

const columnHelper = createColumnHelper<Person>();

const columns = [
  columnHelper.accessor("firstName", {
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor((row) => row.lastName, {
    id: "lastName",
    cell: (info) => <i>{info.getValue()}</i>,
    header: () => <span>Last Name</span>,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("age", {
    header: () => "Age",
    cell: (info) => info.renderValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("visits", {
    header: () => <span>Visits</span>,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("progress", {
    header: "Profile Progress",
    footer: (info) => info.column.id,
  }),
];

export default function App() {
  const [data, setData] = React.useState(() => [...defaultData]);
  const [dragging, setDragging] = React.useState(false);
  const [dragStartCell, setDragStartCell] = React.useState<Cell<
    Person,
    unknown
  > | null>(null);
  const [dragEndCell, setDragEndCell] = React.useState<Cell<
    Person,
    unknown
  > | null>(null);
  const [previewCells, setPreviewCells] = React.useState<
    { row: Row<Person>; column: Column<Person, unknown> }[]
  >([]);
  const [selectedCells, setSelectedCells] = React.useState<
    { row: Row<Person>; column: Column<Person, unknown> }[]
  >([]);
  const [autoFillCell, setAutofillCell] = React.useState<{
    row: Row<Person>;
    column: Column<Person, unknown>;
  } | null>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleMouseDown = (
    _: React.MouseEvent<HTMLDivElement, MouseEvent>,
    cellInfo: Cell<Person, unknown>
  ) => {
    setDragging(true);
    setDragStartCell(cellInfo);
  };

  const setSelectedCellsFromPreview = React.useCallback(
    (cells: { row: Row<Person>; column: Column<Person, unknown> }[]) => {
      const selectedCells = cells.map((cell) => {
        const row = cell.row;
        const column = cell.column;
        return { row, column };
      });
      setSelectedCells(selectedCells);
    },
    [setSelectedCells]
  );

  const performAutofill = React.useCallback(
    (startCell: Cell<Person, unknown>, endCell: Cell<Person, unknown>) => {
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
      setSelectedCellsFromPreview(previewCells); // Set the selection to the previous preview cells
    },
    [data, setData, table, setSelectedCellsFromPreview, previewCells]
  );

  const updatePreviewCells = (
    startCell: Cell<Person, unknown>,
    endCell: Cell<Person, unknown>
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
      row: Row<Person>;
      column: Column<Person, unknown>;
    }[] = [];
    for (let i = minRowIndex; i <= maxRowIndex; i++) {
      for (let j = minColumnIndex; j <= maxColumnIndex; j++) {
        const row = table.getRowModel().rows[i];
        const column = allColumns[j];
        newPreviewCells.push({ row, column });
      }
    }
    setPreviewCells(newPreviewCells);
  };
  const handleMouseMove = (
    e: React.MouseEvent<HTMLTableCellElement>,
    cellInfo: Cell<Person, unknown>
  ) => {
    if (dragging && dragStartCell && cellInfo) {
      const cellRect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - cellRect.left;
      const mouseY = e.clientY - cellRect.top;

      const isOverHalfWidth = mouseX > cellRect.width / 2;
      const isOverHalfHeight = mouseY > cellRect.height / 2;

      const startRowIndex = dragStartCell.row.index;
      const startColumnIndex = table
        .getAllColumns()
        .findIndex((col) => col.id === dragStartCell.column.id);
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
        setDragEndCell(cellInfo);
        updatePreviewCells(dragStartCell, cellInfo);
      }
    }
  };

  React.useEffect(() => {
    const handleMouseUp = () => {
      if (dragging) {
        setDragging(false);
        if (dragStartCell && dragEndCell) {
          performAutofill(dragStartCell, dragEndCell);
        }
        setPreviewCells([]);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragStartCell, dragEndCell, performAutofill]);

  const isAutofillCell = (cellInfo: Cell<Person, unknown>) => {
    return (
      autoFillCell &&
      cellInfo.row.index === autoFillCell.row.index &&
      cellInfo.column.id === autoFillCell.column.id
    );
  };

  const isEdgeCell = (
    cellInfo: Cell<Person, unknown>,
    cells: { row: Row<Person>; column: Column<Person, unknown> }[]
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

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const previewEdges = isEdgeCell(cell, previewCells);
                const selectedEdges = isEdgeCell(cell, selectedCells);

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "relative select-none",
                      previewEdges.isTopEdge
                        ? "border-t-2 border-[#107c4180]"
                        : "",
                      previewEdges.isBottomEdge
                        ? "border-b-2 border-[#107c4180]"
                        : "",
                      previewEdges.isLeftEdge
                        ? "border-l-2 border-[#107c4180]"
                        : "",
                      previewEdges.isRightEdge
                        ? "border-r-2 border-[#107c4180]"
                        : "",
                      selectedEdges.isTopEdge
                        ? "border-t-2 border-gray-500 bg-gray-100"
                        : "",
                      selectedEdges.isBottomEdge
                        ? "border-b-2 border-gray-500 bg-gray-100"
                        : "",
                      selectedEdges.isLeftEdge
                        ? "border-l-2 border-gray-500 bg-gray-100"
                        : "",
                      selectedEdges.isRightEdge
                        ? "border-r-2 border-gray-500 bg-gray-100"
                        : "",
                      isAutofillCell(cell)
                        ? "border-2 border-[#107c41] bg-transparent"
                        : ""
                    )}
                    onMouseMove={(e) => handleMouseMove(e, cell)}
                    onClick={() => {
                      setAutofillCell(cell);
                      setSelectedCells([]);
                      setPreviewCells([]);
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    {isAutofillCell(cell) && (
                      <div
                        className="absolute z-10 bottom-[-5px] right-[-5px] w-2.5 h-2.5 border-2 border-[#107c41] bg-white cursor-pointer"
                        onMouseDown={(e) => handleMouseDown(e, cell)}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          {table.getFooterGroups().map((footerGroup) => (
            <TableRow key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <TableCell key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.footer,
                        header.getContext()
                      )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableFooter>
      </Table>
    </div>
  );
}
