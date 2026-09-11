# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately
- API: Vite sirve `/api/*` contra un archivo SQLite local en `data/dchoco.sqlite`

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `src/auth.tsx` - Sesión de login en el cliente
- `src/views/Login.tsx` - Pantalla de acceso / primer usuario
- `src/store.tsx` - Client store; carga y muta datos vía `/api`
- `src/api.ts` - Cliente HTTP de la API
- `src/types.ts` - Tipos de insumos, recetas y pedidos
- `src/server/app.ts` - API Hono (único servidor)
- `src/server/auth-repo.ts` - Usuarios y sesiones SQLite
- `src/server/password.ts` - Hash PBKDF2 de contraseñas
- `src/server/repo.ts` - Consultas SQLite
- `src/server/db.ts` - Adaptador D1 (Cloudflare) y esquema
- `src/worker.ts` - Entrypoint de Cloudflare Workers (Hono + D1)
- `src/server/sqlite-local.ts` - SQLite local para `vite dev`
- `functions/api/[[path]].ts` - Alternativa Pages Functions (no se usa en el deploy a Workers)
- `migrations/` - Migraciones D1 (`0001_init.sql`, `0002_auth.sql`)
- `wrangler.toml` - Worker, assets SPA y binding D1
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, Figma Make plugins, `@` alias, and the SQLite API plugin
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Deploy (Cloudflare Workers)

Producción: un Worker sirve `/api/*` y los estáticos de Vite. SQLite es **Cloudflare D1**.

1. `npx wrangler login`
2. `npx wrangler d1 create dchoco` y pegar el `database_id` en `wrangler.toml`
3. `npx wrangler d1 migrations apply dchoco --remote`
4. `npx vite build`
5. `npx wrangler deploy`

## Dependencies

- Runtime: React 19, React DOM 19, Hono
- Database: `node:sqlite` in local Vite; Cloudflare D1 in Pages
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
