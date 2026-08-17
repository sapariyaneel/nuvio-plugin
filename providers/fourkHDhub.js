/**
 * fourkHDhub - Built from src/providers/fourkHDhub.js
 * Generated: 2026-08-17T09:56:23.772Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/providers/fourkHDhub.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://4khdhub.one";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
};
var cachedDomains = null;
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
function getBaseUrl() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    return d["4khdhub"] || FALLBACK_BASE_URL;
  });
}
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  return "Unknown";
}
function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
}
function toBytes(size) {
  const m = (size || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m)
    return 0;
  const v = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "GB")
    return v * 1024 ** 3;
  if (unit === "MB")
    return v * 1024 ** 2;
  return v * 1024;
}
function formatBytes(bytes) {
  if (!bytes)
    return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function meetsMinSize(sizeStr) {
  const m = String(sizeStr || "").match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
  if (!m)
    return true;
  const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}
function resolveHubCloud(url) {
  return __async(this, null, function* () {
    var _a;
    try {
      const html1 = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const $1 = cheerio.load(html1);
      let href = $1("#download").attr("href") || "";
      if (!href)
        return null;
      if (!href.startsWith("http")) {
        const base = ((_a = url.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : _a[1]) || "";
        href = base + "/" + href.replace(/^\//, "");
      }
      const html2 = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $2 = cheerio.load(html2);
      const header = $2("div.card-header").text() || "";
      const sizeText = $2("i#size").first().text() || "";
      const quality = extractQuality(header);
      const sizeInBytes = toBytes(sizeText);
      const buttons = $2("a.btn").toArray().map((a) => ({
        link: $2(a).attr("href") || "",
        label: ($2(a).text() || "").toLowerCase().trim()
      }));
      const streams = [];
      for (const { link, label } of buttons) {
        if (!link)
          continue;
        try {
          if (label.includes("fsl server") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server")) {
            streams.push({ url: link, quality, title: `4KHDHUB [${label}]`, size: formatBytes(sizeInBytes) });
          } else if (label.includes("buzzserver")) {
            const resp = yield fetch(`${link}/download`, {
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
              redirect: "manual",
              skipSizeCheck: true
            });
            const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
            if (dlink.trim())
              streams.push({ url: dlink, quality, title: `4KHDHUB [BuzzServer]`, size: formatBytes(sizeInBytes) });
          } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server") || label.includes("pixeldrain")) {
            const base = originOf(link);
            const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
            streams.push({ url: finalUrl, quality, title: `4KHDHUB [Pixeldrain]`, size: formatBytes(sizeInBytes) });
          } else if (label.includes("10gbps")) {
            let redirectUrl = link;
            let finalLink = null;
            for (let i = 0; i < 5; i++) {
              const r = yield fetch(redirectUrl, { redirect: "manual", skipSizeCheck: true });
              if (r.status >= 300 && r.status < 400) {
                const loc = r.headers.get("location");
                if (loc && loc.includes("link=")) {
                  finalLink = loc.split("link=")[1];
                  break;
                }
                if (loc)
                  redirectUrl = new URL(loc, redirectUrl).toString();
              } else
                break;
            }
            if (finalLink)
              streams.push({ url: finalLink, quality, title: `4KHDHUB [10Gbps]`, size: formatBytes(sizeInBytes) });
          } else if (link.match(/\.(mp4|mkv|m3u8)/i)) {
            streams.push({ url: link, quality, title: `4KHDHUB [${label}]`, size: formatBytes(sizeInBytes) });
          }
        } catch (e) {
        }
      }
      return streams.length ? streams : null;
    } catch (e) {
      return null;
    }
  });
}
function resolveRedirect(rawUrl) {
  return __async(this, null, function* () {
    try {
      if (!rawUrl.includes("id="))
        return rawUrl;
      const resp = yield fetch(rawUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      return resp.url || rawUrl;
    } catch (e) {
      return rawUrl;
    }
  });
}
function probeSize(url) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const m = html.match(/([\d.]+\s*(?:GB|MB))(?!\w)/i);
      return m ? formatBytes(toBytes(m[1])) : "";
    } catch (e) {
      return "";
    }
  });
}
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? data.tv_results : data.movie_results;
      return results && results.length ? results[0].id : null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        tmdbId = yield resolveImdbToTmdb(tmdbId, mediaType);
        if (!tmdbId)
          return [];
      }
      const baseUrl = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.card-grid a").each((i, a) => {
        const href = $(a).attr("href");
        const t = $("h3", a).text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const streams = [];
      if (isTV) {
        let found = false;
        const episodeHrefs = [];
        $page("div.episodes-list div.season-item").each((i, seasonEl) => {
          if (found)
            return;
          const seasonText = $page("div.episode-number", seasonEl).text();
          const seasonMatch = seasonText.match(/S?([1-9][0-9]*)/);
          if (!seasonMatch || parseInt(seasonMatch[1]) !== season)
            return;
          $page("div.episode-download-item", seasonEl).each((j, epItem) => {
            if (found)
              return;
            const epText = $page("div.episode-file-info span.badge-psa", epItem).text();
            const epMatch = epText.match(/Episode-0*([1-9][0-9]*)/);
            if (!epMatch || parseInt(epMatch[1]) !== episode)
              return;
            found = true;
            $page("a", epItem).each((k, a) => {
              const href = $page(a).attr("href");
              if (href && href.startsWith("http")) {
                episodeHrefs.push({ href, epText });
              }
            });
          });
        });
        for (const { href, epText } of episodeHrefs.slice(0, 5)) {
          try {
            const resolved = yield resolveRedirect(href);
            if (resolved.toLowerCase().includes("hubcloud")) {
              const hubStreams = yield resolveHubCloud(resolved);
              if (hubStreams) {
                for (const s of hubStreams) {
                  streams.push(__spreadProps(__spreadValues({}, s), { title: `4KHDHUB [S${season}E${episode}] ${s.title || ""}`.trim(), subtitles: [] }));
                }
              }
            } else {
              streams.push({
                url: resolved,
                quality: extractQuality(epText),
                title: `4KHDHUB [S${season}E${episode}]`,
                size: yield probeSize(resolved),
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
      } else {
        const hrefs = [];
        $page("div.download-item a").each((i, a) => {
          const href = $page(a).attr("href");
          if (href && href.startsWith("http"))
            hrefs.push(href);
        });
        for (const href of hrefs.slice(0, 5)) {
          try {
            const resolved = yield resolveRedirect(href);
            if (resolved.toLowerCase().includes("hubcloud")) {
              const hubStreams = yield resolveHubCloud(resolved);
              if (hubStreams) {
                for (const s of hubStreams) {
                  streams.push(__spreadProps(__spreadValues({}, s), { subtitles: [] }));
                }
              }
            } else {
              streams.push({
                url: resolved,
                quality: extractQuality(resolved),
                title: `4KHDHUB`,
                size: yield probeSize(resolved),
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
      }
      return streams.filter((s) => meetsMinSize(s.size));
    } catch (e) {
      console.error("[4KHDHUB]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
