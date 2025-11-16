# CF AI Customer Support

A minimal AI-powered customer support web app using Cloudflare Workers and Llama 3.3. This project features a full-stack solution: `index.html` provides a responsive, modern chat/ticket UI, and `worker.js` powers the backend API and business logic.

---

##  File Structure & Responsibilities

### `index.html`
- **Modern Web App UI**
  - **Chat Interface**: Start a support conversation with AI powered by Cloudflare Workers and Llama 3.3. Messages appear as chat bubbles for both user and AI. Supports voice input with real-time transcript and level visualization.
  - **Quick Solutions**: Shortcut buttons for common Cloudflare issues (SSL, Performance, Workers AI, Billing) prefill questions for the AI.
  - **Support Ticket List**: Displays ticket-like cards with status, subject, and date. Allows creating/viewing new tickets.
  - **System Status Panel**: Visualizes backend services status (“Workers AI”, “KV Storage”, “Durable Objects”) and response time via progress bars.
  - **Conversation History**: Shows recent AI interactions for quick reference.
  - **UI Tech Stack**: Uses Bootstrap 5 and Bootstrap Icons for styling, responsive layout, and notifications. 
  - **Voice Recognition**: Integrates Web Speech API for voice input (Chrome/Edge recommended).
  - **Memory/Session Storage**: Tracks recent conversation and support actions locally.

### `worker.js`
- **Cloudflare Worker API & Business Logic**
  - **API Endpoints**:
    - `POST /api/chat`: Accepts chat messages, returns AI-powered responses using the Llama 3.3 model. Stores conversation history in KV (if configured).
    - `POST /api/settings`: Saves user or session settings to KV.
    - `GET /api/export`: Exports conversation history for download (JSON).
    - `GET /api/status`: Returns system component statuses (AI model, Workers, KV, Durable Objects) and performance metrics.
  - **CORS Handling**: Accepts all origins/methods for flexibility.
  - **Static File Serving**: Serves `index.html` at `/` or `/index.html` requests.
  - **Business Logic**: Dynamically varies responses (styles: friendly, technical, concise). Recognizes message context for enhanced answers.
  - **Cloudflare Tech**:
    - **Workers AI**: Runs inference with chosen Llama model (70B).
    - **KV Namespace**: Stores conversation, settings when available.
    - **Durable Objects**: Can manage advanced session state.
  - **Error/Fallback Handling**: Friendly fallback messages in case of issues.

---

## Quick Deploy

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create KV namespace:**
   ```bash
   npx wrangler kv:namespace create "KV"
   ```

3. **Update wrangler.toml** with the generated KV ID

4. **Deploy:**
   ```bash
   npm run deploy
   ```

---

##  Features

- Chat with Llama 3.3 AI assistant (via Workers AI API)
- Voice recognition (Web Speech API) with live transcript/level
- Multiple UI panels: Chat, Tickets, System Status (in index.html)
- Memory panel: Keeps track of recent interactions (in index.html)
- Quick access buttons for common Cloudflare problems
- Support ticket creation/view, with status badges (demo mode)
- Real-time backend status and response metrics
- Cloudflare KV/Durable Objects storage (when configured)
- Easy export of conversation/tickets data (via API)
- Responsive, mobile-first Bootstrap UI

---

## How It Works

- Users interact using the UI in `index.html`. Their input (text/voice, quick buttons, ticket actions) submits requests to API endpoints exposed by `worker.js` via Fetch.
- The Worker receives messages, generates AI responses (context-based and style selectable), and replies. Conversation history can be saved (KV) and exported.
- UI panels (tickets, system status, memory) update based on API responses and session actions.
- System status endpoint keeps users informed about backend health.

---

## Tech Stack

- **Frontend**: HTML5, Bootstrap 5, JavaScript (ES6), Bootstrap Icons, Web Speech API (voice)
- **Backend**: Cloudflare Workers, Workers AI (Llama 3.3), KV Storage, Durable Objects (optional)
- **Dev Ops**: Wrangler CLI for deployment, wrangler.toml for config

---

## Related Files

- `index.html` - All UI/UX, panels, chat logic, interaction handlers, voice recognition
- `worker.js` - API endpoints, AI response logic, storage, static serving
- `wrangler.toml` - Cloudflare deployment configuration
- `package.json` - Project dependencies

---

## Further Reading

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Bootstrap Framework](https://getbootstrap.com/)
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
