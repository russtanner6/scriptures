# Scripture Explorer — Project Guide

## What is this?
A Next.js web app for searching and exploring scriptures with interactive visualizations, verse modals, and volume-based filtering.

## Project Locations
- **Mac Studio:** `/Users/rmt-mac-studio/Projects/Scripture Explorer/`
- **External Drive (Samsung 4T):** `/Volumes/Samsung 4T/Projects/Scripture Explorer/`
- **Other devices:** `git clone https://github.com/russtanner6/scriptures.git "Scripture Explorer"` then update this list

## Git Repository
**Repository:** `https://github.com/russtanner6/scriptures.git` (branch: `main`)

**Workflow — always do this:**
1. **Before working:** `git pull` (get latest changes)
2. **After working:** `git add -A && git commit -m "description" && git push` (save changes)
3. **New device:** `git clone https://github.com/russtanner6/scriptures.git "Scripture Explorer"`

**Update documentation BEFORE committing.**

## Tech Stack
- **Next.js 16** (App Router)
- **React 19 + TypeScript**
- **Tailwind CSS** (styling)
- **Chart.js + react-chartjs-2** (visualizations)
- **sql.js** (client-side SQLite for scripture data)
- **tsx** (script runner for `build-db`)

## Dev Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run build-db     # Rebuild scripture database
```

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Main search/explore page
│   ├── layout.tsx    # Root layout
│   ├── narrative-arc/ # Narrative arc feature
│   └── api/          # API routes
├── components/       # React components
├── lib/              # Utilities, helpers
data/                 # Scripture data files
scripts/              # Build scripts (build-db.ts)
```
