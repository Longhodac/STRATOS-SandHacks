# Quick Start Guide - Groq LLM Chat

## Setup (First Time Only)

1. **Get your Groq API key**: https://console.groq.com/keys (free!)

2. **Create `.env.local` in the `frontend/` folder:**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

3. **Edit `.env.local` and add your key:**
   ```
   VITE_GROQ_API_KEY=gsk_your_key_here
   ```

4. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Using the Agent Chat

The chat sidebar on the right side now has AI-powered function calling. Just type what you want to do in natural language!

### Example Commands

**Discover Companies:**
```
find tech companies in San Francisco
discover robotics startups in Boston
search for AI companies in New York
```

**Research Contacts:**
```
research Stripe's email contacts
find emails for OpenAI
research contact info for company.com
```

**Scrape Websites:**
```
scrape emails from stripe.com
extract contacts from company.com
```

**Generate Hooks:**
```
generate a hook for this company
create an opening line for Stripe
write a hook with professional tone
```

**Deep Research:**
```
deep research on selected lead
research this lead in detail
analyze selected company
```

### How It Works

1. **You type** a natural language request
2. **Groq LLM** analyzes your intent
3. **Function calling** executes the appropriate action
4. **Result appears** in the chat with a button
5. **Click button** to navigate to detailed results

### Tips

- Be specific: "find robotics companies in Boston" is better than "find companies"
- Use company names: "research Stripe" is clearer than "research this"
- Select a lead first for hook generation and deep research
- Backend must be running at `localhost:8000` for agent actions

## Configuring the LLM

Go to **Settings → LLM Configuration** to customize:

### Model
- **llama-3.1-8b-instant**: ⚡ Ultra-fast (default, recommended)
- **llama-3.3-70b-versatile**: 🧠 Best quality (slower)
- **mixtral-8x7b-32768**: 📚 Large context window

### Temperature
- **0.0-0.3**: Focused, deterministic
- **0.4-0.7**: Balanced (default: 0.7)
- **0.8-1.0**: Creative, varied

### Max Tokens
- Response length limit (128-4096)
- Higher = longer responses
- Default: 1024

## Troubleshooting

### "GROQ_API_KEY not configured"
- Create `.env.local` file
- Add your API key
- Restart dev server

### "Cannot connect to agents backend"
- Start the Python agent service: `cd agents && python api.py`
- Check it's running at `http://localhost:8000`
- Or use chat without agent actions

### Function not executing
- Check your API key is valid
- Try resetting config in Settings
- Check browser console for errors

### Chat not responding
- Verify internet connection (Groq API is cloud-based)
- Check API key is correct
- Check browser console for errors

## System Log

The small panel at the bottom of the chat shows:
- `> Groq LLM: llama-3.1-8b-instant` - Connected
- `> Function calling enabled` - Ready
- `> Sending...` - Processing your message
- `> Executing: discover_companies` - Running function
- `> Done.` - Completed

Watch this for debugging!

## Performance

- **Speed**: <1 second response time
- **Free Tier**: 14,400 requests per day
- **Cost**: $0 with free tier
- **Tokens/sec**: 200-300 (very fast)

## Privacy

- All LLM requests go to Groq's cloud API
- Configuration stored in browser localStorage (stays on your device)
- Club profile sent as context (not stored by Groq)
- API keys never leave your browser

---

**Need help?** Check `GROQ_INTEGRATION_SUMMARY.md` for technical details or `README.md` for full documentation.
