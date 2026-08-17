// moviebox.js
// MovieBox (aoneroom.com) - TMDB-id-based movie & TV streaming via the official mobile-app API.
// Flow: GET  {api}/wefeed-mobile-bff/tab-operating?page=1&tabId=0&version=  (signed, no auth token yet)
//       -> response's `x-user` header carries {"token":"<guest JWT>"} - this is the session token,
//          minted server-side on first contact, not something computed client-side.
//       POST {api}/wefeed-mobile-bff/subject-api/search/v2  {page,perPage,keyword}  (token as Bearer)
//       -> {data:{results:[{subjects:[{subjectId,subjectType,title,releaseDate,...}]}]}}
//       GET  {api}/wefeed-mobile-bff/subject-api/play-info?subjectId=X&se=Y&ep=Z  (token as Bearer)
//       -> {data:{streams:[{url,resolutions,format,size,codecName,signCookie?}]}}
// Every request is signed with HMAC-MD5 (x-tr-signature) over a canonical string built from the
// method/headers/body/timestamp/path - the same scheme the real Android app uses. Reverse-engineered
// from a since-archived open-source Stremio addon (mesamirh/stremio-moviebox) that implemented this
// exact flow; independently confirmed live against api3.aoneroom.com - bootstrap mints a real JWT,
// search returns real subjectIds, play-info returns real signed stream URLs including genuine 2160p
// (4K) HEVC files on the hakunaymatata.com CDN for titles that have them. No binary request bodies,
// no WASM, no browser-only APIs - HMAC-MD5 and plain JSON only.
//
// Multiple API hosts exist (api3-api6.aoneroom.com); one is tried, falling back through the rest on
// network failure or a 403/429/5xx response, matching the reference client's own host-pool behavior.

const CryptoJS = typeof require === "function" ? require("crypto-js") : global.CryptoJS;

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";

const HOST_POOL = [
  "https://api3.aoneroom.com",
  "https://api4.aoneroom.com",
  "https://api5.aoneroom.com",
  "https://api6.aoneroom.com"
];

// Base64-encoded, then base64-decoded-again signing key used by the real client. Reverse-engineered,
// not guessed - HMAC-MD5 signatures computed with it are accepted by the live server.
const SIGNING_KEY_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";

const PACKAGE_INFO = {
  package_name: "com.community.mbox.in",
  version_name: "3.0.03.0529.03",
  version_code: 50020042
};

const BRAND_MODELS = {
  Samsung: ["SM-S918B", "SM-A528B", "SM-M336B"],
  Xiaomi: ["2201117TI", "M2012K11AI"],
  Google: ["Pixel 7", "Pixel 8"]
};

const REQUEST_TIMEOUT_MS = 15000;

