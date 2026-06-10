import { createClient } from '@/lib/supabase/server'
import { ConfiguracionClient } from '@/components/admin/ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = createClient()

  // Carga toda la config — el cliente separa general vs notificaciones
  const { data: configs } = await supabase
    .from('app_config')
    .select('key, value')

  const configMap = Object.fromEntries(
    (configs ?? []).map(c => [c.key, c.value])
  )

  return <ConfiguracionClient configMap={configMap} />
}
