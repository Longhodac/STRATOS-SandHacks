# S.T.R.A.T.O.S. (Outreach Edition) — Frontend

Strategic Tailored Research & Agentic Team Outreach System

A club marketing tool for outreach: club collaborations and sponsor partnerships.

## Tech Stack

- **React 19.2.4** with TypeScript
- **Vite 6.2.0** for build tooling
- **React Router DOM 7.13.0** for navigation
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (new-york style)
- **Groq API** for LLM-powered chat with function calling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your API keys:

```env
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Get API Keys:**
- **Groq**: https://console.groq.com/keys (free tier available)
- **Gemini**: https://ai.google.dev/ (optional, fallback only)

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

### 5. Preview Production Build

```bash
npm run preview
```

## Features

### AI-Powered Agent Sidebar

The right-side chat sidebar uses **Groq's LLM** (llama-3.1-8b-instant by default) with **function calling** to execute app actions:

- **Discover companies**: "find robotics companies in Boston"
- **Research contacts**: "research Stripe's email contacts"
- **Scrape websites**: "scrape emails from company.com"
- **Generate hooks**: "generate a hook for this company"
- **Deep research**: "deep research on selected lead"

The LLM intelligently parses user intent and calls the appropriate backend agent functions.

### Backend Integration

The frontend connects to Python agent services at `http://localhost:8000`:

- **Company Discovery** (`/discovery/*`) - Find companies by industry keyword
- **Email Research** (`/research`) - Research company emails using Perplexity
- **Website Scraper** (`/scraper/*`) - Scrape websites for email addresses

Make sure to run the backend agents before using these features. See `../agents/README.md` for setup.

## Configuration

### LLM Configuration

Configure the AI model in **Settings → LLM Configuration**:

- **Model**: 
  - `llama-3.1-8b-instant` (ultra-fast, recommended)
  - `llama-3.3-70b-versatile` (best quality)
  - `mixtral-8x7b-32768` (large context)
- **Temperature**: 0.0 (focused) to 1.0 (creative)
- **Max Tokens**: Response length limit (128-4096)

Settings are saved to browser localStorage.

### Club Profile

Configure your club information in **Settings → Club Profile**:

- Club name
- Mission statement
- Active interests (tags for AI context)

This information is used by the AI to personalize outreach suggestions.

## Project Structure

```
frontend/
├── App.tsx                    # Main app with routing
├── index.tsx                  # Entry point
├── types.ts                   # TypeScript type definitions
├── components/
│   ├── Layout.tsx            # Main layout
│   ├── AgentSidebar.tsx      # AI chat sidebar with function calling
│   └── ui/                   # shadcn components
├── services/
│   ├── llmProvider.ts        # Groq LLM adapter
│   ├── agentFunctions.ts     # Function call executor
│   ├── agentsService.ts      # Backend API client
│   └── geminiService.ts      # Mock utility functions
├── lib/
│   ├── LLMConfigContext.tsx  # LLM configuration state
│   ├── ClubProfileContext.tsx
│   ├── FocusContext.tsx
│   └── ...                   # Other context providers
├── views/
│   ├── Home.tsx              # Dashboard
│   ├── Agents.tsx            # Agent management
│   ├── Settings.tsx          # Configuration
│   └── ...                   # Other views
└── .env.local                # Environment variables (not tracked)
```

## Development Notes

- The app uses **HashRouter** for GitHub Pages compatibility
- All AI interactions go through `llmProvider.ts`
- Function calling enables chat-driven actions
- Backend connection is optional (graceful degradation)
- Dark mode only, minimalist design

## Troubleshooting

### "GROQ_API_KEY not configured"

Make sure you have created `.env.local` with your Groq API key:

```env
VITE_GROQ_API_KEY=gsk_...
```

Restart the dev server after adding the key.

### "Cannot connect to agents backend"

The Python agent services need to be running at `http://localhost:8000`. See `../agents/README.md` for setup instructions.

You can still use the frontend without the backend - the chat will work but agent actions (discover, research, scrape) won't execute.

### Function calls not working

1. Check that your Groq API key is valid
2. Verify the model supports function calling (llama-3.1-8b-instant does)
3. Check browser console for errors
4. Try resetting LLM config in Settings

## License

MIT
