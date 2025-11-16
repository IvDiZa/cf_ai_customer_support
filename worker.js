// worker.js - Cloudflare Worker for AI Assistant

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return handleChatRequest(request, env);
      }
      
      if (url.pathname === '/api/settings' && request.method === 'POST') {
        return handleSettingsRequest(request, env);
      }
      
      if (url.pathname === '/api/export' && request.method === 'GET') {
        return handleExportRequest(request, env);
      }
      
      if (url.pathname === '/api/status' && request.method === 'GET') {
        return handleStatusRequest(env);
      }
    }
    
    // Serve static HTML for root path
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveHTML();
    }

    // Default 404 response
    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  },
};

async function handleChatRequest(request, env) {
  try {
    const { message, settings = {} } = await request.json();
    
    // Generate AI response based on settings
    const response = await generateAIResponse(message, settings);
    
    // Store conversation in KV if available
    if (env.CONVERSATION_STORE) {
      await storeConversation(env.CONVERSATION_STORE, message, response);
    }
    
    return new Response(JSON.stringify({ 
      response,
      timestamp: new Date().toISOString(),
      messageId: generateId()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Chat request error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process message',
      response: "I'm having trouble processing your request right now. Please try again."
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function handleSettingsRequest(request, env) {
  try {
    const settings = await request.json();
    
    // Store settings in KV if available
    if (env.USER_SETTINGS) {
      const settingsId = 'user_settings';
      await env.USER_SETTINGS.put(settingsId, JSON.stringify(settings));
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Settings saved successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to save settings'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function handleExportRequest(request, env) {
  try {
    // In a real implementation, you would fetch conversation history from KV
    const conversations = await getConversationHistory(env.CONVERSATION_STORE);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      conversations: conversations || []
    };
    
    return new Response(JSON.stringify(exportData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'attachment; filename="ai-assistant-export.json"'
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to export data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function handleStatusRequest(env) {
  const status = {
    timestamp: new Date().toISOString(),
    services: {
      llm: { status: 'online', latency: Math.random() * 100 + 50 },
      workers: { status: 'online', requests: Math.floor(Math.random() * 1000) },
      kv: { status: 'online', usage: Math.random() * 70 + 20 },
      durableObjects: { status: 'online', instances: Math.floor(Math.random() * 10) + 1 }
    }
  };
  
  return new Response(JSON.stringify(status), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function generateAIResponse(message, settings) {
  const responseStyle = settings.responseStyle || 'friendly';
  
  // Enhanced response logic with different styles
  const responses = {
    friendly: [
      "I'd be happy to help with that! Cloudflare Workers AI makes running ML models super easy.",
      "That's a great question! Let me explain how Cloudflare handles this...",
      "I can definitely help you with that! The edge network is perfect for low-latency AI.",
      "Awesome question! Here's how you can implement that with Workers...",
      "I understand what you're asking! Let me break this down for you..."
    ],
    technical: [
      "Cloudflare Workers AI provides serverless inference at the edge with sub-50ms latency globally.",
      "Durable Objects offer strongly consistent storage with transactional guarantees for state management.",
      "The Workers runtime executes your code in isolated V8 contexts across 300+ global locations.",
      "KV storage provides eventually consistent key-value storage with low-latency read access.",
      "Workflows orchestrate complex operations across multiple Workers with guaranteed execution."
    ],
    concise: [
      "Workers AI runs models at the edge. Low latency, global scale.",
      "Use Durable Objects for consistent state. KV for simple storage.",
      "Workers handle logic. Pages serve frontend. All globally distributed.",
      "Voice input via Web Speech API. Process with Workers AI.",
      "Memory: KV for simple, Durable Objects for complex state."
    ]
  };
  
  // Contextual responses based on message content
  const contextualResponses = {
    llama: "Cloudflare Workers AI supports Llama models that run directly on the edge network with optimized inference.",
    workflow: "Workflows coordinate complex operations across services with built-in retries and error handling.",
    memory: "Use KV for simple key-value storage or Durable Objects for transactional state management.",
    voice: "Process voice input with Web Speech API in browser, then send to Workers for AI processing.",
    deploy: "Deploy your AI assistant globally in seconds with wrangler deploy or via CI/CD with Pages.",
    cost: "Workers AI pricing is per inference, with generous free tier for development and testing."
  };
  
  // Check for contextual matches
  const lowerMessage = message.toLowerCase();
  for (const [key, response] of Object.entries(contextualResponses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  
  // Return style-based random response
  const styleResponses = responses[responseStyle] || responses.friendly;
  return styleResponses[Math.floor(Math.random() * styleResponses.length)];
}

async function storeConversation(kv, userMessage, aiResponse) {
  const timestamp = new Date().toISOString();
  const conversationId = `conv_${Date.now()}`;
  
  const conversation = {
    userMessage,
    aiResponse,
    timestamp,
    id: conversationId
  };
  
  await kv.put(conversationId, JSON.stringify(conversation));
}

async function getConversationHistory(kv) {
  if (!kv) return [];
  
  try {
    const list = await kv.list();
    const conversations = [];
    
    for (const key of list.keys) {
      const conversation = await kv.get(key.name, 'json');
      if (conversation) {
        conversations.push(conversation);
      }
    }
    
    return conversations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function serveHTML() {
  // In production, you would serve the actual HTML file
  // This is a fallback for the Worker URL directly
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cloudflare AI Assistant</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #ff6b35, #e55a2b); color: white; padding: 40px; border-radius: 15px; text-align: center; }
          .btn { background: #ff6b35; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>Cloudflare AI Assistant</h1>
          <p>Worker is running successfully!</p>
          <p>Access the full application at your deployment URL.</p>
          <button class="btn" onclick="window.location.href='/index.html'">Go to Application</button>
        </div>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
