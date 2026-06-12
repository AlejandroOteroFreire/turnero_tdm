'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountStatus } from '@/types'

interface Profile {
  full_name: string
  frequency: number
  medical_cert: boolean
  joined_at: string
}
interface Jugador {
  id: string
  player_number: number
  display_name: string
  email: string
  phone: string | null
  dni: string | null
  status: AccountStatus
  roles: string[]
  wa_opt_in: boolean
  player_profiles: Profile | null
}
interface Props {
  jugadores: Jugador[]
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; dot: string; text: string }> = {
  active:          { label: 'Activo',        dot: 'bg-green-500',  text: 'text-green-400'  },
  pending:         { label: 'Pendiente',     dot: 'bg-blue-500',   text: 'text-blue-400'   },
  pre_registered:  { label: 'Sin cuenta',    dot: 'bg-gray-500',   text: 'text-gray-400'   },
  suspended:       { label: 'Suspendido',    dot: 'bg-amber-500',  text: 'text-amber-400'  },
  disabled:        { label: 'Deshabilitado', dot: 'bg-red-500',    text: 'text-red-400'    },
}

function freqBadge(f: number) {
  const label = f === 1 ? '1 clase/semana'
              : f === 2 ? '2 clases/semana'
              : f === 3 ? '3 clases/semana'
              : '4 o más clases/semana'
  return (
    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-club-green/15 text-club-green border border-club-green/30">
      {label}
    </span>
  )
}

const PAGE_SIZE = 20
const ALPHABET  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function JugadoresClient({ jugadores }: Props) {
  const router = useRouter()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all')
  const [letterFilter, setLetterFilter] = useState<string | null>(null)
  const [page,         setPage]         = useState(1)

  const filtered = jugadores.filter(j => {
    const matchSearch = !search ||
      j.display_name.toLowerCase().includes(search.toLowerCase()) ||
      j.email.toLowerCase().includes(search.toLowerCase()) ||
      (j.dni ?? '').includes(search)
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    const matchLetter = !letterFilter ||
      j.display_name.toUpperCase().startsWith(letterFilter) ||
      (j.player_profiles?.full_name ?? '').toUpperCase().startsWith(letterFilter)
    return matchSearch && matchStatus && matchLetter
  })

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pageItems   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function setFilter(fn: () => void) {
    fn()
    setPage(1)
  }

  function exportCsv() {
    const rows = filtered.map(j => [
      j.display_name, j.email, j.dni ?? '', j.phone ?? '',
      STATUS_CONFIG[j.status]?.label ?? j.status,
      j.player_profiles?.frequency ?? '',
    ].join(','))
    const csv  = `Nombre,Email,DNI,Teléfono,Estado,Frecuencia/semana\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `jugadores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Jugadores</h1>
        <button onClick={exportCsv} className="btn-secondary text-xs">Exportar CSV</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          className="input max-w-xs text-sm py-1.5"
          placeholder="Buscar nombre, email, DNI…"
          value={search}
          onChange={e => setFilter(() => setSearch(e.target.value))}
        />
        <select
          className="input w-auto text-sm py-1.5"
          value={statusFilter}
          onChange={e => setFilter(() => setStatusFilter(e.target.value as AccountStatus | 'all'))}
        >
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_CONFIG) as AccountStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Filtro por letra */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilter(() => setLetterFilter(null))}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            !letterFilter ? 'bg-club-green text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Todos
        </button>
        {ALPHABET.map(letter => (
          <button
            key={letter}
            onClick={() => setFilter(() => setLetterFilter(letterFilter === letter ? null : letter))}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              letterFilter === letter ? 'bg-club-green text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length} jugadores
        {filtered.length > PAGE_SIZE && ` · página ${safePage} de ${totalPages}`}
      </p>

      {/* Listado */}
      <div className="space-y-1">
        {pageItems.map(j => {
          const cfg = STATUS_CONFIG[j.status]
          return (
            <button
              key={j.id}
              onClick={() => router.push(`/jugadores/${j.player_number}`)}
              className="w-full card flex items-center justify-between gap-3 text-left hover:border-club-green/40 transition-colors"
              title={cfg?.label ?? j.status}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg?.dot ?? 'bg-gray-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{j.display_name}</p>
                  <p className="text-xs text-gray-500 truncate">{j.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-medium ${cfg?.text ?? 'text-gray-400'}`}>
                  {cfg?.label ?? j.status}
                </span>
                {j.player_profiles && freqBadge(j.player_profiles.frequency)}
              </div>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="card text-center py-8 text-gray-500 text-sm">
            Sin resultados para la búsqueda.
          </div>
        )}
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm text-gray-400">
            Página {safePage} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
