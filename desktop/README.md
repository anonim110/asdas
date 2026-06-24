# Murmur — Desktop app (Electron)

A native desktop wrapper for the Murmur social network. By default it opens the
already-deployed production site (`https://murmur-social.onrender.com`) in its
own window — no browser, no tabs. Because the production server serves the React
client and the API from the same origin, login, realtime, and uploads all work
exactly like the website.

## Run from source

```bash
cd desktop
npm install        # downloads Electron (~once)
npm start          # opens the live site in a desktop window
```

### Modes

| Command         | What it loads                                                        |
| --------------- | ------------------------------------------------------------------- |
| `npm start`     | The live site (`https://murmur-social.onrender.com`) — the default. |
| `npm run dev`   | The local Vite dev server (`http://localhost:5173`). Run the web dev servers first (`npm run dev:client` / `dev:server` in the repo root). |
| `npm run local` | A fully **offline** copy: boots the bundled backend on SQLite and loads `http://localhost:4000`. |

Override the remote target without rebuilding:

```bash
MURMUR_URL=https://your-host.example npm start     # macOS/Linux
set MURMUR_URL=https://your-host.example&& npm start  # Windows cmd
```

## Build a distributable

### Standalone folder (works everywhere, recommended)

```bash
npm run package
```

Produces `release/Murmur-win32-x64/` containing `Murmur.exe`. Zip that folder
and share it — users just run `Murmur.exe`, nothing to install. For macOS/Linux
change `--platform`/`--arch` in the `package` script (`darwin`/`linux`,
`x64`/`arm64`).

### NSIS installer (`.exe` setup wizard)

```bash
npm run dist
```

Uses `electron-builder`. On Windows this needs **Developer Mode** enabled
(Settings → Privacy & security → For developers) *or* an Administrator
terminal, because it extracts code-signing tooling that contains symlinks.
Without that it fails on `winCodeSign`; use `npm run package` instead.

## Offline mode notes (`--local`)

`npm run local` needs the local assets built once:

```bash
npm run build:local-assets
```

This builds the client for desktop (same-origin) and compiles the server. The
offline app then:

- stores its SQLite database and JWT secrets under the user's app-data dir
  (seeded from `server/prisma/template.db` on first launch),
- runs the backend with `NODE_ENV=production DESKTOP=1` so cookies stay
  `SameSite=Lax`/non-secure for `http://localhost` and uploads are persisted in
  the database.

Packaging the offline backend into an installer is not wired up by default
(`npm run package` ships only the remote wrapper) to keep the download small.
