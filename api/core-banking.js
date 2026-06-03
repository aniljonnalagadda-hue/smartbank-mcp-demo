/**
 * SmartBank Core Banking — MCP Server (Vercel Serverless)
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
    { date: "2026-05-22", description: "Cheque Deposit", amount: 35000.00, balance: 56820.00 },
  ],
};

const TOOLS = [
  {
    name: "get_account_balance",
    description: "Retrieve current balance, available balance, and account details for a given account number. Use when the user asks about their balance or how much money they have.",
    inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number (e.g., 1001, 2001)" } }, required: ["account_number"] },
  },
  {
    name: "get_transaction_history",
    description: "Retrieve recent transactions for an account. Returns date, description, amount, and running balance.",
    inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number" }, limit: { type: "number", description: "Number of transactions (default: 5)" } }, required: ["account_number"] },
  },
  {
    name: "get_account_summary",
    description: "Retrieve account summary including type, status, branch, and open date.",
    inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number" } }, required: ["account_number"] },
  },
  {
    name: "validate_account",
    description: "Check if an account number is valid and active. Returns holder name and account type. Use before transfers.",
    inputSchema: { type: "object", properties: { account_number: { type: "string", description: "The account number to validate" } }, required: ["account_number"] },
  },
  {
    name: "execute_transfer",
    description: "Transfer funds between accounts. Returns transaction ID and new balance. Only call after explicit user confirmation.",
    inputSchema: { type: "object", properties: { source_account: { type: "string" }, destination_account: { type: "string" }, amount: { type: "number" }, currency: { type: "string" } }, required: ["source_account", "destination_account", "amount"] },
  },
];

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
    const src = accounts[args.source_account];
    const dst = accounts[args.destination_account];
    if (!src || !dst) return { error: "Invalid account(s)" };
    if (src.balance < args.amount) return { error: "Insufficient balance", available: src.available_balance };
    // Note: Vercel functions are stateless, so balance changes don't persist between calls.
    // For demo purposes, we return realistic-looking results.
    return { transaction_id: "TXN" + Date.now(), status: "SUCCESS", timestamp: new Date().toISOString(), amount: args.amount, currency: args.currency || "INR", source_new_balance: src.balance - args.amount, destination_new_balance: dst.balance + args.amount };
  }
  return { error: `Unknown tool: ${name}` };
}

export default function handler(req, res) {
  // CORS headers for Kore.ai platform
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.json({ status: "ok", server: "SmartBank Core Banking", tools: TOOLS.length });

  const { method, id, params } = req.body;

  if (method === "tools/list") {
    return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const result = handleToolCall(params.name, params.arguments || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
  }

  return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
