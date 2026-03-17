# Spotify Playlist Creator (Powered by [Spotified by Abdullah Malik](https://github.com/Abdullah-Malik/spotified))

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Dan5py/react-vite-ui/blob/main/LICENSE)

Turn your Spotify vibes into slick playlists in seconds. Playlist Creator v2 is a React + Vite + TypeScript app styled with Tailwind CSS and shadcn/ui—your personal Spotify wizard 🧙‍♂️✨.

---

## What Is This?

- 🔍 **Search** tracks, artists or albums via the Spotify API
- ➕ **Queue** your faves into a draft playlist
- 🚀 **Publish** a brand-new playlist straight to your Spotify account

No more copy-pasting song links—just type, click, and jam. 🎶

---

## Quick Start (npm Only)

1. **Clone the repo**
   ``` bash
   git clone https://github.com/Atlessc/playlist-creator-v2.git
   cd playlist-creator-v2
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Get your Spotify creds**

   - Hit up the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create an app → grab **Client ID** & **Client Secret**
   - Set Redirect URI → `https://10.0.0.195:5173/callback`
4. **Create your `.env`**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   ```bash
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
   VITE_REDIRECT_URI=https://10.0.0.195:5173/callback
   ```
6. **Run in dev mode**
   ```bash
   npm run dev2
   ```
   Open [https://10.0.0.195:5173/](https://10.0.0.195:5173/) — no shit, you’re ready to build. 🤘
7. **Build for prod**
   ```bash
   npm run build
   npm run preview
   ```
---

## How It Works: The Tech Deep Dive

### 1. Spotify Auth (Auth Code Flow)

- User clicks “Log in with Spotify” → Spotify login screen
- Spotify redirects back to `/callback?code=…`
- We swap that `code` for an access token in `src/server/auth.ts`
- Tokens chill in `sessionStorage` so you can keep adding tracks until you close the tab

```typescript
// src/server/auth.ts
export async function exchangeCodeForToken(code: string) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
    }),
  });
  return res.json();
}
```

### 2. App Architecture

```text
playlist-creator-v2/
├── public/                # Static assets (favicon, index.html)
├── src/
│   ├── components/        # shadcn/ui + custom UI bits
│   ├── pages/
│   │   ├── App.tsx        # root & router outlet
│   │   └── Callback.tsx   # handles Spotify `code`
│   ├── server/            # Vite worker helpers
│   │   └── auth.ts        # token exchange + refresh
│   ├── styles/            # Tailwind imports & globals.css
│   ├── utils/             # fetch wrappers & TS interfaces
│   └── main.tsx           # React entry point
├── tailwind.config.ts     # Tailwind + shadcn presets
├── postcss.config.js      # autoprefixer
├── vite.config.ts         # Vite + env var mapping
└── package.json           # npm scripts & deps
```

### 3. Key Configs

#### `tailwind.config.ts`

```typescript
import { shadcnPreset } from "shadcn-ui";
export default {
  presets: [shadcnPreset()],
  content: ["./src/**/*.{ts,tsx}", "./components.json"],
  theme: { extend: {} },
};
```

#### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "process.env": {} },
});
```

#### `package.json` (npm scripts only)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{js,ts,tsx}\" --fix"
  }
}
```

---

## Tips & Tricks

- **Debounce your searches** to dodge Spotify rate limits
- If you switch ports, update `VITE_REDIRECT_URI` in both Spotify Dashboard & `.env`
- Wrap your fetches in `try/catch` & toast errors with shadcn’s `<Toast />`

---

## License

MIT © 2025 Atlessc 🤘


## CHANGE LOG

FUCK SPOTIFY FOR NOT LETTING ME USE `localhost` FOR REDIRECT URIs. I’M SICK OF THIS BULLSHIT. IF YOU’RE READING THIS, JUST KNOW I HATE SPOTIFY AND THEIR STUPID DEVELOPER DASHBOARD. THEY’RE THE WORST. I HOPE THEIR SERVICE CRASHES AND THEY LOSE ALL THEIR USERS.

tysm