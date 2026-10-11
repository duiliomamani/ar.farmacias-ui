# FarmaYa AR — frontend

Frontend Next.js 16 para consultar farmacias de turno y permanentes de Jujuy.

La documentación completa de arquitectura y flujos está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Funcionalidades

- Consulta por geolocalización, radio, fecha y localidad.
- Mapa Leaflet con tiles de Google en vista de calles.
- Marcadores para turnos diarios y farmacias permanentes.
- Routing en auto, caminando y bicicleta con instrucciones paso a paso.
- Enlace de navegación y Street View en Google Maps.
- Monitor de última ejecución del scraper.
- Feedback protegido con Cloudflare Turnstile.
- BFF interno para que el navegador no llame directamente al core.
- UI basada en shadcn/ui `base-nova` y `@base-ui/react`.

## Instalación

```bash
pnpm install
```

Crear `.env.local`:

```env
FARMACIAS_API_URL=http://localhost:5001
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
```

Iniciar:

```bash
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

## BFF

El frontend expone estas rutas internas:

```text
GET  /api/pharmacies/nearby
GET  /api/pharmacies/by-date
GET  /api/scraping/turnos-jujuy/status
POST /api/feedback
GET  /api/health
```

Los servicios del cliente usan `lib/bff-client.ts`; no se debe agregar una llamada directa al core desde un componente.

## Estructura

```text
app/                    App Router y Route Handlers BFF
components/pharmacy/    Buscador, cards, mapa, routing y monitor
components/ui/          Componentes shadcn/ui base-nova
lib/bff-client.ts       Cliente HTTP público del BFF
lib/server/             Proxy server-side hacia el core
lib/services/            Servicios de dominio del frontend
```

Si se cambia alguna variable `NEXT_PUBLIC_*`, hay que reiniciar Next.js.
