
  {
    name: "get_account_risk_profile",
    description: "Retrieve the fraud risk profile for an account — historical flags, velocity checks, and risk tier.",
    inputSchema: { type: "object", properties: { account_number: { type: "string" } }, required: ["account_number"] },
  },
];

function handleToolCall(name, args) {
  if (name === "score_transaction_risk") {
    const amount = args.amount || 0;
    let risk_score, risk_level, recommended_action, factors;

    if (amount > 40000) {
      risk_score = 72; risk_level = "high"; recommended_action = "require_otp_verification";
      factors = ["High value transaction", "Exceeds daily average by 3x"];
    } else if (amount > 15000) {
      risk_score = 35; risk_level = "medium"; recommended_action = "proceed_with_monitoring";
      factors = ["Moderate value", "Known destination account"];
    } else {
      risk_score = 8; risk_level = "low"; recommended_action = "proceed";
      factors = ["Low value", "Regular transaction pattern"];
    }

    return { risk_score, risk_level, recommended_action, factors, evaluated_at: new Date().toISOString() };
  }

  if (name === "get_account_risk_profile") {
    return { account_number: args.account_number, risk_tier: "low", historical_flags: 0, velocity_status: "normal", last_review: "2026-05-15", device_fingerprints: 2 };
  }

  return { error: `Unknown tool: ${name}` };
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.json({ status: "ok", server: "SmartBank Fraud Detection", tools: TOOLS.length });

  const { method, id, params } = req.body;

  if (method === "tools/list") return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

  if (method === "tools/call") {
    const result = handleToolCall(params.name, params.arguments || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
  }

  return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
