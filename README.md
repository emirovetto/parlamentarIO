# parlamentarIO

Sistema integral de gestión legislativa y parlamentaria para concejos deliberantes de Argentina,
alineado con la Ley Orgánica de Municipalidades de Santa Fe (N° 2756), la Ley de Firma Digital (25.506),
la Ley de Protección de Datos Personales (25.326) y la Ley de Accesibilidad Web (26.653).

## Módulos

- **Portal público (Gobierno Abierto)**: home institucional, perfiles de concejales con estadísticas,
  Digesto Legislativo con búsqueda full-text en español, sesiones con orden del día / actas / video con
  marcas de tiempo, transparencia activa (Boletín Oficial, DDJJ, salarios, presupuesto) y participación
  ciudadana (Banca del Ciudadano y audiencias públicas).
- **Backoffice (RBAC)**: mesa de entradas digital con numeración automática, workflow legal del expediente
  (máquina de estados con promulgación automática a los 10 días hábiles sin veto), comisiones y dictámenes
  con firma electrónica interna (hash SHA-256), armado de Orden del Día con drag & drop, recinto digital
  (quórum, cronómetro de palabra, mociones) y votación electrónica en vivo desde cualquier dispositivo.
- **Auditoría**: registro inmutable (append-only) de cada acción del sistema.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Auth.js v5 · Tailwind CSS 4 · Zod 4 · dnd-kit

## Desarrollo local

Requisitos: Node 22+, Docker (para Postgres local).

```bash
# 1. Base de datos
docker run -d --name pio-postgres -e POSTGRES_USER=pio -e POSTGRES_PASSWORD=pio \
  -e POSTGRES_DB=parlamentario -p 5432:5432 postgres:16-alpine

# 2. Variables de entorno (.env)
#    DATABASE_URL="postgresql://pio:pio@localhost:5432/parlamentario"
#    AUTH_SECRET="<openssl rand -hex 32>"
#    AUTH_TRUST_HOST="true"

# 3. Instalar, migrar y sembrar
npm install
npm run db:push
npm run db:seed

# 4. Levantar
npm run dev
```

Usuarios de demostración (contraseña `parlamentario2026`):

| Usuario | Rol |
| --- | --- |
| `admin@concejo.gob.ar` | Administrador |
| `secretaria.parlamentaria@concejo.gob.ar` | Secretaria Parlamentaria |
| `lfernandez@concejo.gob.ar` | Presidenta del Concejo (vota) |
| `jsosa@concejo.gob.ar` | Concejal (vota) |

## Deploy en Render (plan free)

El repositorio incluye un blueprint [`render.yaml`](render.yaml) que crea el servicio web y la base
PostgreSQL. Pasos:

1. Subir el repositorio a GitHub/GitLab.
2. En Render: **New → Blueprint** y seleccionar el repo (o crear los recursos vía API).
3. Render genera `AUTH_SECRET` y conecta `DATABASE_URL` automáticamente.

Limitaciones del plan free a tener en cuenta:

- El servicio "duerme" tras 15 minutos sin tráfico (el primer acceso tarda ~30-60 s).
- La base PostgreSQL free expira a los 30 días si no se pasa a un plan pago.
- Los PDF se almacenan en la base (límite 4 MB por archivo); para producción real conviene object storage.

## Seguridad

- **Nunca** commitear `.env` ni API keys (el `.gitignore` ya excluye `.env*`).
- La firma de dictámenes registra hash SHA-256 + firmante + timestamp; la integración con tokens PKI
  de una AC licenciada (Ley 25.506) queda como punto de extensión en `firmarDictamen`.
- Los expedientes marcados como sensibles solo muestran su "versión pública" anonimizada en el portal
  (Ley 25.326).
