"use client";

import { useState, useMemo } from "react";

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  mono?: boolean;
  sortable?: boolean; // default true
}

export interface TableRow {
  [key: string]: string | number;
}

type SortDir = "asc" | "desc";

function SortIcon({ active, direction }: { active: boolean; direction: SortDir }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        marginLeft: "4px",
        verticalAlign: "middle",
        lineHeight: 0,
        gap: "1px",
      }}
    >
      <span
        style={{
          fontSize: "0.5rem",
          color: active && direction === "asc" ? "var(--text)" : "var(--text-muted)",
          opacity: active && direction === "asc" ? 1 : 0.35,
          transition: "all 0.15s",
        }}
      >
        ▲
      </span>
      <span
        style={{
          fontSize: "0.5rem",
          color: active && direction === "desc" ? "var(--text)" : "var(--text-muted)",
          opacity: active && direction === "desc" ? 1 : 0.35,
          transition: "all 0.15s",
        }}
      >
        ▼
      </span>
    </span>
  );
}

export default function DataTable({
  columns,
  rows,
  totalRow,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  totalRow?: TableRow;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default: numeric columns sort desc (highest first), text columns sort asc (A-Z)
      const sampleValue = rows[0]?.[key];
      setSortDir(typeof sampleValue === "number" ? "desc" : "asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="table-scroll-wrapper">
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.92rem",
          minWidth: "320px",
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable !== false;
              const isActive = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={isSortable ? () => handleSort(col.key) : undefined}
                  style={{
                    textAlign: col.align || "left",
                    padding: "10px 14px",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: isActive ? "var(--text)" : "var(--text)",
                    fontWeight: 700,
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                    cursor: isSortable ? "pointer" : "default",
                    userSelect: "none",
                    transition: "color 0.15s",
                  }}
                >
                  {col.label}
                  {isSortable && <SortIcon active={isActive} direction={isActive ? sortDir : "desc"} />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    color: col.mono ? "var(--text)" : "rgba(255,255,255,0.75)",
                    fontWeight: col.mono ? 600 : 400,
                    fontVariantNumeric: col.mono ? "tabular-nums" : undefined,
                    textAlign: col.align || "left",
                    whiteSpace: col.mono ? "nowrap" : undefined,
                  }}
                >
                  {typeof row[col.key] === "number"
                    ? (row[col.key] as number).toLocaleString()
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {totalRow && (
            <tr>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "10px 14px",
                    color: "var(--text)",
                    fontWeight: 700,
                    borderTop: "1px solid var(--border-accent)",
                    fontVariantNumeric: col.mono ? "tabular-nums" : undefined,
                    textAlign: col.align || "left",
                  }}
                >
                  {typeof totalRow[col.key] === "number"
                    ? (totalRow[col.key] as number).toLocaleString()
                    : totalRow[col.key]}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