// The app's fetch polyfill (JsBindings.kt) doesn't read options.signal at all - passing an
// AbortController does nothing to the underlying request. A bare fetch() call therefore has no
// way to be cancelled, only raced: this still lets getStreams give up and move on to the next
// host/candidate within a bounded time instead of hanging indefinitely on a stalled connection.
function fetchWithTimeout(url, options) {
  return Promise.race([
    fetch(url, Object.assign({ redirect: "follow" }, options)),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`)), REQUEST_TIMEOUT_MS))
  ]);
}

let cachedDomains = null;
async function getDomains() {
  if (cachedDomains) return cachedDomains;
  try {
    const resp = await fetchWithTimeout(DOMAINS_URL, { skipSizeCheck: true });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}

async function getHostPool() {
  const d = await getDomains();
  const configured = d["moviebox"];
  if (configured) return [configured.replace(/\/+$/, "")];
  return HOST_POOL;
}

function randomDeviceId() {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function pickDevice() {
  const brands = Object.keys(BRAND_MODELS);
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const models = BRAND_MODELS[brand];
  const model = models[Math.floor(Math.random() * models.length)];
  return { brand: brand.toLowerCase(), model };
}

function md5Hex(str) {
  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
}

function hmacMd5Base64(keyWordArray, message) {
  return CryptoJS.HmacMD5(message, keyWordArray).toString(CryptoJS.enc.Base64);
}

function generateXClientToken(ts) {
  const s = String(ts);
  const reversed = s.split("").reverse().join("");
  return `${s},${md5Hex(reversed)}`;
}

function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  const paramKeys = Array.from(urlObj.searchParams.keys()).sort();
  let query = "";
  if (paramKeys.length > 0) {
    query = paramKeys
      .map((key) => urlObj.searchParams.getAll(key).map((val) => `${key}=${val}`).join("&"))
      .join("&");
  }
  const canonicalUrl = query ? `${path}?${query}` : path;

  let bodyHash = "";
  let bodyLength = "";
  if (body) {
    bodyHash = md5Hex(body);
    bodyLength = String(body.length);
  }
  return `${method.toUpperCase()}\n${accept || ""}\n${contentType || ""}\n${bodyLength}\n${timestamp}\n${bodyHash}\n${canonicalUrl}`;
}

function buildHeaders(method, url, body, session, authToken) {
  const ts = Date.now();
  const accept = "application/json";
  const contentType = body ? "application/json; charset=utf-8" : "application/json";
  const secretKey = CryptoJS.enc.Base64.parse(CryptoJS.enc.Base64.parse(SIGNING_KEY_B64).toString(CryptoJS.enc.Utf8));
  const canonical = buildCanonicalString(method, accept, contentType, url, body, ts);
  const signatureB64 = hmacMd5Base64(secretKey, canonical);

  const clientInfo = JSON.stringify({
    ...PACKAGE_INFO,
    os: "android",
    os_version: "16",
    device_id: session.deviceId,
    install_store: "ps",
    gaid: "d7578036d13336cc",
    brand: session.device.brand,
    model: session.device.model,
    system_language: "en",
    net: "NETWORK_WIFI",
    region: "IN",
    timezone: "Asia/Calcutta",
    sp_code: ""
  });

  const headers = {
    Accept: accept,
    "Content-Type": contentType,
    "x-client-token": generateXClientToken(ts),
    "x-tr-signature": `${ts}|2|${signatureB64}`,
    "User-Agent": `${PACKAGE_INFO.package_name}/${PACKAGE_INFO.version_code} (Linux; U; Android 16; en_IN; ${session.device.model}; Build/BP22.250325.006; Cronet/133.0.6876.3)`,
    "x-client-info": clientInfo,
    "x-client-status": "0"
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

async function apiRequest(session, method, pathAndQuery, body) {
  const hosts = await getHostPool();
  let lastError = null;
  for (const base of hosts) {
    const url = `${base}${pathAndQuery}`;
    try {
      const resp = await fetchWithTimeout(url, {
        method,
        headers: buildHeaders(method, url, body || null, session, session.token),
        body: body || undefined,
        skipSizeCheck: true
      });
      if ([403, 406, 407, 429, 500, 502, 503, 504].includes(resp.status)) {
        lastError = new Error(`HTTP ${resp.status} from ${base}`);
        continue;
      }
      const xUser = resp.headers.get("x-user");
      if (xUser) {
        try {
          const parsed = JSON.parse(xUser);
          if (parsed.token) session.token = parsed.token;
        } catch (e) {}
      }
      const data = await resp.json().catch(() => null);
      if (!data) {
        lastError = new Error(`Invalid JSON from ${base}`);
        continue;
      }
      return data;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("All MovieBox hosts exhausted");
}

async function ensureSession() {
  const session = { deviceId: randomDeviceId(), device: pickDevice(), token: null };
  await apiRequest(session, "GET", "/wefeed-mobile-bff/tab-operating?page=1&tabId=0&version=", null);
  return session;
}

function normalizeTitle(s) {
  if (!s) return "";
  return s
    .replace(/\[.*?\]/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ")
    .toLowerCase()
    .replace(/:/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Regional-language dub markers frequently attached to Indian-catalog MovieBox entries. TMDB
// titles are almost always the English/original title, so a subject carrying one of these tags
// is very likely a dub of the real thing, not the thing itself - real streams do exist under
// these entries sometimes, but an exact-title-minus-language-tag match should never outrank the
// plain original when both are present (confirmed live: "Rick and Morty [Hindi]" scores as a
// perfect match after normalization but has zero playable resource, while the untagged
// "Rick and Morty S1-S9" entry has real streams).
const DUB_TAG_RE = /\[(hindi|tamil|telugu|dual audio|dubbed)\]/i;

async function searchMovieBox(session, keyword) {
  const body = JSON.stringify({ page: 1, perPage: 15, keyword });
  const data = await apiRequest(session, "POST", "/wefeed-mobile-bff/subject-api/search/v2", body);
  const subjects = [];
  const results = data && data.data && data.data.results;
  if (Array.isArray(results)) {
    for (const group of results) {
      if (Array.isArray(group.subjects)) subjects.push(...group.subjects);
    }
  }
  return subjects;
}

// Returns every plausible candidate ranked best-first, rather than a single guess - an
// exact-title match with no playable resource (e.g. a regional dub entry MovieBox lists but
// never actually encoded) is common enough that the caller needs to be able to fall through to
// the next-best candidate instead of failing outright on the top pick.
function rankMatches(subjects, title, year, mediaType) {
  const targetType = mediaType === "tv" ? 2 : 1;
  const normTarget = normalizeTitle(title);
  const scored = [];
  for (const subject of subjects) {
    if (subject.subjectType !== targetType) continue;
    const normSubject = normalizeTitle(subject.title);
    let score = 0;
    if (normSubject === normTarget) score += 50;
    else if (normSubject.includes(normTarget) || normTarget.includes(normSubject)) score += 15;
    const subjectYear = subject.releaseDate ? subject.releaseDate.slice(0, 4) : null;
    if (year && subjectYear && String(year) === subjectYear) score += 35;
    if (DUB_TAG_RE.test(subject.title || "")) score -= 20;
    if (score >= 30) scored.push({ subject, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => ({ subjectId: entry.subject.subjectId, score: entry.score }));
}

function qualityLabel(resolutions) {
  const nums = String(resolutions || "")
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n));
  if (!nums.length) return "Auto";
  const max = Math.max(...nums);
  return max >= 2000 ? "4K" : `${max}p`;
}

function formatBytes(bytes) {
  const n = parseInt(bytes, 10);
  if (!n) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function fetchTmdbDetails(tmdbId, mediaType) {
  const isTv = mediaType === "tv";
  const url = `https://api.themoviedb.org/3/${isTv ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const resp = await fetchWithTimeout(url, { skipSizeCheck: true });
  if (!resp.ok) return null;
  const data = await resp.json();
  return {
    title: isTv ? data.name || data.original_name : data.title || data.original_title,
    originalTitle: isTv ? data.original_name : data.original_title,
    year: (isTv ? data.first_air_date : data.release_date || "").slice(0, 4)
  };
}

async function getStreamsForSubject(session, subjectId, season, episode) {
  const se = season || 0;
  const ep = episode || 0;
  const data = await apiRequest(
    session,
    "GET",
    `/wefeed-mobile-bff/subject-api/play-info?subjectId=${subjectId}&se=${se}&ep=${ep}`,
    null
  );
  const streamsList = data && data.data && data.data.streams;
  if (!Array.isArray(streamsList)) return [];

  const out = [];
  for (const stream of streamsList) {
    if (!stream.url) continue;
    const quality = qualityLabel(stream.resolutions);
    const headers = { "User-Agent": `${PACKAGE_INFO.package_name}/${PACKAGE_INFO.version_code} (Linux; U; Android 16; en_IN)` };
    if (stream.signCookie) headers.Cookie = stream.signCookie;
    out.push({
      url: stream.url,
      quality,
      title: `MovieBox ${quality}${season ? ` S${season}E${episode}` : ""}`,
      name: "MovieBox",
      size: formatBytes(stream.size),
      headers,
      subtitles: []
    });
  }
  out.sort((a, b) => {
    const rank = (q) => (q === "4K" ? 2160 : parseInt(q, 10) || 0);
    return rank(b.quality) - rank(a.quality);
  });
  return out;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    let numericTmdbId = tmdbId;
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const findData = await (await fetchWithTimeout(findUrl, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId) return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId) return [];

    const details = await fetchTmdbDetails(numericTmdbId, mediaType);
    if (!details || !details.title) return [];

    const session = await ensureSession();

    let candidates = rankMatches(await searchMovieBox(session, details.title), details.title, details.year, mediaType);
    if (!candidates.length && details.originalTitle && details.originalTitle !== details.title) {
      candidates = rankMatches(await searchMovieBox(session, details.originalTitle), details.originalTitle, details.year, mediaType);
    }
    if (!candidates.length) return [];

    const isTv = mediaType === "tv";
    const se = isTv ? season || 1 : 0;
    const ep = isTv ? episode || 1 : 0;

    // Duplicate listings for the same title/year are common (e.g. multiple independently-
    // uploaded "Obsession (2026)" entries), and the search API doesn't return them in a stable
    // order, so a title/year match with no encoded resource (or a weaker quality set) shouldn't
    // stop the lookup at the first hit - merge streams across every top-scoring candidate and
    // return the best set, deduped by resolution.
    const topScore = candidates[0].score;
    const tied = candidates.filter((c) => c.score === topScore).slice(0, 5);
    const merged = [];
    const seenQuality = new Set();
    for (const candidate of tied) {
      const streams = await getStreamsForSubject(session, candidate.subjectId, se, ep);
      for (const stream of streams) {
        if (seenQuality.has(stream.quality)) continue;
        seenQuality.add(stream.quality);
        merged.push(stream);
      }
    }
    if (merged.length) {
      merged.sort((a, b) => {
        const rank = (q) => (q === "4K" ? 2160 : parseInt(q, 10) || 0);
        return rank(b.quality) - rank(a.quality);
      });
      return merged;
    }

    // No luck among the top-scoring tier - fall through to the next-best candidates one at a
    // time rather than giving up (a lower title-match score can still be the right, working entry).
    for (const candidate of candidates.slice(tied.length, 6)) {
      const streams = await getStreamsForSubject(session, candidate.subjectId, se, ep);
      if (streams.length) return streams;
    }
    return [];
  } catch (e) {
    console.error("[MovieBox]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
