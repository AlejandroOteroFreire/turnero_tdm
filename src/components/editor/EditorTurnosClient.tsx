'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_LABELS } from '@/types'
import type { TrainingSlot, SlotDay } from '@/types'
import { SlotConfigPanel } from './SlotConfigPanel'

interface Player     { id: string; display_name: string; roles: string[] }
interface Assignment { id: string; slot_id: string; player_id: string; valid_from: string; valid_until: string | null }
interface Props {
  slots:       TrainingSlot[]
  players:     Player[]
  assignments: Assignment[]
  today:       string
}

const DAY_ORDER: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function fmtYesterday(today: string) {
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export function EditorTurnosClient({ slots: initialSlots, players, assignments: initialAssignments, today }: Props) {
  const supabase = createClient()

  const [slots,        setSlots]        = useState<TrainingSlot[]>(initialSlots)
  const [assignments,  setAssignments]  = useState<Assignment[]>(initialAssignments)
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
  const [saving,       setSaving]       = useState<string | null>(null)
  const [tab,          setTab]          = useState<'asignar' | 'configurar'>('asignar')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const sortedSlots   = [...slots].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week))
  const daysWithSlots = DAY_ORDER.filter(d => sortedSlots.some(s => s.day_of_week === d))
  const [selectedDay, setSelectedDay] = useState<SlotDay>(daysWithSlots[0] ?? 'monday')

  const selectedDaySlots = sortedSlots.filter(s => s.day_of_week === selectedDay)

  const assignedInDay = new Set(
    assignments
      .filter(a => selectedDaySlots.some(s => s.id === a.slot_id))
      .map(a => a.player_id)
  )
  const unassigned = players.filter(p => !assignedInDay.has(p.id))

  function getSlotPlayers(slotId: string): Player[] {
    return assignments
      .filter(a => a.slot_id === slotId)
      .map(a => players.find(p => p.id === a.player_id)!)
      .filter(Boolean)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActivePlayer(players.find(p => p.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActivePlayer(null)
    if (!over) return

    const playerId   = active.id as string
    const targetId   = over.id as string
    const fromSlotId = (active.data.current as { fromSlotId?: string } | undefined)?.fromSlotId

    // ── Caso B: Slot → Sin asignar ──
    if (targetId === 'unassigned') {
      if (!fromSlotId) return
      const prev = assignments.find(a => a.player_id === playerId && a.slot_id === fromSlotId)
      if (!prev) return
      setAssignments(as => as.filter(a => a.id !== prev.id))
      await softRemoveId(prev.id)
      return
    }

    // Solo procesar drops en slots válidos
    if (!slots.find(s => s.id === targetId)) return
    if (fromSlotId === targetId) return

    const sourceAssignment = fromSlotId
      ? assignments.find(a => a.player_id === playerId && a.slot_id === fromSlotId)
      : null

    // ── Optimistic update ──
    const optId    = 'opt-' + Date.now()
    const snapshot = assignments
    const optAssignment: Assignment = { id: optId, slot_id: targetId, player_id: playerId, valid_from: today, valid_until: null }

    setAssignments(prev => [
      ...(sourceAssignment ? prev.filter(a => a.id !== sourceAssignment.id) : prev),
      optAssignment,
    ])

    setSaving(playerId)
    try {
      if (sourceAssignment) {
        await softRemoveId(sourceAssignment.id)
      }

      const res = await fetch('/api/admin/slot-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: targetId, player_id: playerId, valid_from: today }),
      })
      if (!res.ok) throw new Error('Error al asignar')

      const newA: Assignment = await res.json()
      setAssignments(prev => [
        ...prev.filter(a => a.id !== optId),
        newA,
      ])
    } catch {
      setAssignments(snapshot)
    } finally {
      setSaving(null)
    }
  }

  async function softRemoveId(id: string) {
    await fetch('/api/admin/slot-assignment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, valid_until: fmtYesterday(today) }),
    })
  }

  async function removeFromSlot(playerId: string) {
    const a = assignments.find(a => a.player_id === playerId && selectedDaySlots.some(s => s.id === a.slot_id))
    if (!a) return
    setAssignments(prev => prev.filter(x => x.id !== a.id))
    await softRemoveId(a.id)
  }

  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">Editor de turnos</h1>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setTab('asignar')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'asignar' ? 'bg-club-green text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Asignar jugadores
          </button>
          <button
            onClick={() => setTab('configurar')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'configurar' ? 'bg-club-green text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Configurar turnos
          </button>
        </div>
      </div>

      {tab === 'configurar' && <SlotConfigPanel slots={slots} onUpdate={setSlots} />}

      {tab === 'asignar' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Arrastrá jugadores hacia un turno para asignarlos, o de vuelta al panel "Sin asignar" para quitarlos.
            </p>

            {/* Selector de día */}
            <div className="flex flex-wrap gap-1.5">
              {daysWithSlots.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? 'bg-club-green text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>

            <div className="flex gap-4 items-start">
              <UnassignedPanel players={unassigned} saving={saving} />
              <div className="flex gap-3 flex-1 flex-wrap">
                {selectedDaySlots.length === 0 && (
                  <p className="text-sm text-gray-500">No hay turnos para este día.</p>
                )}
                {selectedDaySlots.map(slot => (
                  <SlotDropZone
                    key={slot.id}
                    slot={slot}
                    players={getSlotPlayers(slot.id)}
                    saving={saving}
                    onRemove={removeFromSlot}
                  />
                ))}
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activePlayer && (
              <div className="bg-club-green text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                {activePlayer.display_name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function UnassignedPanel({ players, saving }: { players: Player[]; saving: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' })
  return (
    <div className="shrink-0 w-48">
      <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sin asignar</h3>
      <div
        ref={setNodeRef}
        className={`space-y-1 min-h-[100px] rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-red-500/50 bg-red-900/10' : 'border-white/10'
        }`}
      >
        {players.map(player => (
          <PlayerChip key={player.id} player={player} saving={saving === player.id} fromSlotId={undefined} />
        ))}
        {players.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">Todos asignados</p>
        )}
      </div>
    </div>
  )
}

function PlayerChip({ player, saving, fromSlotId }: { player: Player; saving: boolean; fromSlotId: string | undefined }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: fromSlotId ? { type: 'slot-player', fromSlotId } : { type: 'unassigned-player' },
  })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity:   isDragging ? 0.4 : 1,
    zIndex:    isDragging ? 999 : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`text-xs px-2 py-1.5 rounded bg-white/10 text-white cursor-grab active:cursor-grabbing select-none
        ${saving ? 'opacity-50' : 'hover:bg-club-green/30'} transition-colors`}
    >
      {player.display_name}
    </div>
  )
}

