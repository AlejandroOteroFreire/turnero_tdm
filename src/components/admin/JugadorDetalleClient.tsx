'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountStatus, PaymentStatus, TrainingSlot, SlotDay } from '@/types'
import { DAY_LABELS, PAYMENT_STATUS_LABELS } from '@/types'

interface Account {
  id: string
  email: string
  display_name: string
  phone: string | null
  dni: string | null
  roles: string[]
  status: AccountStatus
  wa_opt_in: boolean
  avatar_url: string | null
}

interface Profile {
  id: string
  user_id: string
  full_name: string
  name: string | null
  lastname: string | null
  nickname: string | null
  birth_date: string | null
  locality: string | null
  phone_whatsapp: string | null
  tmt_code: string | null
  fetemba_code: string | null
  medical_cert: boolean
  notes: string | null
  frequency: number
  joined_at: string
}

interface AssignmentRow {
  id: string
  slot_id: string
  valid_from: string
  valid_until: string | null
  training_slots: TrainingSlot | null
}

interface PaymentRow {
  id: string
  type: string
  amount: number
  period_month: number | null
  period_year: number | null
  paid_at: string
  notes: string | null
}

interface BookingRow {
  id: string
  status: string
  type: string
  booked_at: string
  slot_instances: {
    id: string
    date: string
    training_slots: { day_of_week: SlotDay; start_time: string; end_time: string; label: string | null } | null
  } | null
}

