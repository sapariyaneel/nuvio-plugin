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
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://new1.vegamovies.futbol";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
function fetchWithTimeout(url, options = {}) {
  return fetch(url, options);
}
let cachedDomains = null;
function getDomains() {
  return __async(this, null, function* () {
    if (cachedDomains)
      return cachedDomains;
    try {
      const resp = yield fetchWithTimeout(DOMAINS_URL, { skipSizeCheck: true });
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
    return d.vegamovies || FALLBACK_BASE_URL;
  });
}
function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
}
function indexQuality(str) {
  const m = (str || "").match(/(\d{3,4})[pP]/);
  return m ? parseInt(m[1], 10) : 0;
}
function qualityLabel(n) {
  if (n >= 2160)
    return "2160p";
  if (n >= 1440)
    return "1440p";
  if (n >= 1080)
    return "1080p";
  if (n >= 720)
    return "720p";
  if (n >= 480)
    return "480p";
  if (n >= 360)
    return "360p";
  return "Unknown";
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
function cleanTitle(raw) {
  return (raw || "").split("(")[0].trim().replace(/\s+/g, " ");
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
    const data = yield (yield fetchWithTimeout(url, { skipSizeCheck: true })).json();
    return data && data.imdb_id ? data.imdb_id : null;
  });
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const data = yield (yield fetchWithTimeout(url, { skipSizeCheck: true })).json();
    return data.title || data.name || null;
  });
}
function searchSite(query) {
  return __async(this, null, function* () {
    const baseUrl = yield getBaseUrl();
    const url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=1`;
    const res = yield fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
    if (!res.ok)
      return [];
    const data = yield res.json().catch(() => null);
    if (!data || !Array.isArray(data.hits))
      return [];
    return data.hits.map((h) => h.document).filter(Boolean);
  });
}
function pickCandidate(hits, imdbId, isTv, season) {
  let pool = imdbId ? hits.filter((h) => h.imdb_id === imdbId) : hits;
  if (!pool.length)
    pool = hits;
  if (!pool.length)
    return null;
  if (isTv) {
    const targetSeason = season || 1;
    const seasonMatch = pool.find((h) => {
      const m = (h.permalink || "").match(/season-(\d+)/i);
      return m && parseInt(m[1], 10) === targetSeason;
    });
    if (seasonMatch)
      return seasonMatch;
  }
  return pool[0];
}
function hasDownloadMarkers(html) {
  return /nexdrive|vcloud|hubcloud|fastdl|genxfm/i.test(html || "");
}
function getPostContentHtml(permalink) {
  return __async(this, null, function* () {
    if (!permalink)
      return null;
    const baseUrl = yield getBaseUrl();
    const url = permalink.startsWith("http") ? permalink : `${baseUrl}${permalink.startsWith("/") ? "" : "/"}${permalink}`;
    try {
      const res = yield fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
      if (!res.ok)
        return null;
      const html = yield res.text();
      const $ = cheerio.load(html);
      const article = $("article").html() || $(".entry-content").html() || $(".post-content").html();
      return article && hasDownloadMarkers(article) ? article : null;
    } catch (e) {
      return null;
    }
  });
}
function getPostContent(id, permalink) {
  return __async(this, null, function* () {
    const baseUrl = yield getBaseUrl();
    const url = `${baseUrl}/wp-json/wp/v2/posts/${id}`;
    try {
      const res = yield fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
      if (res.ok) {
        const data = yield res.json().catch(() => null);
        const html = data && data.content ? data.content.rendered : null;
        if (html && hasDownloadMarkers(html))
          return html;
      }
    } catch (e) {
    }
    return getPostContentHtml(permalink);
  });
}
function anchorsIn(fragment, hostPattern) {
  const links = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRe.exec(fragment)) !== null) {
    const href = m[1];
    if (hostPattern && !hostPattern.test(href))
      continue;
    links.push({ href, label: m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() });
  }
  return links;
}
const NEXDRIVE_HOST_RE = /nexdrive|vcloud\.(zip|fit)|fastdl\.zip|hubcloud|hubdrive/i;
function isDownloadHeading(heading) {
  if (/^\d+\s+comments?$/i.test(heading))
    return false;
  return !/(Movie|Series)\s+Info|SYNOPSIS|PLOT|Screenshots/i.test(heading);
}
function extractQualityBlocks(html) {
  const blocks = [];
  const headingRe = /<h[35]\b[^>]*>([\s\S]*?)<\/h[35]>/gi;
  const found = [];
  let m;
  while ((m = headingRe.exec(html)) !== null) {
    found.push({
      heading: m[1].replace(/<[^>]*>/g, "").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim(),
      start: headingRe.lastIndex,
      index: m.index
    });
  }
  for (let i = 0; i < found.length; i++) {
    const { heading, start } = found[i];
    if (!heading || !isDownloadHeading(heading))
      continue;
    const end = i + 1 < found.length ? found[i + 1].index : html.length;
    const links = anchorsIn(html.slice(start, end), NEXDRIVE_HOST_RE);
    if (links.length)
      blocks.push({ heading, links });
  }
  return blocks;
}
const MIRROR_HOST_RE = /vcloud\.(zip|fit)|fastdl\.zip|hubcloud|hubdrive/i;
function nexdriveEpisodeOf(text) {
  const m = (text || "").match(/Episode[s]?\s*[:\-]?\s*(\d{1,3})/i);
  return m ? parseInt(m[1], 10) : null;
}
function mirrorLinksIn(fragment) {
  return anchorsIn(fragment, MIRROR_HOST_RE);
}
function resolveNexdrive(nexdriveUrl, episode) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetchWithTimeout(nexdriveUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const wanted = episode ? parseInt(episode, 10) : null;
      if (!wanted)
        return mirrorLinksIn(html);
      const headingRe = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
      const sections = [];
      let last = null;
      let cursor = 0;
      let h;
      while ((h = headingRe.exec(html)) !== null) {
        if (last)
          sections.push({ episode: last.episode, html: html.slice(last.end, h.index) });
        const ep = nexdriveEpisodeOf(h[1].replace(/<[^>]*>/g, ""));
        last = { episode: ep, end: headingRe.lastIndex };
        cursor = headingRe.lastIndex;
      }
      if (last)
        sections.push({ episode: last.episode, html: html.slice(last.end) });
      const matched = [];
      for (const section of sections) {
        if (section.episode === wanted)
          matched.push(...mirrorLinksIn(section.html));
      }
      if (matched.length)
        return matched;
      return cursor === 0 ? mirrorLinksIn(html) : [];
    } catch (e) {
      return [];
    }
  });
}
function fastdlExtractor(url) {
  return __async(this, null, function* () {
    try {
      const u = new URL(url);
      const downloadParam = u.searchParams.get("download");
      if (!downloadParam)
        return [];
      const res = yield fetchWithTimeout(url, { headers: HEADERS, redirect: "manual", skipSizeCheck: true });
      const loc = res.headers.get("location");
      if (loc)
        return [{ url: loc, quality: 0, title: "G-Direct" }];
      const html = yield res.text();
      const m = html.match(/var\s+reurl\s*=\s*["']([^"']+)["']/);
      if (!m)
        return [];
      const reurl = m[1];
      const idx = reurl.indexOf("link=");
      const direct = idx === -1 ? reurl : reurl.slice(idx + 5);
      if (!direct.startsWith("http"))
        return [];
      return [{ url: direct, quality: 0, title: "G-Direct" }];
    } catch (e) {
      return [];
    }
  });
}
function base64Decode(value) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const input = (value || "").replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  let i = 0;
  while (i < input.length) {
    const e1 = chars.indexOf(input.charAt(i++));
    const e2 = chars.indexOf(input.charAt(i++));
    const e3 = chars.indexOf(input.charAt(i++));
    const e4 = chars.indexOf(input.charAt(i++));
    const c1 = e1 << 2 | e2 >> 4;
    const c2 = (e2 & 15) << 4 | e3 >> 2;
    const c3 = (e3 & 3) << 6 | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64)
      output += String.fromCharCode(c2);
    if (e4 !== 64)
      output += String.fromCharCode(c3);
  }
  return output;
}
function resolveVcloudToken(vcloudUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetchWithTimeout(vcloudUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const m = html.match(/atob\(atob\('([A-Za-z0-9+/=]+)'\)\)/);
      if (!m)
        return vcloudUrl;
      const once = base64Decode(m[1]);
      const twice = base64Decode(once);
      return twice.startsWith("http") ? twice : vcloudUrl;
    } catch (e) {
      return vcloudUrl;
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      const ref = referer || "V-Cloud";
      let currentUrl = url;
      if (currentUrl.includes("hubcloud.ink"))
        currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
      if (/vcloud\.(zip|fit)/i.test(currentUrl)) {
        currentUrl = yield resolveVcloudToken(currentUrl);
      }
      const baseUrl = originOf(currentUrl);
      if (!baseUrl)
        return [];
      let href;
      if (currentUrl.includes("hubcloud.php") || /vcloud\.(zip|fit)/i.test(currentUrl)) {
        href = currentUrl;
      } else {
        const html = yield (yield fetchWithTimeout(currentUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $first = cheerio.load(html);
        const raw = $first("#download").attr("href") || "";
        if (!raw)
          return [];
        href = raw.toLowerCase().startsWith("http") ? raw : `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
      }
      if (!href.trim())
        return [];
      const pageHtml = yield (yield fetchWithTimeout(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const size = $("i#size").first().text() || "";
      const header = $("div.card-header").first().text() || "";
      const headerDetails = cleanTitle(header);
      const quality = indexQuality(header);
      const sizeInBytes = toBytes(size);
      let labelExtras = "";
      if (headerDetails.length > 0)
        labelExtras += `[${headerDetails}]`;
      if (size.length > 0)
        labelExtras += `[${size}]`;
      const buttons = $("a.btn").toArray().map((el) => ({
        link: $(el).attr("href") || "",
        label: ($(el).text() || "").toLowerCase()
      }));
      const streams = [];
      for (const { link, label } of buttons) {
        if (!link)
          continue;
        try {
          if (label.includes("fsl server") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server")) {
            streams.push({ url: link, quality, title: `${ref} ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("buzzserver")) {
            const resp = yield fetchWithTimeout(`${link}/download`, {
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
              redirect: "manual",
              skipSizeCheck: true
            });
            const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
            if (dlink.trim())
              streams.push({ url: dlink, quality, title: `${ref} [BuzzServer] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server")) {
            const base = originOf(link);
            const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
            streams.push({ url: finalUrl, quality, title: `${ref} Pixeldrain ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("10gbps")) {
            let redirectUrl = link;
            let finalLink = null;
            for (let i = 0; i < 5; i++) {
              const r = yield fetchWithTimeout(redirectUrl, { redirect: "manual", skipSizeCheck: true });
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
              streams.push({ url: finalLink, quality, title: `${ref} [10Gbps] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function resolveMirrorLink(href, label) {
  return __async(this, null, function* () {
    try {
      if (/fastdl\.zip/i.test(href))
        return fastdlExtractor(href);
      if (/vcloud\.(zip|fit)|hubcloud|hubdrive/i.test(href))
        return hubCloudExtractor(href, "V-Cloud");
      return [];
    } catch (e) {
      return [];
    }
  });
}
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetchWithTimeout(url, { skipSizeCheck: true })).json();
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
      const isTv = mediaType === "tv";
      const baseUrl = yield getBaseUrl();
      const [imdbId, title] = yield Promise.all([
        getImdbId(tmdbId, mediaType),
        getTmdbTitle(tmdbId, mediaType)
      ]);
      if (!title) {
        return [];
      }
      const hits = yield searchSite(title);
      if (!hits.length) {
        return [];
      }
      const candidate = pickCandidate(hits, imdbId, isTv, season);
      if (!candidate || !candidate.id) {
        return [];
      }
      const content = yield getPostContent(candidate.id, candidate.permalink);
      if (!content) {
        return [];
      }
      const blocks = extractQualityBlocks(content);
      if (!blocks.length) {
        return [];
      }
      const perBlock = yield Promise.all(blocks.map((block) => __async(this, null, function* () {
        const quality = indexQuality(block.heading);
        const mirrorLists = yield Promise.all(block.links.map((link) => resolveNexdrive(link.href, isTv ? episode : null)));
        const mirrors = mirrorLists.reduce((acc, list) => acc.concat(list), []);
        const resolvedLists = yield Promise.all(mirrors.map((m) => resolveMirrorLink(m.href, m.label)));
        return resolvedLists.reduce((acc, list) => acc.concat(list), []).map((s) => ({
          url: s.url,
          quality: qualityLabel(s.quality || quality),
          title: `Vegamovies ${block.heading}`.trim(),
          name: s.title || "Vegamovies",
          headers: { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
          subtitles: [],
          // s.size is already a formatted string from the extractor above - re-running it
          // through formatBytes() treats it as a raw byte count and produces NaN.
          size: s.size || ""
        }));
      })));
      return perBlock.reduce((acc, list) => acc.concat(list), []).filter((s) => s && s.url);
    } catch (e) {
      console.error("[Vegamovies]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
