const { json, verifyToken, githubConfig, getFileSha, putFile } = require("./_common");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const { token, path, base64, message } = req.body || {};
  if (!token || !path || typeof base64 !== "string") return json(res, 400, { error: "Missing token/path/base64" });

  const v = verifyToken(token);
  if (!v.ok) return json(res, 401, { error: v.error });

  const gh = githubConfig();
  if (!gh.ok) return json(res, 500, { error: gh.error });

  try {
    const shaRes = await getFileSha({ token: gh.token, owner: gh.owner, repo: gh.repo, path, branch: gh.branch });
    const sha = shaRes.ok ? shaRes.sha : undefined;

    const msg = message || `Upload ${path} via site editor`;

    const putRes = await putFile({
      token: gh.token, owner: gh.owner, repo: gh.repo, path, branch: gh.branch,
      contentBase64: base64, message: msg, sha
    });

    if (!putRes.ok) return json(res, putRes.status, { error: "GitHub upload failed", details: putRes.data });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: "Upload failed" });
  }
};
