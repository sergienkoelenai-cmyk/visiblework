# VisibleWork — Family Task Manager

A tablet-first PWA for household task management with virtual currency rewards.

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project called "visiblework"
3. **Enable Firestore**: Build → Firestore Database → Create database (Start in test mode)
4. **Enable Storage**: Build → Storage → Get started (Start in test mode)
5. **Add a web app**: Project Settings → General → Add app → Web
6. Copy the config values

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

Connect this repo to Vercel and set the environment variables in the Vercel dashboard.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Vanilla CSS (dark theme)
- **Backend**: Firebase (Firestore + Storage)
- **PWA**: vite-plugin-pwa (offline support, Add to Home Screen)

## Features

- ✅ Family member profiles with photo avatars
- ✅ Ad-hoc (one-time) tasks
- ✅ Recurring tasks (3 schedule types)
- ✅ Virtual currency (€) rewards for completing tasks
- ✅ Cash out tracking
- ✅ Always-on tablet mode (PWA full-screen)
- ✅ Dark mode optimized for OLED
