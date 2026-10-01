"use client";

import React from "react";

import { Skeleton } from "@geiger/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@geiger/ui/table";
import { cn } from "@/lib/utils";

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// Cell widths cycle so a loading table reads as varied content rather than a
// block of identical bars.
const BAR_WIDTHS = ["w-32", "w-20", "w-24", "w-16", "w-28"];

// Loading twin of DataTable: same chrome and the real column headers, so the
// header row never shifts when rows land. Takes the very `columns` array the
// screen already passes to DataTable, which keeps the two in sync for free.
export function TableSkeleton({ columns, rows = 6, className }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface-subtle",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("px-4", ALIGN_CLASS[col.align], col.headClassName)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row} className="border-border hover:bg-transparent">
              {columns.map((col, i) => (
                <TableCell
                  key={col.key}
                  className={cn("px-4 py-4", ALIGN_CLASS[col.align])}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1.5",
                      col.align === "right" && "items-end",
                      col.align === "center" && "items-center",
                    )}
                  >
                    <Skeleton
                      className={cn("h-4", BAR_WIDTHS[i % BAR_WIDTHS.length])}
                    />
                    {/* The identity column renders a title over a meta line. */}
                    {i === 0 ? <Skeleton className="h-3 w-40" /> : null}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TableSkeleton;
