interface PaginacionProps {
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
}

// Pie de los listados paginados: "21–40 de 135" y Anterior / Siguiente.
export function Paginacion({ total, page, pageSize, onPage }: PaginacionProps) {
  if (total === 0) return null;
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span>
        {desde}–{hasta} de {total}
        {paginas > 1 && ` · Página ${page} de ${paginas}`}
      </span>
      <div className="pagination-controls">
        <button className="btn secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <button className="btn secondary btn-sm" disabled={page >= paginas} onClick={() => onPage(page + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
