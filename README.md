# CF AI Customer Support

A minimal AI-powered customer support chat using Cloudflare Workers and Llama 3.3.

## 🚀 Quick Deploy

1. **Install dependencies:**
\`\`\`bash
npm install
\`\`\`

2. **Create KV namespace:**
\`\`\`bash
npx wrangler kv:namespace create "KV"
\`\`\`

3. **Update wrangler.toml** with the generated KV ID

4. **Deploy:**
\`\`\`bash
npm run deploy
\`\`\`

## 📁 Files
- \`worker.js\` - Complete worker with HTML interface
- \`wrangler.toml\` - Cloudflare configuration
- \`package.json\` - Dependencies

## 🎯 Features
- Llama 3.3 70B AI
- Conversation memory
- Web chat interface
- Simple deployment
