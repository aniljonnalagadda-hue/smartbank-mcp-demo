

const accountToCustomer = { "1001": "C001", "1002": "C001", "2001": "C002", "3001": "C003" };

const interactions = {
  "C001": [
    { date: "2026-05-27", type: "Call", summary: "Called about credit card reward points redemption", channel: "Phone", resolved: true },
    { date: "2026-05-20", type: "Branch Visit", summary: "Visited for FD renewal discussion", channel: "Branch", resolved: true },
    { date: "2026-05-10", type: "Complaint", summary: "ATM cash not dispensed but amount debited", channel: "Mobile App", resolved: true },
  ],
  "C002": [
    { date: "2026-05-25", type: "Call", summary: "Enquired about personal loan top-up", channel: "Phone", resolved: false },
  ],
};

const TOOLS = [
  {
    name: "get_customer_profile",
    description: "Look up customer by customer ID or account number. Returns name, segment, relationship manager, products held, and KYC status.",
    inputSchema: { type: "object", properties: { customer_id: { type: "string", description: "Customer ID (e.g., C001) OR account number (e.g., 1001)" } }, required: ["customer_id"] },
  },
  {
    name: "get_customer_interactions",
    description: "Retrieve recent customer interactions — branch visits, calls, complaints, and service requests.",
    inputSchema: { type: "object", properties: { customer_id: { type: "string", description: "Customer ID" }, limit: { type: "number", description: "Max interactions (default: 5)" } }, required: ["customer_id"] },
  },
  {
    name: "update_customer_preferences",
    description: "Update customer communication preferences such as preferred channel, language, and notification frequency.",
    inputSchema: { type: "object", properties: { customer_id: { type: "string" }, preferred_channel: { type: "string", description: "sms, email, whatsapp, or push" }, language: { type: "string", description: "en, hi, te" } }, required: ["customer_id"] },
  },
];

function handleToolCall(name, args) {
  if (name === "get_customer_profile") {
    let custId = args.customer_id;
    if (accountToCustomer[custId]) custId = accountToCustomer[custId];
    const cust = customers[custId];
    return cust || { error: "Customer not found" };
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

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.json({ status: "ok", server: "SmartBank CRM", tools: TOOLS.length });

  const { method, id, params } = req.body;

  if (method === "tools/list") return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

  if (method === "tools/call") {
    const result = handleToolCall(params.name, params.arguments || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
  }

  return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