interface Props {
  account:       Account
  profile:       Profile | null
  assignments:   AssignmentRow[]
  payments:      PaymentRow[]
  paymentStatus: PaymentStatus | null
  bookings:      BookingRow[]
  allSlots:      TrainingSlot[]
  today:         string
  isAdmin:       boolean
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; cls: string }> = {
  active:         { label: 'Activo',         cls: 'text-green-400' },
  pending:        { label: 'Pendiente',       cls: 'text-amber-400' },
  pre_registered: { label: 'Pre-registrado',  cls: 'text-blue-400'  },
  suspended:      { label: 'Suspendido',      cls: 'text-red-400'   },
  disabled:       { label: 'Deshabilitado',   cls: 'text-gray-500'  },
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_ORDER: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function yesterday(today: string) {
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

const ACTIVITY_PAGE_SIZE = 10

export function JugadorDetalleClient({ account, profile, assignments: initialAssignments, payments, paymentStatus, bookings, allSlots, today, isAdmin }: Props) {
  const router  = useRouter()

  // ── Datos personales ──────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(profile?.name ?? '')
  const [lastName,    setLastName]    = useState(profile?.lastname ?? '')
  const [nickname,    setNickname]    = useState(profile?.nickname ?? '')
  const [birthDate,   setBirthDate]   = useState(profile?.birth_date ?? '')
  const [locality,    setLocality]    = useState(profile?.locality ?? '')
  const [phone,       setPhone]       = useState(profile?.phone_whatsapp ?? account.phone ?? '')
  const [tmtCode,     setTmtCode]     = useState(profile?.tmt_code ?? '')
  const [fetembaCode, setFetembaCode] = useState(profile?.fetemba_code ?? '')
  const [waOptIn,     setWaOptIn]     = useState(account.wa_opt_in)
  const [notes,       setNotes]       = useState(profile?.notes ?? '')
  const [medicalCert, setMedicalCert] = useState(profile?.medical_cert ?? false)
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [profileMsg,     setProfileMsg]     = useState<string | null>(null)

  // ── Estado de cuenta ──────────────────────────────────────────
  const [status,       setStatus]       = useState<AccountStatus>(account.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError,  setStatusError]  = useState<string | null>(null)

  // ── Reset de contraseña (admin) ───────────────────────────────
  const [sendingReset, setSendingReset] = useState(false)
  const [resetMsg,     setResetMsg]     = useState<string | null>(null)

  async function sendPasswordReset() {
    setSendingReset(true)
    setResetMsg(null)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: account.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      setResetMsg('Mail de recuperación enviado.')
    } catch (err: unknown) {
      setResetMsg('Error: ' + (err instanceof Error ? err.message : 'No se pudo enviar'))
    } finally {
      setSendingReset(false)
    }
  }

  // ── Roles ─────────────────────────────────────────────────────
  const [roles,      setRoles]      = useState<string[]>(account.roles)
  const [savingRole, setSavingRole] = useState(false)
  const [roleMsg,    setRoleMsg]    = useState<string | null>(null)

  async function toggleRole(role: 'admin' | 'collaborator') {
    const other = role === 'admin' ? 'collaborator' : 'admin'
    const next = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles.filter(r => r !== other), role]
    const final = next.includes('player') ? next : ['player', ...next]
    setSavingRole(true)
    setRoleMsg(null)
    try {
      const res = await fetch('/api/admin/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: account.id, account: { roles: final } }),
      })
      if (res.ok) { setRoles(final); setRoleMsg('Roles actualizados.') }
      else { const d = await res.json(); setRoleMsg('Error: ' + (d.error ?? 'No se pudo guardar')) }
    } catch { setRoleMsg('Error de red') }
    finally { setSavingRole(false) }
  }

  // ── Plan fijo — editor inline ─────────────────────────────────
  const [assignments,    setAssignments]    = useState<AssignmentRow[]>(initialAssignments)
  const [editingPlan,    setEditingPlan]    = useState(false)
  const [selectedSlots,  setSelectedSlots]  = useState<Set<string>>(
    new Set(initialAssignments.map(a => a.slot_id))
  )
  const [savingPlan,     setSavingPlan]     = useState(false)
  const [planMsg,        setPlanMsg]        = useState<string | null>(null)

  // ── Pagos ─────────────────────────────────────────────────────
  const now = new Date()
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount,   setPayAmount]   = useState('5000')
  const [payMonth,    setPayMonth]    = useState(now.getMonth() + 1)
  const [payYear,     setPayYear]     = useState(now.getFullYear())
  const [payMethod,   setPayMethod]   = useState<'efectivo' | 'transferencia' | 'otro'>('efectivo')
  const [payNotes,    setPayNotes]    = useState('')
  const [savingPay,   setSavingPay]   = useState(false)
  const [payError,    setPayError]    = useState<string | null>(null)
  const [localPayments, setLocalPayments] = useState(payments)

  // ── Actividad paginada ────────────────────────────────────────
  const [activityPage, setActivityPage] = useState(1)

  // ─────────────────────────────────────────────────────────────
  async function saveProfile() {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const res = await fetch('/api/admin/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: account.id,
          account: { display_name: fullName || account.display_name, phone: phone || null, wa_opt_in: waOptIn },
          profile: {
            name:           firstName || null,
            lastname:       lastName || null,
            nickname:       nickname || null,
            birth_date:     birthDate || null,
            locality:       locality || null,
            phone_whatsapp: phone || null,
            tmt_code:       tmtCode || null,
            fetemba_code:   fetembaCode || null,
            notes:          notes || null,
            medical_cert:   medicalCert,
          },
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setProfileMsg('Cambios guardados correctamente.')
    } catch (err: unknown) {
      setProfileMsg('Error: ' + (err instanceof Error ? err.message : 'No se pudo guardar'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function updateStatus(newStatus: AccountStatus) {
    setSavingStatus(true)
    setStatusError(null)
    try {
      const res = await fetch('/api/admin/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: account.id, status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
      } else {
        const d = await res.json()
        setStatusError(d.error ?? 'Error al actualizar estado')
      }
    } catch {
      setStatusError('Error de red')
    } finally {
      setSavingStatus(false)
    }
  }

  async function savePlan() {
    setSavingPlan(true)
    setPlanMsg(null)
    try {
      const currentSlotIds  = new Set(assignments.map(a => a.slot_id))
      const toAdd    = [...selectedSlots].filter(id => !currentSlotIds.has(id))
      const toRemove = [...currentSlotIds].filter(id => !selectedSlots.has(id))
      const yday     = yesterday(today)

      // UPDATE válido → ayer para los quitados
      for (const slotId of toRemove) {
        const a = assignments.find(x => x.slot_id === slotId)
        if (a) {
          await fetch('/api/admin/slot-assignment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: a.id, valid_until: yday }),
          })
        }
      }

      // INSERT nuevos
      const inserts: AssignmentRow[] = []
      for (const slotId of toAdd) {
        const res = await fetch('/api/admin/slot-assignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: account.id, slot_id: slotId, valid_from: today }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
        const data = await res.json()
        if (data) inserts.push(data as unknown as AssignmentRow)
      }

      // Actualizar estado local
      const remaining = assignments
        .filter(a => !toRemove.includes(a.slot_id))
        .concat(inserts)
      setAssignments(remaining)
      setEditingPlan(false)
      setPlanMsg('Plan guardado.')
    } catch (err: unknown) {
      setPlanMsg('Error: ' + (err instanceof Error ? err.message : 'No se pudo guardar'))
    } finally {
      setSavingPlan(false)
    }
  }

  function cancelEditPlan() {
    setSelectedSlots(new Set(assignments.map(a => a.slot_id)))
    setEditingPlan(false)
    setPlanMsg(null)
  }

  async function registerPayment() {
    setSavingPay(true)
    setPayError(null)
    try {
      const notesValue = `Método: ${payMethod}.${payNotes ? ' ' + payNotes : ''}`
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id:    account.id,
          type:         'monthly',
          amount:       parseFloat(payAmount),
          period_month: payMonth,
          period_year:  payYear,
          paid_at:      now.toISOString().split('T')[0],
          notes:        notesValue,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      setLocalPayments(prev => [data as PaymentRow, ...prev])
      setShowPayForm(false)
      setPayNotes('')
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setSavingPay(false)
    }
  }

  function exportPaymentsCsv() {
    const rows = localPayments.map(p => [
      p.paid_at,
      MONTHS[(p.period_month ?? 1) - 1] + ' ' + (p.period_year ?? ''),
      p.amount,
      p.type,
      p.notes ?? '',
    ].join(','))
    const csv = `Fecha,Período,Monto,Tipo,Notas\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pagos-${account.display_name.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
  }

  const fullDisplayName = `${firstName} ${lastName}`.trim() || account.display_name
  const initials = fullDisplayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  // Actividad filtrada
  const exceptions = bookings.filter(b =>
    b.type !== 'auto' ||
    b.status === 'cancelled' ||
    b.status === 'cancelled_late' ||
    b.status === 'no_show'
  )
  const activityVisible = exceptions.slice(0, activityPage * ACTIVITY_PAGE_SIZE)
  const hasMoreActivity  = exceptions.length > activityVisible.length

  // Slots agrupados por día para el editor de plan
  const slotsByDay = DAY_ORDER.reduce((acc, day) => {
    acc[day] = allSlots.filter(s => s.day_of_week === day)
    return acc
  }, {} as Record<SlotDay, TrainingSlot[]>)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/jugadores')} className="btn-ghost text-sm py-1 px-2">
          ← Volver
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-club-green/30 flex items-center justify-center text-sm font-bold text-club-green shrink-0">
            {account.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            ) : initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{fullDisplayName}</h1>
            <p className="text-xs text-gray-500 truncate">{account.email}</p>
          </div>
        </div>
        <span className={`text-xs font-medium shrink-0 ${STATUS_CONFIG[status]?.cls ?? 'text-gray-400'}`}>
          {STATUS_CONFIG[status]?.label ?? status}
        </span>
      </div>

      {/* ── Datos personales ── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-white">Datos personales</h2>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input type="text" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input type="text" className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Apodo <span className="text-gray-600 font-normal">(opcional)</span></label>
            <input type="text" className="input" placeholder="Como lo conocen en el club" value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" className="input" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Localidad</label>
              <input type="text" className="input" placeholder="Ej: Córdoba Capital" value={locality} onChange={e => setLocality(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Email (solo lectura)</label>
            <input type="email" className="input opacity-50 cursor-not-allowed" value={account.email} readOnly />
          </div>
          <div>
            <label className="label">DNI (solo lectura)</label>
            <input type="text" className="input opacity-50 cursor-not-allowed" value={account.dni ?? '—'} readOnly />
          </div>
          <div>
            <label className="label">Teléfono / WhatsApp</label>
            <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+549 11 1234-5678" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="wa_opt_in" checked={waOptIn} onChange={e => setWaOptIn(e.target.checked)} className="w-4 h-4 accent-club-green" />
            <label htmlFor="wa_opt_in" className="text-sm text-gray-300">Acepta notificaciones por WhatsApp</label>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-3">
          <p className="text-xs font-semibold text-gray-400">Datos deportivos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código TMT</label>
              <input type="text" className="input" placeholder="Ej: TMT-00001" value={tmtCode} onChange={e => setTmtCode(e.target.value)} />
            </div>
            <div>
              <label className="label">Código Fetemba</label>
              <input type="text" className="input" placeholder="Ej: FET-1004" value={fetembaCode} onChange={e => setFetembaCode(e.target.value)} />
            </div>
          </div>
        </div>

        {profile && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            <p className="text-xs font-semibold text-gray-400">Notas internas</p>
            <textarea className="input w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones del jugador…" />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="medical_cert" checked={medicalCert} onChange={e => setMedicalCert(e.target.checked)} className="w-4 h-4 accent-club-green" />
              <label htmlFor="medical_cert" className="text-sm text-gray-300">Certificado médico presentado</label>
            </div>
          </div>
        )}

        {profileMsg && (
          <p className={`text-xs ${profileMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {profileMsg}
          </p>
        )}

        <button onClick={saveProfile} disabled={savingProfile} className="btn-primary text-sm">
          {savingProfile ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </section>

      {/* ── Plan fijo ── */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Plan fijo</h2>
          {!editingPlan && (
            <button
              onClick={() => { setEditingPlan(true); setPlanMsg(null) }}
              className="btn-secondary text-xs py-1 px-3"
            >
              Editar plan
            </button>
          )}
        </div>

        {!editingPlan ? (
          assignments.length === 0 ? (
            <p className="text-sm text-gray-500">Sin turnos asignados.</p>
          ) : (
            <div className="space-y-1">
              {assignments.map(a => {
                const slot = a.training_slots
                if (!slot) return null
                return (
                  <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white">{DAY_LABELS[slot.day_of_week]}</span>
                    <span className="text-xs text-gray-400">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      {slot.label ? ` · ${slot.label}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Seleccioná los turnos que forman parte del plan fijo del jugador.
            </p>
            {DAY_ORDER.map(day => {
              const daySlots = slotsByDay[day]
              if (!daySlots || daySlots.length === 0) return null
              return (
                <div key={day} className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400">{DAY_LABELS[day]}</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map(slot => {
                      const selected = selectedSlots.has(slot.id)
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlots(prev => {
                            const next = new Set(prev)
                            selected ? next.delete(slot.id) : next.add(slot.id)
                            return next
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            selected
                              ? 'bg-club-green/20 border-club-green text-club-green'
                              : 'bg-white/5 border-white/15 text-gray-400 hover:border-white/30'
                          }`}
                        >
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          {slot.label ? ` · ${slot.label}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {planMsg && (
              <p className={`text-xs ${planMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {planMsg}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={savePlan} disabled={savingPlan} className="btn-primary text-xs py-1.5 px-4">
                {savingPlan ? 'Guardando…' : 'Guardar plan'}
              </button>
              <button onClick={cancelEditPlan} className="btn-ghost text-xs py-1.5 px-3">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!editingPlan && planMsg && (
          <p className="text-xs text-green-400">{planMsg}</p>
        )}
      </section>

      {/* ── Acceso ── */}
      {isAdmin && <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Acceso</h2>
        <p className="text-xs text-gray-500">
          Enviá un mail al jugador para que pueda restablecer su contraseña.
        </p>
        {resetMsg && (
          <p className={`text-xs ${resetMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {resetMsg}
          </p>
        )}
        <button
          onClick={sendPasswordReset}
          disabled={sendingReset}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {sendingReset ? 'Enviando…' : 'Enviar mail de recuperación'}
        </button>
      </section>}

      {/* ── Roles ── */}
      {isAdmin && <>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Roles</h2>
        <p className="text-xs text-gray-500">
          El rol Jugador es asignado por defecto y no se puede quitar.
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Jugador — siempre presente */}
          <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
            <input type="checkbox" checked readOnly disabled className="w-4 h-4 accent-club-green" />
            <span className="text-sm text-gray-300">Jugador</span>
          </label>

          {/* Colaborador */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={roles.includes('collaborator')}
              onChange={() => !savingRole && toggleRole('collaborator')}
              className="w-4 h-4 accent-club-green"
            />
            <span className="text-sm text-gray-300">Colaborador</span>
          </label>

          {/* Admin */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={roles.includes('admin')}
              onChange={() => !savingRole && toggleRole('admin')}
              className="w-4 h-4 accent-club-green"
            />
            <span className="text-sm text-gray-300">Admin</span>
          </label>
        </div>
        {roleMsg && (
          <p className={`text-xs ${roleMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {roleMsg}
          </p>
        )}
      </section>

      {/* ── Estado ── */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Estado</h2>

        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${STATUS_CONFIG[status]?.cls ?? 'text-gray-400'}`}>
            {STATUS_CONFIG[status]?.label ?? status}
          </span>
        </div>

        {statusError && <p className="text-xs text-red-400">{statusError}</p>}
        <div className="flex flex-wrap gap-2">
          {status === 'active' && (
            <>
              <button onClick={() => updateStatus('suspended')} disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-amber-400 border-amber-800">
                {savingStatus ? '…' : 'Suspender'}
              </button>
              <button onClick={() => updateStatus('disabled')} disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800">
                {savingStatus ? '…' : 'Deshabilitar'}
              </button>
            </>
          )}
          {status === 'suspended' && (
            <>
              <button onClick={() => updateStatus('active')} disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3">
                {savingStatus ? '…' : 'Habilitar'}
              </button>
              <button onClick={() => updateStatus('disabled')} disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800">
                {savingStatus ? '…' : 'Deshabilitar'}
              </button>
            </>
          )}
          {status === 'disabled' && (
            <button onClick={() => updateStatus('active')} disabled={savingStatus}
              className="btn-primary text-xs py-1.5 px-3">
              {savingStatus ? '…' : 'Habilitar'}
            </button>
          )}
          {status === 'pre_registered' && (
            <>
              <button onClick={() => updateStatus('active')} disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3">
                {savingStatus ? '…' : 'Activar'}
              </button>
              <button onClick={() => updateStatus('disabled')} disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800">
                {savingStatus ? '…' : 'Deshabilitar'}
              </button>
            </>
          )}
          {status === 'pending' && (
            <>
              <button onClick={() => updateStatus('active')} disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3">
                {savingStatus ? '…' : 'Activar'}
              </button>
              <button onClick={() => updateStatus('suspended')} disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800">
                {savingStatus ? '…' : 'Rechazar'}
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── Pagos ── */}
      <section className="card space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Pagos</h2>
          <div className="flex gap-2">
            <button onClick={exportPaymentsCsv} className="btn-ghost text-xs py-1 px-2">
              Exportar CSV
            </button>
            <button
              onClick={() => { setShowPayForm(!showPayForm); setPayError(null) }}
              className="btn-primary text-xs py-1 px-3"
            >
              + Registrar pago
            </button>
          </div>
        </div>

        {showPayForm && (
          <div className="space-y-3 border border-white/10 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-400">Nuevo pago</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monto ($)</label>
                <input type="number" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="0" step="100" />
              </div>
              <div>
                <label className="label">Método</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value as typeof payMethod)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Mes</label>
                <select className="input" value={payMonth} onChange={e => setPayMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Año</label>
                <select className="input" value={payYear} onChange={e => setPayYear(parseInt(e.target.value))}>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notas opcionales</label>
              <input type="text" className="input" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Observaciones adicionales…" />
            </div>
            {payError && <p className="text-xs text-red-400">{payError}</p>}
            <div className="flex gap-2">
              <button onClick={registerPayment} disabled={savingPay} className="btn-primary text-xs py-1.5 px-4">
                {savingPay ? 'Guardando…' : 'Guardar pago'}
              </button>
              <button onClick={() => { setShowPayForm(false); setPayError(null) }} className="btn-ghost text-xs py-1.5 px-3">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {localPayments.length === 0 ? (
          <p className="text-sm text-gray-500">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-white/10">
                  <th className="text-left py-1.5 pr-3">Fecha</th>
                  <th className="text-left py-1.5 pr-3">Período</th>
                  <th className="text-right py-1.5 pr-3">Monto</th>
                  <th className="text-left py-1.5">Notas</th>
                </tr>
              </thead>
              <tbody>
                {localPayments.map(p => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 pr-3 text-gray-300">{p.paid_at}</td>
                    <td className="py-1.5 pr-3 text-gray-300">
                      {p.period_month && p.period_year ? `${MONTHS[p.period_month - 1]} ${p.period_year}` : '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-white font-medium">
                      ${p.amount.toLocaleString('es-AR')}
                    </td>
                    <td className="py-1.5 text-gray-500 truncate max-w-[140px]">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </>}

      {/* ── Actividad reciente (paginada de a 10) ── */}
      <section className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Actividad (últimos 90 días)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Cancelaciones, reservas extra y recuperos.</p>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-500">Sin excepciones en el período.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              {activityVisible.map(b => {
                const inst = b.slot_instances
                const slot = inst?.training_slots
                const typeLabel =
                  b.type === 'manual_extra'           ? 'Reserva extra' :
                  b.type === 'manual_cancel_recovery' ? 'Recupero de turno' : null
                const statusLabel =
                  b.status === 'cancelled'      ? 'Cancelado'      :
                  b.status === 'cancelled_late' ? 'Canceló tarde'  :
                  b.status === 'no_show'        ? 'No se presentó' :
                  b.status === 'confirmed'      ? 'Confirmado'     :
                  b.status === 'waitlisted'     ? 'En espera'      : b.status
                const statusCls =
                  b.status === 'confirmed'                                    ? 'text-green-400' :
                  b.status === 'cancelled' || b.status === 'cancelled_late'   ? 'text-red-400'   :
                  b.status === 'no_show'                                      ? 'text-amber-400' : 'text-gray-400'
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
                    <div className="min-w-0">
                      <span className="text-gray-300">{inst?.date ?? '—'}</span>
                      {slot && (
                        <span className="text-gray-500 ml-2">
                          {DAY_LABELS[slot.day_of_week]} {slot.start_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {typeLabel && (
                        <span className="px-1.5 py-0.5 rounded-md bg-club-green/15 text-club-green text-[10px] font-medium">
                          {typeLabel}
                        </span>
                      )}
                      <span className={statusCls}>{statusLabel}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {hasMoreActivity && (
              <button
                onClick={() => setActivityPage(p => p + 1)}
                className="btn-ghost text-xs py-1.5 w-full"
              >
                Ver más ({exceptions.length - activityVisible.length} restantes)
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
