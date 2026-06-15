# 🍪 ByteMe

**Sistema de gestión interno para un negocio artesanal de alimentos.** Controlá ingredientes, recetas, márgenes de ganancia, stock de productos terminados, bandejas y ventas — todo desde una app mobile-first pensada para el día a día del negocio.

> **Branding:** ByteMe. El repo en GitHub conserva el nombre histórico Mordisquitos por compatibilidad con PRs y remote ya configurado.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| **Ingredientes** | Registrá compras de materia prima (gramos + precio). El costo por kg, por 100g y por unidad se calcula automáticamente. |
| **Recetas** | Definí productos con sus ingredientes y cantidades. Soporta **sub-recetas** (recetas usadas como ingredientes de otras). El costo de producción se calcula en tiempo real. |
| **Márgenes de ganancia** | Administrá reglas de margen (presets y personalizadas) para calcular precios de venta sugeridos. |
| **Stock y Ventas** | Llevá el stock de productos terminados, registrá ventas y visualizá métricas de ganancia semanal/mensual. |
| **Bandejas** | Agrupá varias recetas en una bandeja con precio combinado. |
| **Historial** | Consultá todas las ventas con filtros por fecha y estadísticas agregadas. |
| **Calculadora** | Herramientas de cálculo rápido (peso↔precio) para el día a día. |
| **Multi-tenant** | Cada usuario tiene su propia base de datos. Login por PIN, sin JWT, sin cookies. |

---

## 🏗️ Arquitectura

Monorepo con **pnpm workspaces** organizado en tres paquetes:

```
byteme/
├── client/     → React 18 + Vite 5 + TypeScript (PWA)
├── server/     → Express 4 + Mongoose 8 + TypeScript
└── shared/     → Tipos e interfaces compartidos (@byteme/shared)
```

### Stack

| Capa | Tecnología | Versión |
|---|---|---|
| **Frontend** | React, Vite, TypeScript | 18.3 / 5.4 / 5.7 |
| **Backend** | Express, Mongoose, TypeScript | 4.21 / 8.9 / 5.7 |
| **Base de datos** | MongoDB | — |
| **Auth** | Header `x-app-token` con timing-safe comparison | — |
| **Multi-tenant** | Una DB por usuario, vía `AsyncLocalStorage` | — |
| **Deploy** | Vercel (frontend + serverless functions) | — |
| **Monorepo** | pnpm workspaces | 9.15.4 |

### Design System

Paleta artesanal inspirada en tonos cálidos:

- 🟤 **Terracotta** `#ce631b` — color primario
- 🟫 **Dark Terracotta** `#963c0a` — color secundario
- 🟡 **Golden Amber** `#dda15e` — acentos
- 🟢 **Cream** `#fefae0` — fondo neutral

Tipografías: **Noto Serif** (headlines) + **Manrope** (cuerpo).

Definidos como CSS custom properties en `client/src/styles/design-tokens.css`.

---

## 🚀 Inicio rápido

### Requisitos previos

- **Node.js** >= 20
- **pnpm** >= 9
- **MongoDB** (local o Atlas)

### Instalación

```bash
git clone https://github.com/JuanDedossi/ByteMe.git
cd ByteMe
pnpm install
```

### Variables de entorno

Creá un archivo `.env` en `server/`:

```env
MONGODB_URI=mongodb://localhost:27017/byteme
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Auth — modo single-tenant
APP_SECRET=tu_pin_secreto

# Auth — modo multi-tenant
USERS=[{"pin":"1234","dbName":"byteme-juan","label":"juan"}]
```

### Desarrollo

```bash
# Levantar client + server en paralelo
pnpm dev

# Solo frontend (localhost:5173)
pnpm dev:client

# Solo backend (localhost:3001)
pnpm dev:server
```

### Build

```bash
pnpm typecheck       # Validar TypeScript en los 3 paquetes
pnpm build:client    # Vite build del client
pnpm build:server    # tsc → dist/
```

---

## 📁 Estructura del proyecto

```
├── api/                  # Entry point serverless (Vercel)
├── client/
│   └── src/
│       ├── components/   # auth, common, ingredients, layout, profits,
│       │                 # recipes, sales, stock, trays
│       ├── pages/        # 7 páginas + 1 login
│       ├── services/     # Capa de servicios (API calls)
│       ├── styles/       # Design tokens + estilos globales
│       └── types/        # Tipos del frontend
├── server/
│   └── src/
│       ├── config/       # tenants.ts (multi-tenant config)
│       ├── middleware/   # auth, tenant-context (AsyncLocalStorage)
│       ├── models/       # 6 schemas Mongoose
│       │                 # (Ingredient, PurchaseHistory, Recipe,
│       │                 #  Sale, ProfitRule, Tray)
│       ├── routes/       # 7 routers Express
│       └── services/     # Lógica de negocio
├── shared/
│   └── src/
│       └── types/        # Tipos compartidos (@byteme/shared)
├── vercel.json           # Configuración de deploy
└── pnpm-workspace.yaml   # Configuración del monorepo
```

---

## 🔐 Auth y Multi-tenant

- **Login por PIN** — cada usuario tiene un PIN propio. Sin JWT, sin cookies: el PIN viaja en el header `x-app-token` y se valida con `crypto.timingSafeEqual`.
- **Una DB por tenant** — cada PIN mapea a una base MongoDB distinta. Las queries operan sobre la DB del usuario autenticado vía `AsyncLocalStorage`.
- **Config vía env** — `USERS=[{pin, dbName, label}]` para multi-tenant, o `APP_SECRET` para un solo usuario.
- **Dev mode** — si no hay tenants configurados, no se exige auth.

---

## 📐 Decisiones de diseño

- **Stock de recetas y bandejas, no de ingredientes** — Los ingredientes solo tienen costo. El stock es de productos terminados (recetas y bandejas) y se gestiona manualmente.
- **Sub-recetas** — Una receta puede usar otra receta como ingrediente, vía `Recipe.ingredients[].type: 'subRecipe'`.
- **Custom selling price** — Cada receta y bandeja puede tener un precio custom que override el cálculo automático del margen activo.
- **Cálculo automático de precios** — Al registrar una compra de ingrediente, se recalculan los costos y precios de todas las recetas que lo usan.
- **Multi-tenant con DBs separadas** — Aislamiento total por usuario. Una DB por PIN.
- **Respuestas API estandarizadas** — `{ success, data, message? }` para individuales; `{ success, data, total, page, totalPages }` para paginados.
- **PWA-ready** — Configurado con `vite-plugin-pwa` para uso offline.

---

## 📄 Licencia

MIT

---

<p align="center">
  Hecho con 🧡 para los que cocinan con pasión
</p>