function OccupancyBadge({ count, capacity }: { count: number; capacity: number }) {
  const pct = capacity > 0 ? count / capacity : 0
  let label: string
  let style: React.CSSProperties

  if (count > capacity) {
    label = 'Sobre cupo'
    style = { backgroundColor: '#7F1D1D', color: '#FFFFFF', border: '1px solid #EF4444' }
  } else if (count === capacity) {
    label = 'Completo'
    style = { backgroundColor: '#3A1A1A', color: '#F87171' }
  } else if (pct >= 0.8) {
    label = 'Casi lleno'
    style = { backgroundColor: '#2A1F00', color: '#D97706' }
  } else {
    label = 'Con lugar'
    style = { backgroundColor: '#1A3A22', color: '#4ADE80' }
  }

  return (
    <span style={{ ...style, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function SlotDropZone({ slot, players, saving, onRemove }: {
  slot: TrainingSlot; players: Player[]; saving: string | null; onRemove: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-2 min-h-[80px] w-44 transition-all ${
        isOver ? 'border-club-green bg-club-green/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] text-gray-500">
          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
          <span className="ml-1 text-gray-600">({players.length}/{slot.capacity})</span>
        </span>
        <OccupancyBadge count={players.length} capacity={slot.capacity} />
      </div>
      <div className="space-y-1">
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between gap-1 group">
            <PlayerChip player={player} saving={saving === player.id} fromSlotId={slot.id} />
            <button
              onClick={() => onRemove(player.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all shrink-0"
              title="Quitar del turno"
            >
              ✕
            </button>
          </div>
        ))}
        {players.length === 0 && isOver && (
          <p className="text-[10px] text-club-green text-center py-2">Soltar aquí</p>
        )}
      </div>
    </div>
  )
}
