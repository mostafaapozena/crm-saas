'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null

  const { page, pages, total, limit } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-slate-500">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={14} className="inline-block" /> Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = i + 1
          return (
            <button key={p} onClick={() => onPage(p)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${p === page ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next <ChevronRight size={14} className="inline-block" />
        </button>
      </div>
    </div>
  )
}
