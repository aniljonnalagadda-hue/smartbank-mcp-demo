/**
 * SmartBank CRM — MCP Server (Vercel Serverless)
 * Endpoint: https://your-app.vercel.app/api/crm
 */

const customers = {
  "C001": { customer_id: "C001", name: "Rajesh Kumar", segment: "Premium", relationship_manager: "Sneha Reddy", email: "rajesh.kumar@email.com", phone: "+91-98765-XXXXX", accounts: ["1001", "1002"], products: ["Savings Account", "Current Account", "Credit Card - Gold", "Fixed Deposit"], kyc_status: "Verified", since: "2019-03-15" },
  "C002": { customer_id: "C002", name: "Priya Sharma", segment: "Regular", relationship_manager: "Vikram Singh", email: "priya.sharma@email.com", phone: "+91-87654-XXXXX", accounts: ["2001"], products: ["Savings Account", "Personal Loan"], kyc_status: "Verified", since: "2018-11-22" },
};
const accountToCustomer = { "1001": "C001", "1002": "C001", "2001": "C002", "3001": "C003" };
const interactions = {
  "C001": [
    { date: "2026-05-27", type: "Call", summary: "Called about credit card reward points redemption", channel: "Phone", resolved: true },
    { date: "2026-05-20", type: "Branch Visit", summary: "Visited for FD renewal discussion", channel: "Branch", resolved: true },
    { date: "2026-05-10", type: "Complaint", summary: "ATM cash not dispensed but amount debited", channel: "Mobile App", resolved: true },
  ],
  "C002": [{ date: "2026-05-25", type: "Call", summary: "Enquired about personal loan top-up", channel: "Phone", resolved: false }],
};

const TOOLS = [
  { name: "get_customer_profile", description: "Look up customer by customer ID or account number. Returns name, segment, RM, products, KYC status.", inputSchema: { type: "object", properties: { customer_id: { type: "string", description: "Customer ID (e.g., C001) OR account number (e.g., 1001)" } }, required: ["customer_id"] } },
  { name: "get_customer_interactions", description: "Retrieve recent customer interactions — branch visits, calls, complaints.", inputSchema: { type: "object", properties: { customer_id: { type: "string", description: "Customer ID" }, limit: { type: "number", description: "Max interactions (default: 5)" } }, required: ["customer_id"] } },
  { name: "update_customer_preferences", description: "Update customer communication preferences (channel, language).", inputSchema: { type: "object", properties: { customer_id: { type: "string" }, preferred_channel: { type: "string", description: "sms, email, whatsapp, or push" }, language: { type: "string", description: "en, hi, te" } }, required: ["customer_id"] } },
];

function handleToolCall(name, args) {
  if (name === "get_customer_profile") {
    let custId = args.customer_id;
    if (accountToCustomer[custId]) custId = accountToCustomer[custId];
    return customers[custId] || { error: "Customer not found" };
  }
  if (name === "get_customer_interactions") {
    const ints = interactions[args.customer_id] || [];
    return { customer_id: args.customer_id, interactions: ints.slice(0, args.limit || 5) };
  }
  if (name === "update_customer_preferences") {
    return { status: "updated", customer_id: args.customer_id, preferred_channel: args.preferred_channel || "unchanged", language: args.language || "unchanged" };
  }
  return { error: `Unknown tool: ${name}` };
}

function handleJsonRpc(body) {
  const { method, id, params } = body;
  if (method === "initialize") return { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "smartbank-crm", version: "1.0.0" } } };
  if (method === "notifications/initialized" || method === "initialized") return { jsonrpc: "2.0", id: id || null, result: {} };
  if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  if (method === "tools/call") { const r = handleToolCall(params.name, params.arguments || {}); return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(r) }] } }; }
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    if ((req.headers.accept || "").includes("text/event-stream")) { res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/message", params: { level: "info", data: "SmartBank CRM connected" } })}\n\n`); return res.end(); }
    return res.json({ status: "ok", server: "SmartBank CRM", tools: TOOLS.length });
  }
  if (req.method === "DELETE") return res.status(200).json({ jsonrpc: "2.0", result: { success: true } });
  if (req.method === "POST") {
    if (Array.isArray(req.body)) return res.json(req.body.map(m => handleJsonRpc(m)).filter(r => r.id !== null));
    if (!req.body.id && (req.body.method === "notifications/initialized" || req.body.method === "initialized")) return res.status(202).end();
    return res.json(handleJsonRpc(req.body));
  }
  return res.status(405).json({ error: "Method not allowed" });
}
