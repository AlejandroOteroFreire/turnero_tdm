'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_LABELS } from '@/types'
import type { TrainingSlot, SlotDay } from '@/types'
import { SlotConfigPanel } from './SlotConfigPanel'

interface Player { id: string; display_name: string; roles: string[] }
interface Assignment { id: string; slot_id: string; player_id: string; position: number | null }
interface Props {
  slots:       TrainingSlot[]
  players:     Player[]
  assignments: Assignment[]
  weekStart:   string
}

export function EditorTurnosClient({ slots: initialSlots, players, assignments: initialAssignments, weekStart }: Props) {
  const [slots, setSlots] = useState<TrainingSlot[]>(initialSlots)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [tab, setTab] = useState<'asignar' | 'configurar'>('asignar')
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Jugadores no asignados en ningún slot esta semana
  const assignedPlayerIds = new Set(assignments.map(a => a.player_id))
  const unassigned = players.filter(p => !assignedPlayerIds.has(p.id))

  function getSlotPlayers(slotId: string): Player[] {
    return assignments
      .filter(a => a.slot_id === slotId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(a => players.find(p => p.id === a.player_id)!)
      .filter(Boolean)
  }

  function handleDragStart({ active }: DragStartEvent) {
    const player = players.find(p => p.id === active.id)
    setActivePlayer(player ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActivePlayer(null)
    if (!over) return

    const playerId  = active.id as string
    const targetId  = over.id as string

    // targetId puede ser: slotId (drop en slot vacío) o otro playerId (swap)
    const targetSlot = slots.find(s => s.id === targetId)
    const targetSlotByPlayer = assignments.find(a => a.player_id === targetId)

    const slotId = targetSlot?.id ?? targetSlotByPlayer?.slot_id

    if (!slotId) return

    // Verificar si ya está en ese slot
    const existing = assignments.find(a => a.player_id === playerId && a.slot_id === slotId)
    if (existing) return

    // Quitar de slot anterior si tenía
    const prevAssignment = assignments.find(a => a.player_id === playerId)

    setSaving(playerId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Eliminar asignación previa
      if (prevAssignment) {
        await supabase.from('slot_assignments').delete().eq('id', prevAssignment.id)
      }

      // Crear nueva asignación
      const position = assignments.filter(a => a.slot_id === slotId).length + 1
      const { data: newAssignment } = await supabase
        .from('slot_assignments')
        .insert({ slot_id: slotId, player_id: playerId, week_start: weekStart, position, assigned_by: user.id })
        .select()
        .single()

      if (newAssignment) {
        setAssignments(prev => [
          ...prev.filter(a => a.player_id !== playerId),
          newAssignment as Assignment,
        ])
      }
    } finally {
      setSaving(null)
    }
  }

  async function removeFromSlot(playerId: string) {
    const assignment = assignments.find(a => a.player_id === playerId)
    if (!assignment) return
    await supabase.from('slot_assignments').delete().eq('id', assignment.id)
    setAssignments(prev => prev.filter(a => a.player_id !== playerId))
  }

  // Ordenar slots por día de la semana
  const dayOrder: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const sortedSlots = [...slots].sort((a, b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week))

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

      {/* Tab: Configurar turnos */}
      {tab === 'configurar' && (
        <SlotConfigPanel slots={slots} onUpdate={setSlots} />
      )}

      {/* Tab: Asignar jugadores */}
      {tab === 'asignar' && (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Semana del {weekStart}</span>
        </div>

        <p className="text-xs text-gray-500">
          Arrastrá los jugadores desde el panel izquierdo a los turnos de la grilla.
        </p>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {/* Panel de jugadores no asignados */}
          <div className="shrink-0 w-48">
            <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sin asignar</h3>
            <SortableContext items={unassigned.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 min-h-[80px] rounded-lg border border-dashed border-white/10 p-2">
                {unassigned.map(player => (
                  <PlayerChip key={player.id} player={player} saving={saving === player.id} />
                ))}
                {unassigned.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4">Todos asignados</p>
                )}
              </div>
            </SortableContext>
          </div>

          {/* Grilla de slots por día */}
          <div className="flex gap-3 min-w-0">
            {dayOrder.map(day => {
              const daySlots = sortedSlots.filter(s => s.day_of_week === day)
              if (daySlots.length === 0) return null
              return (
                <div key={day} className="w-44 shrink-0">
                  <h3 className="text-xs font-semibold text-club-green mb-2 uppercase tracking-wide">
                    {DAY_LABELS[day]}
                  </h3>
                  <div className="space-y-2">
                    {daySlots.map(slot => {
                      const slotPlayers = getSlotPlayers(slot.id)
                      return (
                        <SlotDropZone
                          key={slot.id}
                          slot={slot}
                          players={slotPlayers}
                          saving={saving}
                          onRemove={removeFromSlot}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activePlayer && (
          <div className="bg-club-green text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg opacity-90">
            {activePlayer.display_name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
      )}
    </div>
  )
}

// ---- Componente: Chip de jugador arrastrable ----
function PlayerChip({ player, saving }: { player: Player; saving: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

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

// ---- Componente: Zona de drop de slot ----
function SlotDropZone({ slot, players, saving, onRemove }: {
  slot: TrainingSlot; players: Player[]; saving: string | null; onRemove: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-2 min-h-[80px] transition-all ${
        isOver ? 'border-club-green bg-club-green/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-[10px] text-gray-500 mb-1.5 truncate">
        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
        <span className="ml-1 text-gray-600">({players.length}/{slot.capacity})</span>
      </p>
      <div className="space-y-1">
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between gap-1 group">
            <PlayerChip player={player} saving={saving === player.id} />
            <button
              onClick={() => onRemove(player.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
