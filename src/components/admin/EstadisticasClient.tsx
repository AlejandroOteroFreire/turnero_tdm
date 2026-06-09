'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface WeeklyData { week: string; present: number; absent: number; cancelled: number }
interface PaymentDist { current: number; owes_month: number; owes_previous: number }

const PIE_COLORS = ['#1E7A34', '#D97706', '#DC2626']

export function EstadisticasClient({
  weeklyData,
  paymentDist,
}: { weeklyData: WeeklyData[]; paymentDist: PaymentDist }) {

  const pieData = [
    { name: 'Al día',               value: paymentDist.current },
    { name: 'Debe el mes',           value: paymentDist.owes_month },
    { name: 'Debe meses anteriores', value: paymentDist.owes_previous },
  ]

  function downloadCSV() {
    const rows = weeklyData.map(w =>
      `${w.week},${w.present},${w.absent},${w.cancelled}`
    )
    const csv  = `Semana,Presentes,Ausentes,Cancelados\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `asistencia-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Estadísticas</h1>
        <button onClick={downloadCSV} className="btn-secondary text-xs">
          Exportar CSV
        </button>
      </div>

      {/* Asistencia semanal */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Asistencia — últimas 8 semanas</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickFormatter={v => v.slice(5)}  // MM-DD
            />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="present"   name="Presentes"  fill="#1E7A34" radius={[3, 3, 0, 0]} />
            <Bar dataKey="absent"    name="Ausentes"   fill="#D97706" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cancelled" name="Cancelados" fill="#6B7280" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Estado de pagos */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Estado de pagos</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${value}`}
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Legend
              formatter={(value) => <span style={{ color: '#D1D5DB', fontSize: 11 }}>{value}</span>}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </section>

      {/* Totales rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total presentes', value: weeklyData.reduce((s, w) => s + w.present, 0), color: 'text-green-400' },
          { label: 'Ausentes',        value: weeklyData.reduce((s, w) => s + w.absent, 0),  color: 'text-amber-400' },
          { label: 'Cancelaciones',   value: weeklyData.reduce((s, w) => s + w.cancelled, 0), color: 'text-gray-400' },
          { label: 'Jugadores activos', value: pieData.reduce((s, d) => s + d.value, 0),    color: 'text-white' },
        ].map(stat => (
          <div key={stat.label} className="card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
