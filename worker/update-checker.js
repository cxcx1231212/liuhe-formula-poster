const LOTTERY_TYPES = [1, 5, 8];
const LOTTERY_API = "https://6htv70.com/gallerynew/h5/index/lastLotteryRecord";

function settings(env) {
  return {
    owner: env.GITHUB_OWNER || "cxcx1231212",
    repo: env.GITHUB_REPO || "liuhe-formula-poster",
    workflow: env.GITHUB_WORKFLOW || "auto-update.yml",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

async function readSaved(env, lotteryType) {
  if (!env.LOTTERY_CACHE) return null;
  return env.LOTTERY_CACHE.get("lottery:latest:" + lotteryType, "json");
}

async function fetchLatest(env, lotteryType) {
  const saved = await readSaved(env, lotteryType);
  try {
    const url = new URL(LOTTERY_API);
    url.searchParams.set("lotteryType", String(lotteryType));
    url.searchParams.set("_", String(Date.now()));
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; LiuheUpdateChecker/2.0)",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!response.ok) throw new Error("upstream " + response.status);
    const payload = await response.json();
    if (payload.code !== 10000 || payload.data?.intPeriod == null) throw new Error("invalid upstream data");
    const current = {
      ok: true,
      lotteryType,
      period: Number(payload.data.intPeriod),
      data: payload.data,
      fetchedAt: new Date().toISOString(),
      source: "cloudflare",
    };
    if (!saved || current.period >= Number(saved.period || 0)) {
      if (env.LOTTERY_CACHE) await env.LOTTERY_CACHE.put("lottery:latest:" + lotteryType, JSON.stringify(current));
      return current;
    }
    return { ...saved, fallback: true, reason: "upstream-regressed" };
  } catch (error) {
    if (saved) return { ...saved, fallback: true, reason: String(error) };
    throw error;
  }
}

async function githubRequest(env, path, init = {}) {
  if (!env.GITHUB_DISPATCH_TOKEN) throw new Error("未配置 GITHUB_DISPATCH_TOKEN");
  return fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + env.GITHUB_DISPATCH_TOKEN,
      "User-Agent": "liuhe-formula-update-checker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
}

async function generatedPeriods(env) {
  const { owner, repo } = settings(env);
  const response = await githubRequest(env, "/repos/" + owner + "/" + repo + "/contents/public/generated/lottery-catalog.json?ref=main");
  if (!response.ok) throw new Error("读取 GitHub 期数目录失败：" + response.status);
  const body = await response.json();
  const catalog = JSON.parse(atob(body.content.replace(/\s/g, "")));
  return Object.fromEntries(catalog.map(row => [Number(row.lotteryType), Number(row.nextPeriod)]));
}

async function dispatch(env) {
  const { owner, repo, workflow } = settings(env);
  const response = await githubRequest(env, "/repos/" + owner + "/" + repo + "/actions/workflows/" + workflow + "/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: "main" }),
  });
  if (!response.ok) throw new Error("触发 GitHub 更新失败：" + response.status + " " + await response.text());
}

async function check(env) {
  const [latest, generated] = await Promise.all([
    Promise.all(LOTTERY_TYPES.map(type => fetchLatest(env, type))),
    generatedPeriods(env),
  ]);
  const stale = latest.filter(row => row.period + 1 > Number(generated[row.lotteryType] || 0)).map(row => row.lotteryType);
  let dispatched = false;
  if (stale.length) {
    const signature = stale.map(type => type + ":" + latest.find(row => row.lotteryType === type).period).join(",");
    const lock = env.LOTTERY_CACHE ? await env.LOTTERY_CACHE.get("lottery:dispatch-lock") : null;
    if (lock !== signature) {
      await dispatch(env);
      if (env.LOTTERY_CACHE) await env.LOTTERY_CACHE.put("lottery:dispatch-lock", signature, { expirationTtl: 900 });
      dispatched = true;
    }
  }
  return { ok: true, latest, generated, stale, dispatched, checkedAt: new Date().toISOString() };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/latest") {
        const type = Number(url.searchParams.get("lotteryType"));
        if (!LOTTERY_TYPES.includes(type)) return json({ ok: false, error: "invalid lotteryType" }, 400);
        return json(await fetchLatest(env, type));
      }
      if (url.pathname === "/health") {
        const latest = await Promise.all(LOTTERY_TYPES.map(type => fetchLatest(env, type)));
        return json({ ok: true, storage: Boolean(env.LOTTERY_CACHE), latest });
      }
      if (url.pathname === "/check" || url.pathname === "/") return json(await check(env));
      return json({ ok: false, error: "not found" }, 404);
    } catch (error) {
      return json({ ok: false, error: String(error) }, 500);
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(check(env));
  },
};
