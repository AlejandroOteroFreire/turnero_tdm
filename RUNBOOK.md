# Runbook de Setup — Turnero TDM

## Prerrequisitos
- Node.js 20+, Docker Desktop, ngrok (para desarrollo)
- Cuenta en: Supabase, Render, Meta for Developers, Upstash

---

## 1. Desarrollo Local

### 1.1 Clonar y configurar entorno

```bash
git clone <repo>
cd turnero_tdm
cp .env.local.example .env.local
# Completar .env.local con tus valores
```

### 1.2 Supabase CLI (base de datos local)

```bash
npm install -g supabase
npx supabase start           # inicia Postgres, Studio, Inbucket, Auth
npx supabase db reset        # aplica migraciones + seed
```

- **Studio:** http://localhost:54323
- **Email (Inbucket):** http://localhost:54324
- **API URL:** http://localhost:54321

Copiar las claves del output de `npx supabase status` a `.env.local`.

### 1.3 Generar claves VAPID (Web Push)

```bash
npm run vapid:generate
# Copiar VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY a .env.local
```

### 1.4 Levantar servicios con Docker Compose

```bash
docker compose up redis worker    # Redis + worker en background
npm run dev                       # Next.js en localhost:3000
```

### 1.5 Webhook Meta (ngrok)

```bash
ngrok http 3001
# Copiar la URL https://*.ngrok-free.app
# En Meta for Developers → WhatsApp → Webhooks:
#   URL: https://*.ngrok-free.app/webhooks/whatsapp
#   Verify Token: valor de META_WEBHOOK_VERIFY_TOKEN en .env.local
```

### 1.6 Importar pre-registros desde CSV

```bash
node scripts/import-csv.js scripts/pre-registros-ejemplo.csv
```

### 1.7 Generar tipos TypeScript desde el esquema

```bash
npm run db:types
```

---

## 2. Deploy en Producción (Render + Supabase Cloud)

### 2.1 Supabase Cloud

1. Crear proyecto en https://supabase.com
2. `npx supabase link --project-ref <ref>`
3. `npx supabase db push` — aplica migraciones
4. Ejecutar seed manualmente en SQL Editor (sin datos ficticios en prod)
5. En **Auth → Providers**: habilitar Google con tu `CLIENT_ID` y `CLIENT_SECRET`
6. En **Auth → URL Configuration**: `Site URL = https://tudominio.com`

### 2.2 Upstash Redis

1. Crear database en https://upstash.com
2. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`

### 2.3 Render — Web Service (App Next.js)

| Campo         | Valor                          |
|---------------|-------------------------------|
| Build Command | `npm ci && npm run build`      |
| Start Command | `npm start`                    |
| Node Version  | 20                             |

Variables de entorno: todo el contenido de `.env.local` (reemplazar URLs locales por las de producción).

### 2.4 Render — Background Worker

| Campo         | Valor                          |
|---------------|-------------------------------|
| Root Directory| `worker`                       |
| Build Command | `npm ci`                       |
| Start Command | `npm start`                    |

Variables de entorno: igual que la app pero sin las `NEXT_PUBLIC_*`.

### 2.5 Meta WhatsApp Cloud API

1. En Meta for Developers → Agregar producto WhatsApp
2. Webhook URL: `https://<worker-render-url>/webhooks/whatsapp`
3. Verify Token: el mismo de `META_WEBHOOK_VERIFY_TOKEN`
4. Suscribir a: `messages`
5. Agregar número de teléfono de prueba → obtener `META_PHONE_NUMBER_ID`

### 2.6 Health Check automático (Render Free Tier)

Render apaga servicios sin uso. Configurar un cron externo (UptimeRobot, cron-job.org) para hacer GET a `/health` del worker cada 14 minutos.

---

## 3. Variables de entorno — referencia completa

| Variable                    | App | Worker | Descripción                          |
|-----------------------------|-----|--------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`  | ✓   |        | URL pública del proyecto Supabase     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ |      | Anon key de Supabase                  |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓   | ✓      | Service role key (nunca exponer)      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✓ |      | Clave pública VAPID                   |
| `VAPID_PRIVATE_KEY`         |     | ✓      | Clave privada VAPID                   |
| `VAPID_EMAIL`               |     | ✓      | Email para VAPID                      |
| `META_ACCESS_TOKEN`         |     | ✓      | Token de acceso de Meta               |
| `META_PHONE_NUMBER_ID`      |     | ✓      | ID del número de teléfono de Meta     |
| `META_WHATSAPP_GROUP_ID`    |     | ✓      | ID del grupo de WhatsApp del club     |
| `META_WEBHOOK_VERIFY_TOKEN` |     | ✓      | Token de verificación del webhook     |
| `REDIS_URL`                 |     | ✓      | URL de Redis (local)                  |
| `UPSTASH_REDIS_REST_URL`    |     | ✓      | URL REST de Upstash (producción)      |
| `UPSTASH_REDIS_REST_TOKEN`  |     | ✓      | Token de Upstash (producción)         |
| `WORKER_URL`                | ✓   |        | URL interna del worker                |
| `APP_URL`                   |     | ✓      | URL pública de la app Next.js         |
| `RESEND_API_KEY`            | ✓   |        | API key de Resend (solo en prod)      |

---

## 4. Checklist de go-live

- [ ] Migraciones aplicadas en Supabase Cloud
- [ ] Variables de entorno configuradas en Render
- [ ] Google OAuth configurado y testeado
- [ ] Webhook Meta verificado con ngrok → cambiar a URL de Render
- [ ] Generar e instalar íconos PWA (reemplazar placeholders en `/public/icons/`)
- [ ] Testear flujo completo: registro DNI → reserva → lista de espera → WA SI/NO
- [ ] Configurar UptimeRobot para health check del worker
- [ ] Primer import CSV de pre-registros reales
