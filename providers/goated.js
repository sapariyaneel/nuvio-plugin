var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_API_HOST = "https://api.reallyfast.xyz";
let cachedDomains = null;
function getDomains() {
  return __async(this, null, function* () {
    if (cachedDomains)
      return cachedDomains;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true });
      cachedDomains = yield resp.json();
    } catch (e) {
      cachedDomains = {};
    }
    return cachedDomains;
  });
}
function getApiHost() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    return (d.goated || d["reallyfast"] || d["api.reallyfast.xyz"] || FALLBACK_API_HOST).replace(/\/+$/, "");
  });
}
function sha256Hex(str) {
  return __async(this, null, function* () {
    const bytes = new TextEncoder().encode(str);
    const digest = yield crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}
function solveProofOfWork(apiHost) {
  return __async(this, null, function* () {
    const resp = yield fetch(`${apiHost}/api/challenge`, { skipSizeCheck: true });
    if (!resp.ok)
      throw new Error("failed to fetch PoW challenge");
    const { challenge, difficulty } = yield resp.json();
    const target = "0".repeat(difficulty);
    for (let nonce = 0; nonce < 5e6; nonce++) {
      const hash = yield sha256Hex(challenge + nonce);
      if (hash.startsWith(target))
        return { challenge, nonce: String(nonce) };
    }
    throw new Error("PoW solve timed out");
  });
}
function getTmdbRuntimeSeconds(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season || 1}/episode/${episode || 1}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const resp = yield fetch(url, { skipSizeCheck: true });
      if (!resp.ok)
        return null;
      const data = yield resp.json();
      const minutes = data.runtime;
      return minutes ? minutes * 60 : null;
    } catch (e) {
      return null;
    }
  });
}
function formatBytes(bytes) {
  if (!bytes)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function resolveUrl(urlLine, baseUrl) {
  try {
    return new URL(urlLine, baseUrl).toString();
  } catch (e) {
    return urlLine;
  }
}
function parseMasterPlaylist(text, baseUrl) {
  const lines = text.split("\n").map((l) => l.trim());
  const variants = [];
  let defaultAudioUrl = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-MEDIA") && lines[i].includes("TYPE=AUDIO") && !defaultAudioUrl) {
      const uriMatch = lines[i].match(/URI="([^"]+)"/);
      const isDefault = /DEFAULT=YES/.test(lines[i]);
      if (uriMatch && (isDefault || !defaultAudioUrl))
        defaultAudioUrl = resolveUrl(uriMatch[1], baseUrl);
      continue;
    }
    if (!lines[i].startsWith("#EXT-X-STREAM-INF"))
      continue;
    const attrLine = lines[i];
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#"))
      continue;
    const bandwidthMatch = attrLine.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = attrLine.match(/RESOLUTION=(\d+)x(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
    variants.push({ url: resolveUrl(urlLine, baseUrl), bandwidth, height });
  }
  return { variants, defaultAudioUrl };
}
function getAudioBitrateBps(audioPlaylistUrl) {
  return __async(this, null, function* () {
    if (!audioPlaylistUrl)
      return 0;
    try {
      const text = yield (yield fetch(audioPlaylistUrl, { skipSizeCheck: true })).text();
      const match = text.match(/#EXT-X-BITRATE:(\d+)/);
      return match ? parseInt(match[1], 10) * 1e3 : 0;
    } catch (e) {
      return 0;
    }
  });
}
function qualityLabelFromHeight(height) {
  if (height >= 2e3)
    return "4K";
  if (height <= 0)
    return "Unknown";
  return `${height}p`;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let numericTmdbId = tmdbId;
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const findData = yield (yield fetch(findUrl, { skipSizeCheck: true })).json();
        const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
        numericTmdbId = results && results.length ? results[0].id : null;
        if (!numericTmdbId)
          return [];
      }
      numericTmdbId = parseInt(numericTmdbId, 10);
      if (!numericTmdbId)
        return [];
      const apiHost = yield getApiHost();
      const isTv = mediaType === "tv";
      const resolvePow = yield solveProofOfWork(apiHost);
      const resolveBody = {
        mediaType: isTv ? "tv" : "movie",
        id: String(numericTmdbId),
        challenge: resolvePow.challenge,
        nonce: resolvePow.nonce
      };
      if (isTv) {
        resolveBody.season = season || 1;
        resolveBody.episode = episode || 1;
      }
      const resolveResp = yield fetch(`${apiHost}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveBody),
        skipSizeCheck: true
      });
      if (!resolveResp.ok)
        return [];
      const resolveData = yield resolveResp.json().catch(() => null);
      if (!resolveData || !resolveData.url)
        return [];
      const playlistResp = yield fetch(resolveData.url, { skipSizeCheck: true });
      if (!playlistResp.ok)
        return [];
      const playlistText = yield playlistResp.text();
      const { variants, defaultAudioUrl } = parseMasterPlaylist(playlistText, resolveData.url);
      if (!variants.length)
        return [];
      const topVariant = variants.slice().sort((a, b) => b.height - a.height)[0];
      const [runtimeSeconds, audioBitrateBps] = yield Promise.all([
        getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode),
        getAudioBitrateBps(defaultAudioUrl)
      ]);
      let subtitles = [];
      try {
        const subPow = yield solveProofOfWork(apiHost);
        const subBody = {
          mediaType: isTv ? "tv" : "movie",
          id: String(numericTmdbId),
          challenge: subPow.challenge,
          nonce: subPow.nonce
        };
        if (isTv) {
          subBody.season = season || 1;
          subBody.episode = episode || 1;
        }
        const subResp = yield fetch(`${apiHost}/api/subtitles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subBody),
          skipSizeCheck: true
        });
        if (subResp.ok) {
          const subData = yield subResp.json().catch(() => null);
          subtitles = (subData && subData.subtitles || []).filter((s) => s && s.url).map((s) => ({ url: s.url, lang: s.label || s.language || "Unknown" }));
        }
      } catch (e) {
      }
      const totalBitrateBps = topVariant.bandwidth + audioBitrateBps;
      const quality = qualityLabelFromHeight(topVariant.height);
      return [{
        url: resolveData.url,
        quality,
        title: `Goated ${quality} (Adaptive)`,
        name: "Goated",
        size: runtimeSeconds ? formatBytes(totalBitrateBps * runtimeSeconds / 8) : "Unknown",
        subtitles
      }];
    } catch (e) {
      console.error("[Goated]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
