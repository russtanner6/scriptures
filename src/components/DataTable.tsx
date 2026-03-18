"use client";

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  mono?: boolean;
}

export interface TableRow {
  [key: string]: string | number;
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
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.92rem",
      }}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                textAlign: col.align || "left",
                padding: "10px 14px",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-secondary)",
                fontWeight: 600,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  color: col.mono ? "var(--text)" : "var(--text-secondary)",
                  fontWeight: col.mono ? 600 : 400,
                  fontVariantNumeric: col.mono ? "tabular-nums" : undefined,
                  textAlign: col.align || "left",
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
  );
}
