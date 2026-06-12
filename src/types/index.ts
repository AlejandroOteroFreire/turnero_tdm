// ============================================================
// Tipos centrales del dominio — Turnero TDM
// ============================================================

export type UserRole = 'player' | 'collaborator' | 'admin'
export type AccountStatus = 'active' | 'pending' | 'pre_registered' | 'suspended' | 'disabled'
export type SlotDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'cancelled_late' | 'no_show'
export type InstanceStatus = 'active' | 'cancelled' | 'holiday'
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type PaymentStatus = 'current' | 'owes_month' | 'owes_previous'
export type NotificationChannel = 'whatsapp' | 'whatsapp_group' | 'web_push' | 'email'
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'cancelled_late' | 'no_show'
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected'
export type PlanChangeStatus = 'pending' | 'approved' | 'rejected'

export interface UserAccount {
  id: string
  email: string
  display_name: string
  phone: string | null
  dni: string | null
  roles: UserRole[]
  status: AccountStatus
  avatar_url: string | null
  wa_opt_in: boolean
  created_at: string
  updated_at: string
}

export interface PlayerProfile {
  id: string
  user_id: string
  full_name: string
  dni: string
  birth_date: string | null
  phone: string | null
  emergency_phone: string | null
  frequency: number
  medical_cert: boolean
  notes: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface TrainingSlot {
  id: string
  day_of_week: SlotDay
  start_time: string   // 'HH:mm'
  end_time: string
  capacity: number
  label: string | null
  is_active: boolean
  created_by: string
  created_at: string
}

export interface SlotInstance {
  id: string
  slot_id: string
  date: string         // 'YYYY-MM-DD'
  status: InstanceStatus
  cancellation_reason: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  notification_sent: boolean
  created_at: string
}

export interface Booking {
  id: string
  instance_id: string
  player_id: string
  status: BookingStatus
  waitlist_pos: number | null
  booked_at: string
  cancelled_at: string | null
  cancelled_by: string | null
  late_cancel: boolean
  created_at: string
  updated_at: string
}

export interface WaitlistOffer {
  id: string
  booking_id: string
  instance_id: string
  player_id: string
  status: OfferStatus
  offered_at: string
  expires_at: string
  responded_at: string | null
  wa_message_id: string | null
  redis_key: string | null
  created_at: string
}

export interface Payment {
  id: string
  player_id: string
  type: 'monthly' | 'drop_in' | 'adjustment'
  amount: number
  period_month: number | null
  period_year: number | null
  paid_at: string
  registered_by: string
  notes: string | null
  created_at: string
}

export interface Attendance {
  id: string
  instance_id: string
  player_id: string
  status: AttendanceStatus
  marked_by: string | null
  marked_at: string
  notes: string | null
  created_at: string
}

export interface NotificationPref {
  id: string
  player_id: string
  channel: NotificationChannel
  event_type: string
  enabled: boolean
  overridden: boolean
  created_at: string
  updated_at: string
}

export interface PushSubscription {
  id: string
  player_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  last_used_at: string | null
}

// Vistas
export interface SlotInstanceAvailability {
  instance_id: string
  slot_id: string
  date: string
  day_of_week: SlotDay
  start_time: string
  end_time: string
  capacity: number
  label: string | null
  instance_status: InstanceStatus
  confirmed_count: number
  available_spots: number
  waitlist_count: number
}

export interface PlayerPaymentStatus {
  player_id: string
  display_name: string
  latest_period: number | null
  current_period: number
  payment_status: PaymentStatus
}

// Tipos de sesión y contexto de auth
export interface AuthUser {
  id: string
  email: string
  roles: UserRole[]
  status: AccountStatus
  display_name: string
  avatar_url: string | null
}

// Día de la semana en español
export const DAY_LABELS: Record<SlotDay, string> = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  current:       'Al día',
  owes_month:    'Debe el mes',
  owes_previous: 'Debe meses anteriores',
}

export interface RegistrationRequest {
  id:             string
  player_id:      string
  days_per_week:  number
  option_a:       string[]
  option_b:       string[]
  status:         RegistrationRequestStatus
  assigned_slots: string[] | null
  reviewed_by:    string | null
  reviewed_at:    string | null
  admin_notes:    string | null
  created_at:     string
}

export interface RegistrationRequestWithDetails extends RegistrationRequest {
  user_accounts?: { display_name: string; email: string; dni: string | null }
}

export interface SlotAssignment {
  id:          string
  player_id:   string
  slot_id:     string
  valid_from:  string
  valid_until: string | null
  created_at:  string
}

export interface PlanChangeRequest {
  id:                string
  player_id:         string
  slots_to_drop:     string[]
  slots_to_add:      string[]
  proposed_start_date: string
  status:            PlanChangeStatus
  reviewed_by:       string | null
  reviewed_at:       string | null
  admin_notes:       string | null
  created_at:        string
}
