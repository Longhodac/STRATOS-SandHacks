# CLAUDE.md — S.T.R.A.T.O.S. (Outreach Edition)

This file provides persistent, project-specific context for Claude Code while working in this repository.

## 0) What you are building

**App name:** S.T.R.A.T.O.S. (The Outreach Edition)
**Meaning:** Strategic Tailored Research & Agentic Team Outreach System
**Product:** Club marketing tool to automate sponsorship outreach and club collaborations.

**Current Status:** Frontend MVP prototype built with React + Vite.

## 1) Tech Stack

### Frontend
- React 19.2.4 with TypeScript
- Vite 6.2.0 for build tooling
- React Router DOM 7.13.0 for navigation

### AI Integration
- Google Generative AI (@google/genai 1.39.0)
- API key stored in .env.local as GEMINI_API_KEY

### UI Guidelines
- Dark-mode-first near-black (IDE-like), minimalist, black/white/gray.
- No gradients, no many colors, no decorative visuals.
- One primary CTA per page.

## 2) Project Structure

```
/
├── App.tsx                    # Main app component with routing
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── types.ts                   # TypeScript type definitions
├── components/
│   └── Layout.tsx            # Main layout component
├── services/
│   └── geminiService.ts      # Google Generative AI service
├── views/
│   ├── Home.tsx              # Home/dashboard view
│   ├── DataScan.tsx          # Data scanning interface
│   ├── Sponsors.tsx          # Sponsor management
│   ├── Advisor.tsx           # AI advisor interface
│   ├── Analytics.tsx         # Analytics dashboard
│   └── Settings.tsx          # App settings
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite build config
└── .env.local                # Environment variables (GEMINI_API_KEY)
```

## 3) Current Features

The app currently has basic navigation between different views:
- Home dashboard
- Data scanning functionality
- Sponsor management
- AI advisor
- Analytics
- Settings

## 4) Development Workflow

### Setup
1. Install dependencies: `npm install`
2. Set up environment: Add GEMINI_API_KEY to .env.local
3. Run dev server: `npm run dev`
4. Build for production: `npm run build`
5. Preview production build: `npm run preview`

### File Organization
- Put reusable components in `/components`
- Put page-level views in `/views`
- Put API/service logic in `/services`
- Define shared types in `types.ts`

## 5) How Claude should work in this repo

Rules:
- This is a frontend-only prototype, no backend infrastructure yet
- Keep components simple and focused
- Use TypeScript for type safety
- Follow the dark minimalist UI guidelines
- All AI interactions go through geminiService.ts
- Store only necessary state in components
- Prefer small, reviewable changes

When adding features:
- Update types.ts if new types are needed
- Keep the UI minimal and functional
- Test with `npm run dev` before committing
