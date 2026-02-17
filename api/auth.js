const crypto = require("crypto");

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function signToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const { password } = req.body || {};
    const expected = process.env.EDIT_PASSWORD;
    const secret = process.env.EDIT_SECRET;

    if (!expected || !secret) return json(res, 500, { error: "Server not configured" });
    if (!password || password !== expected) return json(res, 401, { error: "Invalid password" });

    const now = Math.floor(Date.now() / 1000);
    const token = signToken({ sub: "editor", iat: now, exp: now + 2 * 60 * 60 }, secret); // 2h
    return json(res, 200, { token });
  } catch (e) {
    return json(res, 500, { error: "Auth failed" });
  }
};
