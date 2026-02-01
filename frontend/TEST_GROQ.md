# Testing Groq Integration

## Prerequisites

1. Groq API key added to `.env.local`
2. Dev server running (`npm run dev`)
3. Backend agents running at `localhost:8000` (optional, for function calling tests)

## Quick Test Commands

### Test 1: Basic Chat Response

**Steps:**
1. Open app → right sidebar chat
2. Type: "Hello, can you help me?"
3. Press Enter

**Expected Result:**
- Response appears within 1-2 seconds
- System log shows:
  ```
  > Sending...
  > Response received.
  ```

**Pass/Fail:** ⬜

---

### Test 2: Discover Companies Function

**Steps:**
1. Type: "find robotics companies in Boston"
2. Press Enter

**Expected Result:**
- System log shows: `> Executing: discover_companies`
- Response includes: "✓ Found X robotics companies in Boston"
- "View in Agents Tab" button appears
- Click button navigates to /agents

**Note:** Requires backend running at `localhost:8000`

**Pass/Fail:** ⬜

---

### Test 3: Research Company Function

**Steps:**
1. Type: "research Stripe's email contacts"
2. Press Enter

**Expected Result:**
- System log shows: `> Executing: research_company`
- Response includes: "✓ Researched Stripe. Found X emails"
- "View in Agents Tab" button appears

**Note:** Requires backend running at `localhost:8000`

**Pass/Fail:** ⬜

---

### Test 4: Generate Hook Function

**Steps:**
1. Select a lead first (click on a company in the main area)
2. Type: "generate a hook for this company"
3. Press Enter

**Expected Result:**
- System log shows: `> Executing: generate_hook`
- Response includes personalized hook text
- Hook reasoning is displayed

**Pass/Fail:** ⬜

---

### Test 5: Scrape Website Function

**Steps:**
1. Type: "scrape emails from stripe.com"
2. Press Enter

**Expected Result:**
- System log shows: `> Executing: scrape_website`
- Response includes: "✓ Scraped stripe.com. Found X emails"
- "View in Agents Tab" button appears

**Note:** Requires backend running at `localhost:8000`

**Pass/Fail:** ⬜

---

### Test 6: Error Handling - Vague Request

**Steps:**
1. Type: "find companies" (intentionally vague)
2. Press Enter

**Expected Result:**
- Should ask for clarification OR attempt to discover companies with generic query
- No crashes or error messages

**Pass/Fail:** ⬜

---

### Test 7: Settings Configuration

**Steps:**
1. Navigate to Settings → LLM Configuration
2. Change model to "Llama 3.3 70B (Best Quality)"
3. Adjust temperature slider
4. Click "Reset to Defaults"

**Expected Result:**
- Model dropdown works
- Temperature slider updates value display
- Reset button restores defaults
- Settings persist after page refresh

**Pass/Fail:** ⬜

---

## Troubleshooting

### Error: "GROQ_API_KEY not configured"

**Cause:** API key missing or incorrect in `.env.local`

**Solution:**
1. Check `.env.local` exists in `frontend/` directory
2. Verify key starts with `gsk_`
3. Restart dev server: `Ctrl+C` then `npm run dev`

---

### Error: "Cannot connect to agents backend"

**Cause:** Backend service not running

**Solution:**
1. Start backend: `cd agents && python api.py`
2. Verify running at `http://localhost:8000`
3. Check backend logs for errors

**Alternative:** Test without backend - basic chat will still work

---

### No response in chat

**Possible Causes:**
- Invalid API key
- Network connectivity issue
- Groq API rate limit hit

**Debug Steps:**
1. Open browser console (F12)
2. Check for errors in Console tab
3. Check Network tab for failed requests
4. Look for 401 (unauthorized) or 429 (rate limit) errors

---

### Function calls not executing

**Possible Causes:**
- Backend offline
- Invalid function arguments
- LLM not detecting function call intent

**Debug Steps:**
1. Check system log for error messages
2. Verify backend is running
3. Try more explicit command: "use the discover_companies function to find tech companies"
4. Check browser console for errors

---

## Performance Benchmarks

Expected performance with `llama-3.1-8b-instant`:

| Metric | Expected Value |
|--------|----------------|
| Response time (simple chat) | < 1 second |
| Response time (function call) | 1-3 seconds |
| Tokens per second | 200-300 |
| Free tier limit | 14,400 requests/day |

---

## Test Results Summary

Date: ___________

| Test | Status | Notes |
|------|--------|-------|
| Basic Chat | ⬜ Pass ⬜ Fail | |
| Discover Companies | ⬜ Pass ⬜ Fail | |
| Research Company | ⬜ Pass ⬜ Fail | |
| Generate Hook | ⬜ Pass ⬜ Fail | |
| Scrape Website | ⬜ Pass ⬜ Fail | |
| Error Handling | ⬜ Pass ⬜ Fail | |
| Settings UI | ⬜ Pass ⬜ Fail | |

**Overall Status:** ⬜ All tests passed ⬜ Some tests failed

**Notes:**
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
