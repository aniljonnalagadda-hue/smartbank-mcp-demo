/**
 * SmartBank Fraud Detection — MCP Server (Vercel Serverless)
 * Endpoint: https://your-app.vercel.app/api/fraud
 */

const TOOLS = [
  { name: "score_transaction_risk", description: "Score a proposed transaction for fraud risk. Returns risk_score (0-100), risk_level, and recommended_action.", inputSchema: { type: "object", properties: { source_account: { type: "string" }, destination_account: { type: "string" }, amount: { type: "number" }, currency: { type: "string" } }, required: ["source_account", "destination_account", "amount"] } },
  { name: "get_account_risk_profile", description: "Retrieve the fraud risk profile for an account.", inputSchema: { type: "object", properties: { account_number: { type: "string" } }, required: ["account_number"] } },
];

function handleToolCall(name, args) {
  if (name === "score_transaction_risk") {
    const amount = args.amount || 0;
    if (amount > 40000) return { risk_score: 72, risk_level: "high", recommended_action: "require_otp_verification", factors: ["High value transaction", "Exceeds daily average by 3x"], evaluated_at: new Date().toISOString() };
    if (amount > 15000) return { risk_score: 35, risk_level: "medium", recommended_action: "proceed_with_monitoring", factors: ["Moderate value", "Known destination account"], evaluated_at: new Date().toISOString() };
    return { risk_score: 8, risk_level: "low", recommended_action: "proceed", factors: ["Low value", "Regular transaction pattern"], evaluated_at: new Date().toISOString() };
  }
  if (name === "get_account_risk_profile") return { account_number: args.account_number, risk_tier: "low", historical_flags: 0, velocity_status: "normal", last_review: "2026-05-15", device_fingerprints: 2 };
  return { error: `Unknown tool: ${name}` };
}

function handleJsonRpc(body) {
  const { method, id, params } = body;
  if (method === "initialize") return { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "smartbank-fraud", version: "1.0.0" } } };
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
    if ((req.headers.accept || "").includes("text/event-stream")) { res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/message", params: { level: "info", data: "SmartBank Fraud Detection connected" } })}\n\n`); return res.end(); }
    return res.json({ status: "ok", server: "SmartBank Fraud Detection", tools: TOOLS.length });
  }
  if (req.method === "DELETE") return res.status(200).json({ jsonrpc: "2.0", result: { success: true } });
  if (req.method === "POST") {
    if (Array.isArray(req.body)) return res.json(req.body.map(m => handleJsonRpc(m)).filter(r => r.id !== null));
    if (!req.body.id && (req.body.method === "notifications/initialized" || req.body.method === "initialized")) return res.status(202).end();
    return res.json(handleJsonRpc(req.body));
  }
  return res.status(405).json({ error: "Method not allowed" });
}
