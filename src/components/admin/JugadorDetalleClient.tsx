'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; cls: string }> = {
  active:         { label: 'Activo',         cls: 'text-green-400' },
  pending:        { label: 'Pendiente',       cls: 'text-amber-400' },
  pre_registered: { label: 'Pre-registrado',  cls: 'text-blue-400'  },
  suspended:      { label: 'Suspendido',      cls: 'text-red-400'   },
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function JugadorDetalleClient({ account, profile, assignments, payments, paymentStatus, bookings }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Datos personales
  const [firstName, setFirstName]   = useState(profile?.name ?? '')
  const [lastName, setLastName]     = useState(profile?.lastname ?? '')
  const [nickname, setNickname]     = useState(profile?.nickname ?? '')
  const [birthDate, setBirthDate]   = useState(profile?.birth_date ?? '')
  const [locality, setLocality]     = useState(profile?.locality ?? '')
  const [phone, setPhone]           = useState(profile?.phone_whatsapp ?? account.phone ?? '')
  const [tmtCode, setTmtCode]       = useState(profile?.tmt_code ?? '')
  const [fetembaCode, setFetembaCode] = useState(profile?.fetemba_code ?? '')
  const [waOptIn, setWaOptIn]       = useState(account.wa_opt_in)
  const [notes, setNotes]           = useState(profile?.notes ?? '')
  const [medicalCert, setMedicalCert] = useState(profile?.medical_cert ?? false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg]       = useState<string | null>(null)

  // Estado de cuenta
  const [status, setStatus]     = useState<AccountStatus>(account.status)
  const [savingStatus, setSavingStatus] = useState(false)

  // Pagos
  const now = new Date()
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount]     = useState('5000')
  const [payMonth, setPayMonth]       = useState(now.getMonth() + 1)
  const [payYear, setPayYear]         = useState(now.getFullYear())
  const [payMethod, setPayMethod]     = useState<'efectivo' | 'transferencia' | 'otro'>('efectivo')
  const [payNotes, setPayNotes]       = useState('')
  const [savingPay, setSavingPay]     = useState(false)
  const [localPayments, setLocalPayments] = useState(payments)

  async function saveProfile() {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const { error: accError } = await supabase
        .from('user_accounts')
        .update({ display_name: fullName || account.display_name, phone: phone || null, wa_opt_in: waOptIn })
        .eq('id', account.id)
      if (accError) throw accError

      if (profile) {
        const { error: profError } = await supabase
          .from('player_profiles')
          .update({
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
          })
          .eq('user_id', account.id)
        if (profError) throw profError
      }

      setProfileMsg('Cambios guardados correctamente.')
    } catch (err: unknown) {
      setProfileMsg('Error: ' + (err instanceof Error ? err.message : 'No se pudo guardar'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function updateStatus(newStatus: AccountStatus) {
    setSavingStatus(true)
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({ status: newStatus })
        .eq('id', account.id)
      if (!error) setStatus(newStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  async function registerPayment() {
    setSavingPay(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const notesValue = `Método: ${payMethod}.${payNotes ? ' ' + payNotes : ''}`
      const { data, error } = await supabase
        .from('payments')
        .insert({
          player_id:    account.id,
          type:         'monthly',
          amount:       parseFloat(payAmount),
          period_month: payMonth,
          period_year:  payYear,
          paid_at:      now.toISOString().split('T')[0],
          registered_by: user!.id,
          notes:        notesValue,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setLocalPayments(prev => [data as PaymentRow, ...prev])
      setShowPayForm(false)
    } catch (err: unknown) {
      console.error(err)
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/jugadores')} className="btn-ghost text-sm py-1 px-2">
          ← Volver
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-club-green/30 flex items-center justify-center text-sm font-bold text-club-green shrink-0">
            {account.avatar_url ? (
              <img src={account.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            ) : initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{fullDisplayName}</h1>
            <p className="text-xs text-gray-500 truncate">{account.email}</p>
          </div>
        </div>
        <span className={`text-xs font-medium shrink-0 ${STATUS_CONFIG[status].cls}`}>
          {STATUS_CONFIG[status].label}
        </span>
      </div>

      {/* Datos personales */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-white">Datos personales</h2>

        <div className="grid gap-3">
          {/* Nombre y Apellido */}
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

        {/* Datos deportivos */}
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

      {/* Plan fijo */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Plan fijo</h2>
          <Link href="/editor-turnos" className="btn-secondary text-xs py-1 px-3">
            Editar plan
          </Link>
        </div>

        {assignments.length === 0 ? (
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
        )}
      </section>

      {/* Estado de cuenta */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Estado de cuenta</h2>

        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${STATUS_CONFIG[status].cls}`}>
            {STATUS_CONFIG[status].label}
          </span>
          {paymentStatus && (
            <span className="text-xs text-gray-400">
              Pago: {PAYMENT_STATUS_LABELS[paymentStatus]}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {status === 'active' && (
            <>
              <button
                onClick={() => updateStatus('suspended')}
                disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-amber-400 border-amber-800"
              >
                {savingStatus ? '…' : 'Suspender'}
              </button>
              <button
                onClick={() => updateStatus('pre_registered')}
                disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
              >
                {savingStatus ? '…' : 'Deshabilitar'}
              </button>
            </>
          )}
          {status === 'pending' && (
            <>
              <button
                onClick={() => updateStatus('active')}
                disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {savingStatus ? '…' : 'Activar'}
              </button>
              <button
                onClick={() => updateStatus('suspended')}
                disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
              >
                {savingStatus ? '…' : 'Rechazar'}
              </button>
            </>
          )}
          {status === 'pre_registered' && (
            <button
              onClick={() => updateStatus('active')}
              disabled={savingStatus}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {savingStatus ? '…' : 'Activar'}
            </button>
          )}
          {status === 'suspended' && (
            <>
              <button
                onClick={() => updateStatus('active')}
                disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {savingStatus ? '…' : 'Habilitar'}
              </button>
              <button
                onClick={() => updateStatus('pre_registered')}
                disabled={savingStatus}
                className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
              >
                {savingStatus ? '…' : 'Deshabilitar'}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Pagos */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Pagos</h2>
          <div className="flex gap-2">
            <button onClick={exportPaymentsCsv} className="btn-ghost text-xs py-1 px-2">
              Exportar CSV
            </button>
            <button
              onClick={() => setShowPayForm(!showPayForm)}
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
                <input
                  type="number"
                  className="input"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <label className="label">Método</label>
                <select
                  className="input"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as typeof payMethod)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Mes</label>
                <select
                  className="input"
                  value={payMonth}
                  onChange={e => setPayMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Año</label>
                <select
                  className="input"
                  value={payYear}
                  onChange={e => setPayYear(parseInt(e.target.value))}
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notas opcionales</label>
              <input
                type="text"
                className="input"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="Observaciones adicionales…"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={registerPayment} disabled={savingPay} className="btn-primary text-xs py-1.5 px-4">
                {savingPay ? 'Guardando…' : 'Guardar pago'}
              </button>
              <button onClick={() => setShowPayForm(false)} className="btn-ghost text-xs py-1.5 px-3">
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
                      {p.period_month && p.period_year
                        ? `${MONTHS[p.period_month - 1]} ${p.period_year}`
                        : '—'}
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

      {/* Actividad reciente — solo excepciones al plan fijo */}
      <section className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Actividad (últimos 90 días)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Cancelaciones, reservas extra y recuperos. Las clases del plan fijo no se muestran.</p>
        </div>

        {(() => {
          const exceptions = bookings.filter(b =>
            b.type !== 'auto' ||
            b.status === 'cancelled' ||
            b.status === 'cancelled_late' ||
            b.status === 'no_show'
          )
          if (exceptions.length === 0) return (
            <p className="text-sm text-gray-500">Sin excepciones en el período.</p>
          )
          return (
            <div className="space-y-1.5">
              {exceptions.map(b => {
                const inst = b.slot_instances
                const slot = inst?.training_slots
                const typeLabel = b.type === 'manual_extra'           ? 'Reserva extra'    :
                                  b.type === 'manual_cancel_recovery' ? 'Recupero de turno' : null
                const statusLabel =
                  b.status === 'cancelled'      ? 'Cancelado'      :
                  b.status === 'cancelled_late' ? 'Canceló tarde'  :
                  b.status === 'no_show'        ? 'No se presentó' :
                  b.status === 'confirmed'      ? 'Confirmado'     :
                  b.status === 'waitlisted'     ? 'En espera'      : b.status
                const statusCls =
                  b.status === 'confirmed'                            ? 'text-green-400' :
                  b.status === 'cancelled' || b.status === 'cancelled_late' ? 'text-red-400'   :
                  b.status === 'no_show'                              ? 'text-amber-400' : 'text-gray-400'
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
          )
        })()}
      </section>
    </div>
  )
}
