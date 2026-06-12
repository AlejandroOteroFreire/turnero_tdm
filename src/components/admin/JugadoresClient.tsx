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
  player_number: number | null
  display_name: string
  email: string
  phone: string | null
  dni: string | null
  status: AccountStatus | 'manual'
  roles: string[]
  wa_opt_in: boolean
  player_profiles: Profile | null
  is_manual?: boolean
}
interface TrainingSlot {
  id: string
  label: string | null
  day_of_week: string
  start_time: string
  end_time: string
}
interface Props {
  jugadores: Jugador[]
  slots: TrainingSlot[]
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active:          { label: 'Activo',        dot: 'bg-green-500',  text: 'text-green-400'  },
  pending:         { label: 'Pendiente',     dot: 'bg-blue-500',   text: 'text-blue-400'   },
  pre_registered:  { label: 'Sin cuenta',    dot: 'bg-gray-500',   text: 'text-gray-400'   },
  suspended:       { label: 'Suspendido',    dot: 'bg-amber-500',  text: 'text-amber-400'  },
  disabled:        { label: 'Deshabilitado', dot: 'bg-red-500',    text: 'text-red-400'    },
}

const DAYS_ES: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom',
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

const EMPTY_FORM = {
  dni: '', first_name: '', last_name: '', nickname: '',
  phone: '', email: '', slot_ids: [] as string[],
}

export function JugadoresClient({ jugadores, slots }: Props) {
  const router = useRouter()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all')
  const [letterFilter, setLetterFilter] = useState<string | null>(null)
  const [page,         setPage]         = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

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

  function setFilter(fn: () => void) { fn(); setPage(1) }

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

  function toggleSlot(id: string) {
    setForm(f => ({
      ...f,
      slot_ids: f.slot_ids.includes(id)
        ? f.slot_ids.filter(s => s !== id)
        : [...f.slot_ids, id],
    }))
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/admin/player-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setImportResult({ imported: 0, skipped: 0, errors: [data.error ?? 'Error desconocido'] }); return }
      setImportResult(data)
      router.refresh()
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ['Error de conexión'] })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.dni || !form.first_name || !form.last_name) {
      setFormError('DNI, nombre y apellido son requeridos.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/player-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Error al crear jugador'); return }
      setShowForm(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Jugadores</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Nuevo jugador</button>
          <label className={`btn-secondary text-xs cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? 'Importando…' : 'Importar CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={exportCsv} className="btn-secondary text-xs">Exportar CSV</button>
        </div>
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
              onClick={() => j.player_number ? router.push(`/jugadores/${j.player_number}`) : undefined}
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
                {j.is_manual && (
                  <span className="text-xs text-purple-400 bg-purple-900/30 border border-purple-700/30 px-1.5 py-0.5 rounded">
                    sin cuenta
                  </span>
                )}
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30">←</button>
          <span className="text-sm text-gray-400">Página {safePage} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30">→</button>
        </div>
      )}

      {/* Modal resultado import */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card bg-gray-900 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Resultado del import</h2>
              <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-green-400">✓ {importResult.imported} jugadores importados</p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-amber-400">⚠ {importResult.skipped} omitidos (DNI ya existente)</p>
              )}
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-red-400">✕ {importResult.errors.length} errores:</p>
                  <ul className="text-xs text-red-300 space-y-0.5 max-h-40 overflow-y-auto">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="btn-primary w-full">Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal nuevo jugador */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4">
          <div className="card bg-gray-900 w-full max-w-lg space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Nuevo jugador</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input className="input" value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">DNI *</label>
                  <input className="input" value={form.dni}
                    onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Apodo</label>
                  <input className="input" value={form.nickname}
                    onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" value={form.phone} placeholder="+549..."
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              {/* Selección de turnos */}
              <div>
                <label className="label mb-2 block">Turnos asignados</label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {slots.map(slot => {
                    const selected = form.slot_ids.includes(slot.id)
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => toggleSlot(slot.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                          selected
                            ? 'bg-club-green/20 border-club-green/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-medium">{DAYS_ES[slot.day_of_week] ?? slot.day_of_week}</span>
                        {' '}
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        {slot.label ? ` · ${slot.label}` : ''}
                        {selected && <span className="float-right text-club-green">✓</span>}
                      </button>
                    )
                  })}
                </div>
                {form.slot_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{form.slot_ids.length} turno(s) seleccionado(s)</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando…' : 'Crear jugador'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                  className="btn-ghost px-4">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
