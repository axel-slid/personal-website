const crypto = require("crypto");

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function parseJwt(token) {
  const parts = (token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
  const body = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
  return { header, body, signature: s, signingInput: `${h}.${b}` };
}

function verifyToken(token) {
  const secret = process.env.EDIT_SECRET;
  if (!secret) return { ok: false, error: "Server not configured" };

  const parsed = parseJwt(token);
  if (!parsed) return { ok: false, error: "Bad token" };

  const expectedSig = crypto.createHmac("sha256", secret).update(parsed.signingInput).digest("base64url");
  if (expectedSig !== parsed.signature) return { ok: false, error: "Bad token" };

  const now = Math.floor(Date.now() / 1000);
  const exp = parsed.body && parsed.body.exp;
  if (!exp || now > exp) return { ok: false, error: "Token expired" };

  return { ok: true, body: parsed.body };
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    return { ok: false, error: "Missing GitHub env vars (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)" };
  }
  return { ok: true, token, owner, repo, branch };
}

async function ghRequest(path, { method = "GET", token, body } = {}) {
  const url = `https://api.github.com${path}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "alex-dils-site-editor",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const resp = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}


function encodePath(p) {
  // Encode each path segment but keep slashes (GitHub contents API expects slashes).
  return String(p || "")
    .split("/")
    .map(seg => encodeURIComponent(seg))
    .join("/");
}

async function getFileSha({ token, owner, repo, path, branch }) {
  const res = await ghRequest(`/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, { token });
  if (!res.ok) return { ok: false, status: res.status, data: res.data };
  return { ok: true, sha: res.data.sha };
}

async function putFile({ token, owner, repo, path, branch, contentBase64, message, sha }) {
  const body = { message, content: contentBase64, branch, ...(sha ? { sha } : {}) };
  return await ghRequest(`/repos/${owner}/${repo}/contents/${encodePath(path)}`, { method: "PUT", token, body });
}

module.exports = { json, verifyToken, githubConfig, getFileSha, putFile };
