import { columnLetter } from "../../domain/partLearningTrace.js";

const value = (v) => (v == null || v === "" ? "—" : String(v));

// Shared sheet renderer for the full viewer and bounded inline excerpts.
export default function SourceEvidenceSheet({
  entries,
  columns,
  usedColumns,
  onCell,
  compact = false,
}) {
  return (
    <div className="vi-source-preview-table-wrap">
      <table className="vi-source-preview-table">
        <thead>
          <tr>
            <th>Fila / registro</th>
            {columns.map((column, index) => {
              const coordinate = entries[0]?.evidence?.cells.find(
                (c) => c.column === column,
              )?.letter;
              return (
                <th
                  className={usedColumns.has(column) ? "is-used" : ""}
                  key={column}
                >
                  <small>
                    {coordinate ||
                      (!compact
                        ? columnLetter(
                            index + (entries[0]?.origin.firstColumn || 0),
                          )
                        : "")}
                  </small>
                  {column}
                  {usedColumns.has(column) && <b> USADO</b>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              className={entry.evidence ? "is-evidence" : ""}
              key={entry.sourceIndex}
            >
              <th
                title={
                  entry.origin.rowNumber
                    ? "Fila original del archivo"
                    : "Posición de la colección; fila original no disponible"
                }
              >
                {entry.origin.rowNumber ?? `Registro ${entry.sourceIndex + 1}`}
                {!compact && (
                  <small>
                    {entry.origin.fileName}
                    <br />
                    {entry.origin.sheetName || "Sin hoja registrada"}
                  </small>
                )}
              </th>
              {columns.map((column) => {
                const evidence = entry.evidence?.cells.find(
                  (cell) => cell.column === column,
                );
                return (
                  <td key={column} className={evidence ? "is-used" : ""}>
                    {evidence ? (
                      <button
                        type="button"
                        title={evidence.reason}
                        onClick={() =>
                          onCell({
                            ...evidence,
                            reason: `${entry.evidence.note}. ${evidence.reason}`,
                          })
                        }
                      >
                        {value(entry.row[column])}
                      </button>
                    ) : (
                      value(entry.row[column])
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
