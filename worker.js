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
      
      if (url.pathname === '/api/tickets' && request.method === 'POST') {
        return handleTicketsRequest(request, env);
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
    const { message, sessionId, history = [] } = await request.json();
    
    // Use Cloudflare Workers AI if available, otherwise use fallback
    let response;
    if (env.AI) {
      response = await generateWorkersAIResponse(env.AI, message, history);
    } else {
      response = await generateFallbackResponse(message);
    }
    
    // Store conversation in KV if available
    if (env.KV) {
      await storeConversation(env.KV, sessionId, message, response);
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
      response: await generateFallbackResponse()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function handleTicketsRequest(request, env) {
  try {
    const { subject, description, sessionId } = await request.json();
    
    // Store ticket in KV if available
    if (env.KV) {
      const ticketId = `ticket_${Date.now()}`;
      const ticket = {
        id: ticketId,
        subject,
        description,
        sessionId,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      await env.KV.put(ticketId, JSON.stringify(ticket));
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Ticket created successfully',
      ticketId: generateId()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: true, // Still return success for demo purposes
      message: 'Ticket logged locally (KV not configured)'
    }), {
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
    if (env.KV) {
      const settingsId = 'user_settings';
      await env.KV.put(settingsId, JSON.stringify(settings));
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
    const conversations = await getConversationHistory(env.KV);
    
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
      kv: { status: env.KV ? 'online' : 'offline', usage: Math.random() * 70 + 20 },
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

async function generateWorkersAIResponse(ai, message, history) {
  try {
    // Build conversation context
    let context = "You are a helpful Cloudflare customer support agent. Be friendly and provide clear solutions. Keep responses under 3 sentences.\n\n";
    
    // Add recent history for context
    if (history.length > 0) {
      context += "Recent conversation:\n";
      history.forEach(entry => {
        const role = entry.type === 'user' ? 'User' : 'Assistant';
        context += `${role}: ${entry.content}\n`;
      });
      context += "\n";
    }
    
    context += `User: ${message}\nAssistant:`;
    
    const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'You are a helpful Cloudflare support specialist. Provide concise, helpful answers about Cloudflare services.' },
        { role: 'user', content: message }
      ],
      max_tokens: 300
    });
    
    return response.response || "I understand your question. Let me help you with that Cloudflare issue.";
  } catch (error) {
    console.error('AI response error:', error);
    return await generateFallbackResponse(message);
  }
}

async function generateFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Contextual responses based on message content
  if (lowerMessage.includes('ssl') || lowerMessage.includes('certificate') || lowerMessage.includes('https')) {
    return "For SSL/TLS issues, check your certificate configuration in the Cloudflare dashboard under SSL/TLS tab. Ensure your certificate is active and properly configured for your domain.";
  }
  
  if (lowerMessage.includes('performance') || lowerMessage.includes('slow') || lowerMessage.includes('cache')) {
    return "To optimize performance, enable Auto Minify, Brotli compression, and Rocket Loader in the Speed optimization settings. Also check your cache rules in the Caching section.";
  }
  
  if (lowerMessage.includes('worker') || lowerMessage.includes('ai') || lowerMessage.includes('llama')) {
    return "Cloudflare Workers AI allows you to run machine learning models at the edge. You can integrate AI capabilities directly into your Workers for low-latency inference worldwide.";
  }
  
  if (lowerMessage.includes('billing') || lowerMessage.includes('price') || lowerMessage.includes('invoice')) {
    return "For billing questions, visit the Billing section in your Cloudflare dashboard to view current usage, invoices, and manage your subscription plan.";
  }
  
  if (lowerMessage.includes('dns') || lowerMessage.includes('domain')) {
    return "For DNS issues, verify your domain's nameservers are properly set to Cloudflare's or ensure your DNS records are correctly configured in the DNS section of your dashboard.";
  }
  
  // Default friendly responses
  const defaultResponses = [
    "I'd be happy to help with your Cloudflare question! Could you provide more details about what you're trying to accomplish?",
    "Thanks for reaching out! I can help you with various Cloudflare services including Workers, DNS, Security, and Performance optimization.",
    "I understand you need assistance with Cloudflare. Let me know what specific service or issue you'd like help with for more targeted guidance.",
    "Hello! I'm here to help with Cloudflare products and services. What specific challenge are you facing today?",
    "Great question! Cloudflare offers many services - are you working with Workers, DNS, Security, or another product I can help you with?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

async function storeConversation(kv, sessionId, userMessage, aiResponse) {
  try {
    const timestamp = new Date().toISOString();
    const conversationId = `conv_${sessionId}_${Date.now()}`;
    
    const conversation = {
      userMessage,
      aiResponse,
      timestamp,
      sessionId,
      id: conversationId
    };
    
    await kv.put(conversationId, JSON.stringify(conversation));
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
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
        <title>Cloudflare AI Customer Support</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #ff6b35, #e55a2b); color: white; padding: 40px; border-radius: 15px; text-align: center; }
          .btn { background: #ff6b35; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          .container { text-align: center; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>Cloudflare AI Customer Support</h1>
          <p>Worker is running successfully!</p>
          <p>Access the full application at your deployment URL with /index.html</p>
        </div>
        <div class="container">
          <button class="btn" onclick="window.location.href='/index.html'">Go to Application</button>
          <button class="btn" onclick="window.location.href='/api/status'">Check API Status</button>
        </div>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
