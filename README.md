# SmartBank MCP Demo — Vercel Deployment

Mock banking MCP servers deployed as Vercel serverless functions.
No localhost needed — runs on Vercel's free tier.

## Deployment Steps (5 minutes)

### Step 1: Create a GitHub repo

1. Go to https://github.com/new
2. Name it `smartbank-mcp-demo`
3. Upload all the files from this folder maintaining the structure:

```
smartbank-mcp-demo/
├── api/
│   ├── core-banking.js      ← Core Banking MCP server
│   ├── crm.js               ← CRM MCP server
│   └── fraud.js             ← Fraud Detection MCP server
├── public/
│   └── index.html           ← Landing page with test data & health check
├── package.json
├── vercel.json
└── README.md
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com (sign up free with GitHub)
2. Click **"Add New Project"**
3. Import your `smartbank-mcp-demo` repo
4. Click **Deploy** — no settings to change, defaults work
5. Wait ~30 seconds for deployment

### Step 3: Get your URLs

After deployment, Vercel gives you a URL like:
`https://smartbank-mcp-demo.vercel.app`

Your MCP server endpoints are:
- **Core Banking:** `https://smartbank-mcp-demo.vercel.app/api/core-banking`
- **CRM:** `https://smartbank-mcp-demo.vercel.app/api/crm`
- **Fraud Detection:** `https://smartbank-mcp-demo.vercel.app/api/fraud`

### Step 4: Verify

Visit `https://smartbank-mcp-demo.vercel.app` — the landing page
shows all servers, test data, and a health check button.

### Step 5: Connect to Kore.ai Agent Platform

For each MCP server:

1. Go to **Tools → + New Tool → MCP Tool**
2. Enter the server name (e.g., "SmartBank Core Banking")
3. Configure:
   - **Type:** HTTP
   - **URL:** `https://smartbank-mcp-demo.vercel.app/api/core-banking`
   - **Auth:** None
4. Click **Test** — tools are auto-discovered
5. Select tools → **Add Selected**
6. Link to your agent

Repeat for `/api/crm` and `/api/fraud`.

## What You Get

| Endpoint | Server | Tools |
|----------|--------|-------|
| `/api/core-banking` | Core Banking | get_account_balance, get_transaction_history, get_account_summary, validate_account, execute_transfer |
| `/api/crm` | CRM | get_customer_profile, get_customer_interactions, update_customer_preferences |
| `/api/fraud` | Fraud Detection | score_transaction_risk, get_account_risk_profile |

## Test Data

| Account | Holder | Type | Balance (INR) |
|---------|--------|------|---------------|
| 1001 | Rajesh Kumar | Savings | 2,45,680 |
| 1002 | Rajesh Kumar | Current | 89,320 |
| 2001 | Priya Sharma | Savings | 5,32,100 |
| 3001 | Amit Patel | Savings | 15,200 |

## Demo Scenarios for Training

1. **Balance Check (single server)** — "Check balance for account 1001"
2. **Fund Transfer with Fraud Check (multi-server)** — "Transfer 5000 from 1001 to 2001"
3. **High-Value Transfer (fraud trigger)** — "Transfer 45000 from 1001 to 2001" → risk score 72, requires OTP
4. **Customer 360 (CRM + Core Banking)** — "Tell me about customer C001"

## Important Notes

- Vercel functions are **stateless** — execute_transfer returns realistic results but doesn't actually change balances between calls
- Free tier: 100GB bandwidth/month, more than enough for training
- No authentication configured — fine for demo, don't use for real data
- CORS headers are set to allow requests from the Kore.ai platform
