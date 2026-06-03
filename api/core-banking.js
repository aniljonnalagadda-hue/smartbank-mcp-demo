/**
 * SmartBank Core Banking — MCP Server (Vercel Serverless)
 * Supports both Streamable HTTP and legacy SSE discovery
 * Endpoint: https://your-app.vercel.app/api/core-banking
 */

const accounts = {
  "1001": { account_id: "1001", holder_name: "Rajesh Kumar", account_type: "Savings", currency: "INR", balance: 245680.50, available_balance: 240680.50, masked_number: "4521", status: "Active", branch: "Jubilee Hills, Hyderabad", opened_date: "2019-03-15" },
  "1002": { account_id: "1002", holder_name: "Rajesh Kumar", account_type: "Current", currency: "INR", balance: 89320.00, available_balance: 89320.00, masked_number: "7834", status: "Active", branch: "Jubilee Hills, Hyderabad", opened_date: "2020-06-10" },
  "2001": { account_id: "2001", holder_name: "Priya Sharma", account_type: "Savings", currency: "INR", balance: 532100.75, available_balance: 530000.00, masked_number: "9102", status: "Active", branch: "Banjara Hills, Hyderabad", opened_date: "2018-11-22" },
  "3001": { account_id: "3001", holder_name: "Amit Patel", account_type: "Savings", currency: "INR", balance: 15200.00, available_balance: 15200.00, masked_number: "3345", status: "Active", branch: "Madhapur, Hyderabad", opened_date: "2022-01-05" },
};

const transactions = {
  "1001": [
    { date: "2026-05-28", description: "UPI - Swiggy", amount: -450.00, balance: 245680.50 },
    { date: "2026-05-27", description: "Salary Credit - TechCorp", amount: 85000.00, balance: 246130.50 },
    { date: "2026-05-26", description: "ATM Withdrawal - Jubilee Hills", amount: -5000.00, balance: 161130.50 },
    { date: "2026-05-25", description: "NEFT - Rent Payment", amount: -22000.00, balance: 166130.50 },
    { date: "2026-05-24", description: "UPI - Amazon", amount: -3299.00, balance: 188130.50 },
  ],
  "1002": [
    { date: "2026-05-28", description: "NEFT Received - Client Payment", amount: 45000.00, balance: 89320.00 },
    { date: "2026-05-25", description: "IMPS - Vendor Payment", amount: -12500.00, balance: 44320.00 },
  ],
};

const TOOLS = [
  { name: "get_account_balance", description: "Retrieve current balance, available balance, and account details for a given account number.", inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number (e.g., 1001, 2001)" } }, required: ["account_number"] } },
  { name: "get_transaction_history", description: "Retrieve recent transactions for an account. Returns date, description, amount, and running balance.", inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number" }, limit: { type: "number", description: "Number of transactions (default: 5)" } }, required: ["account_number"] } },
  { name: "get_account_summary", description: "Retrieve account summary including type, status, branch, and open date.", inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number" } }, required: ["account_number"] } },
  { name: "validate_account", description: "Check if an account number is valid and active. Returns holder name and type.", inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number to validate" } }, required: ["account_number"] } },
  { name: "execute_transfer", description: "Transfer funds between accounts. Returns transaction ID and new balance. Only call after explicit user confirmation.", inputSchema: { type: "object", properties: { source_account: { type: "string" }, destination_account: { type: "string" }, amount: { type: "number" }, currency: { type: "string" } }, required: ["source_account", "destination_account", "amount"] } },
];

const SERVER_INFO = {
  name: "smartbank-core-banking",
  version: "1.0.0",
};

function handleToolCall(name, args) {
  if (name === "get_account_balance") {
    const acc = accounts[args.account_number];
    if (!acc) return { error: "Account not found", account_number: args.account_number };
    return { balance: acc.balance, available_balance: acc.available_balance, currency: acc.currency, account_type: acc.account_type, masked_number: acc.masked_number, holder_name: acc.holder_name, last_updated: new Date().toISOString() };
  }
  if (name === "get_transaction_history") {
    const txns = transactions[args.account_number] || [];
    return { account_number: args.account_number, transactions: txns.slice(0, args.limit || 5), count: Math.min(txns.length, args.limit || 5) };
  }
  if (name === "get_account_summary") {
    const acc = accounts[args.account_number];
    if (!acc) return { error: "Account not found" };
    return { account_id: acc.account_id, holder_name: acc.holder_name, account_type: acc.account_type, status: acc.status, branch: acc.branch, opened_date: acc.opened_date, currency: acc.currency };
  }
  if (name === "validate_account") {
    const acc = accounts[args.account_number];
    return { valid: !!acc, holder_name: acc?.holder_name || null, masked_number: acc?.masked_number || null, account_type: acc?.account_type || null };
  }
  if (name === "execute_transfer") {
    const src = accounts[args.source_account], dst = accounts[args.destination_account];
    if (!src || !dst) return { error: "Invalid account(s)" };
    if (src.balance < args.amount) return { error: "Insufficient balance", available: src.available_balance };
    return { transaction_id: "TXN" + Date.now(), status: "SUCCESS", timestamp: new Date().toISOString(), amount: args.amount, currency: args.currency || "INR", source_new_balance: src.balance - args.amount, destination_new_balance: dst.balance + args.amount };
  }
  return { error: `Unknown tool: ${name}` };
}

function handleJsonRpc(body) {
  const { method, id, params } = body;

  // MCP initialize handshake
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      },
    };
  }

  // Initialized notification — acknowledge
  if (method === "notifications/initialized" || method === "initialized") {
    return { jsonrpc: "2.0", id: id || null, result: {} };
  }

  // Tool discovery
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  // Tool invocation
  if (method === "tools/call") {
    const result = handleToolCall(params.name, params.arguments || {});
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } };
  }

  // Ping
  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export default function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — health check or SSE stream request
  if (req.method === "GET") {
    const accept = req.headers.accept || "";
    if (accept.includes("text/event-stream")) {
      // SSE stream — send server info and keep-alive
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/message", params: { level: "info", data: "SmartBank Core Banking MCP Server connected" } })}\n\n`);
      // Vercel serverless can't hold long-lived connections, so end after initial message
      return res.end();
    }
    return res.json({ status: "ok", server: "SmartBank Core Banking", version: "1.0.0", tools: TOOLS.length, protocol: "MCP 2024-11-05" });
  }

  // DELETE — session cleanup
  if (req.method === "DELETE") {
    return res.status(200).json({ jsonrpc: "2.0", result: { success: true } });
  }

  // POST — JSON-RPC messages
  if (req.method === "POST") {
    const body = req.body;

    // Handle batch requests (array of JSON-RPC messages)
    if (Array.isArray(body)) {
      const responses = body.map(msg => handleJsonRpc(msg)).filter(r => r.id !== null);
      return res.json(responses);
    }

    // Single request
    const response = handleJsonRpc(body);

    // Notifications don't need a response body
    if (!body.id && (body.method === "notifications/initialized" || body.method === "initialized")) {
      return res.status(202).end();
    }

    return res.json(response);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
