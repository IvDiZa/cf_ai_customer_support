export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ai = new Ai(env.AI);

    // Serve HTML interface
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Chat API
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { message, sessionId = 'default' } = await request.json();
        
        // Simple memory using KV
        const history = await getHistory(env, sessionId);
        
        const messages = [
          {
            role: 'system',
            content: `You are a helpful customer support agent. Be friendly and provide clear solutions. Keep responses under 3 sentences.`
          },
          ...history.slice(-4),
          { role: 'user', content: message }
        ];

        const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages,
          stream: false
        });

        // Store conversation
        await storeMessage(env, sessionId, 'user', message);
        await storeMessage(env, sessionId, 'assistant', response.response);

        return Response.json({
          response: response.response,
          sessionId
        });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Simple memory functions
async function getHistory(env, sessionId) {
  try {
    const history = await env.KV.get(`chat_${sessionId}`, 'json');
    return history || [];
  } catch {
    return [];
  }
}

async function storeMessage(env, sessionId, role, content) {
  const history = await getHistory(env, sessionId);
  history.push({ role, content, timestamp: Date.now() });
  
  // Keep only last 10 messages
  const trimmed = history.slice(-10);
  await env.KV.put(`chat_${sessionId}`, JSON.stringify(trimmed));
}

// HTML Interface
const HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Customer Support</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .chat-container { border: 1px solid #ddd; border-radius: 10px; padding: 20px; height: 500px; overflow-y: auto; margin-bottom: 20px; }
        .message { margin: 10px 0; padding: 10px; border-radius: 10px; max-width: 80%; }
        .user { background: #007bff; color: white; margin-left: auto; text-align: right; }
        .assistant { background: #f1f1f1; margin-right: auto; }
        .error { background: #ffebee; color: #c53030; }
        .input-area { display: flex; gap: 10px; }
        input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        button { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
    </style>
</head>
<body>
    <h1>🤖 AI Customer Support</h1>
    <div class="chat-container" id="messages">
        <div class="message assistant">Hello! I'm your AI support assistant. How can I help you today?</div>
    </div>
    <div class="input-area">
        <input type="text" id="messageInput" placeholder="Ask me anything..." />
        <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const button = document.getElementById('sendBtn');
            const message = input.value.trim();
            
            if (!message) return;

            // Add user message
            addMessage('user', message);
            input.value = '';
            button.disabled = true;
            button.textContent = 'Sending...';

            // Get AI response
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                addMessage('assistant', data.response);
            } catch (error) {
                addMessage('error', 'Sorry, something went wrong. Please try again.');
            } finally {
                button.disabled = false;
                button.textContent = 'Send';
                input.focus();
            }
        }

        function addMessage(role, content) {
            const container = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = \`message \${role}\`;
            div.textContent = content;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        // Enter key support
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Focus input on load
        document.getElementById('messageInput').focus();
    </script>
</body>
</html>`;
