# Setlist Builder

A single-user Next.js app for turning a master song/lyrics document into saved show setlists and Google Docs exports.

## Features

- Import a master Google Doc or pasted master text into a local song catalog.
- Search, create, edit, duplicate, and delete songs.
- Build 1, 2, or 3 set shows with drag and drop.
- Save and reopen setlists.
- Toggle Light/Dark mode.
- Export two Google Docs per saved setlist:
  - Compact setlist
  - Full lyrics and performance notes

## Setup

Use Node 22 LTS for the most predictable local setup:

```bash
nvm use
```

```bash
npm install
cp .env.example .env.local
npm run prisma:migrate -- --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google Drive Export

Create a Google Cloud OAuth client and set:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
```

The OAuth client needs this authorized redirect URI:

```text
http://localhost:3000/api/google/callback
```

Then use **Connect Drive** in the app. Optionally paste a Google Drive folder ID into Settings to route generated docs into that folder.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate
```
