const { json, verifyToken, githubConfig } = require("./_common");

function encodePath(p){
  return String(p||"").split("/").map(seg=>encodeURIComponent(seg)).join("/");
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const { token, path, branch } = req.body || {};
  if (!token || !path) return json(res, 400, { error: "Missing token/path" });

  const v = verifyToken(token);
  if (!v.ok) return json(res, 401, { error: v.error });

  const gh = githubConfig();
  if (!gh.ok) return json(res, 500, { error: gh.error });

  const targetBranch = branch || gh.branch;

  try {
    const r = await ghRequest(
      `/repos/${gh.owner}/${gh.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(targetBranch)}`,
      { token: gh.token }
    );
    if (!r.ok) return json(res, r.status, { error: "GitHub fetch failed", details: r.data });
    const content = r.data && r.data.content;
    if (!content) return json(res, 404, { error: "File not found" });
    const decoded = Buffer.from(String(content).replace(/\n/g, ""), "base64").toString("utf8");
    return json(res, 200, { ok: true, branch: targetBranch, path, content: decoded, sha: r.data.sha || null });
  } catch (e) {
    return json(res, 500, { error: "Fetch failed" });
  }
};
