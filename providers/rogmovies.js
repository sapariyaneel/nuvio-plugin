/**
 * rogmovies - Built from src/providers/rogmovies.js
 * Generated: 2026-08-20T09:51:42.404Z
 */

// src/providers/rogmovies.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://new1.rogmovies.click";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
function fetchWithTimeout(url, options = {}) {
  return fetch(url, options);
}
var pageCache = null;
function fetchTextCached(url, options = {}) {
  if (!pageCache)
    return fetchWithTimeout(url, options).then((r) => r.text());
  const hit = pageCache[url];
  if (hit)
    return hit;
  const pending = fetchWithTimeout(url, options).then((r) => r.text()).catch((e) => {
    delete pageCache[url];
    throw e;
  });
  pageCache[url] = pending;
  return pending;
}
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
  try {
    const resp = await fetchWithTimeout(DOMAINS_URL, { skipSizeCheck: true });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}
async function getBaseUrl() {
  const d = await getDomains();
  return d.rogmovies || FALLBACK_BASE_URL;
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
function meetsMinSize(sizeStr) {
  const m = String(sizeStr || "").match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
  if (!m)
    return true;
  const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}
function cleanTitle(raw) {
  return (raw || "").split("(")[0].trim().replace(/\s+/g, " ");
}
async function getImdbId(tmdbId, mediaType) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
  const data = await (await fetchWithTimeout(url, { skipSizeCheck: true })).json();
  return data && data.imdb_id ? data.imdb_id : null;
}
async function getTmdbTitle(tmdbId, mediaType) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const data = await (await fetchWithTimeout(url, { skipSizeCheck: true })).json();
  return data.title || data.name || null;
}
async function searchSite(query) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=1`;
  const res = await fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
  if (!res.ok)
    return [];
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.hits))
    return [];
  return data.hits.map((h) => h.document).filter(Boolean);
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
async function getPostContentHtml(permalink) {
  if (!permalink)
    return null;
  const baseUrl = await getBaseUrl();
  const url = permalink.startsWith("http") ? permalink : `${baseUrl}${permalink.startsWith("/") ? "" : "/"}${permalink}`;
  try {
    const res = await fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
    if (!res.ok)
      return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const article = $("article").html() || $(".entry-content").html() || $(".post-content").html();
    return article && hasDownloadMarkers(article) ? article : null;
  } catch (e) {
    return null;
  }
}
async function getPostContent(id, permalink) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/wp-json/wp/v2/posts/${id}`;
  try {
    const res = await fetchWithTimeout(url, { headers: HEADERS, skipSizeCheck: true });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const html = data && data.content ? data.content.rendered : null;
      if (html && hasDownloadMarkers(html))
        return html;
    }
  } catch (e) {
  }
  return getPostContentHtml(permalink);
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
var NEXDRIVE_HOST_RE = /nexdrive|vcloud\.(zip|fit)|fastdl\.zip|hubcloud|hubdrive/i;
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
var MIRROR_HOST_RE = /vcloud\.(zip|fit)|fastdl\.zip|hubcloud|hubdrive/i;
function nexdriveEpisodeOf(text) {
  const m = (text || "").match(/Episode[s]?\s*[:\-]?\s*(\d{1,3})/i);
  return m ? parseInt(m[1], 10) : null;
}
function mirrorLinksIn(fragment) {
  return anchorsIn(fragment, MIRROR_HOST_RE);
}
async function resolveNexdrive(nexdriveUrl, episode) {
  try {
    const html = await fetchTextCached(nexdriveUrl, { headers: HEADERS, skipSizeCheck: true });
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
}
async function fastdlExtractor(url) {
  try {
    const u = new URL(url);
    const downloadParam = u.searchParams.get("download");
    if (!downloadParam)
      return [];
    const res = await fetchWithTimeout(url, { headers: HEADERS, redirect: "manual", skipSizeCheck: true });
    const loc = res.headers.get("location");
    if (loc)
      return [{ url: loc, quality: 0, title: "G-Direct" }];
    const html = await res.text();
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
async function resolveVcloudToken(vcloudUrl) {
  try {
    const html = await fetchTextCached(vcloudUrl, { headers: HEADERS, skipSizeCheck: true });
    const m = html.match(/atob\(atob\('([A-Za-z0-9+/=]+)'\)\)/);
    if (!m)
      return vcloudUrl;
    const once = base64Decode(m[1]);
    const twice = base64Decode(once);
    return twice.startsWith("http") ? twice : vcloudUrl;
  } catch (e) {
    return vcloudUrl;
  }
}
async function hubCloudExtractor(url, referer) {
  try {
    const ref = referer || "V-Cloud";
    let currentUrl = url;
    if (currentUrl.includes("hubcloud.ink"))
      currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
    if (/vcloud\.(zip|fit)/i.test(currentUrl)) {
      currentUrl = await resolveVcloudToken(currentUrl);
    }
    const baseUrl = originOf(currentUrl);
    if (!baseUrl)
      return [];
    let href;
    if (currentUrl.includes("hubcloud.php") || /vcloud\.(zip|fit)/i.test(currentUrl)) {
      href = currentUrl;
    } else {
      const html = await fetchTextCached(currentUrl, { headers: HEADERS, skipSizeCheck: true });
      const $first = cheerio.load(html);
      const raw = $first("#download").attr("href") || "";
      if (!raw)
        return [];
      href = raw.toLowerCase().startsWith("http") ? raw : `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
    }
    if (!href.trim())
      return [];
    const pageHtml = await fetchTextCached(href, { headers: HEADERS, skipSizeCheck: true });
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
          const resp = await fetchWithTimeout(`${link}/download`, {
            headers: { ...HEADERS, Referer: link },
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
            const r = await fetchWithTimeout(redirectUrl, { redirect: "manual", skipSizeCheck: true });
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
}
async function resolveMirrorLink(href, label) {
  try {
    if (/fastdl\.zip/i.test(href))
      return fastdlExtractor(href);
    if (/vcloud\.(zip|fit)|hubcloud|hubdrive/i.test(href))
      return hubCloudExtractor(href, "V-Cloud");
    return [];
  } catch (e) {
    return [];
  }
}
async function resolveImdbToTmdb(imdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = await (await fetchWithTimeout(url, { skipSizeCheck: true })).json();
    const results = mediaType === "tv" ? data.tv_results : data.movie_results;
    return results && results.length ? results[0].id : null;
  } catch (e) {
    return null;
  }
}
async function getStreams(tmdbId, mediaType, season, episode) {
  pageCache = {};
  try {
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      tmdbId = await resolveImdbToTmdb(tmdbId, mediaType);
      if (!tmdbId)
        return [];
    }
    const isTv = mediaType === "tv";
    const baseUrl = await getBaseUrl();
    const [imdbId, title] = await Promise.all([
      getImdbId(tmdbId, mediaType),
      getTmdbTitle(tmdbId, mediaType)
    ]);
    if (!title) {
      return [];
    }
    const hits = await searchSite(title);
    if (!hits.length) {
      return [];
    }
    const candidate = pickCandidate(hits, imdbId, isTv, season);
    if (!candidate || !candidate.id) {
      return [];
    }
    const content = await getPostContent(candidate.id, candidate.permalink);
    if (!content) {
      return [];
    }
    let blocks = extractQualityBlocks(content);
    if (!blocks.length) {
      return [];
    }
    if (isTv) {
      const wantedSeason = season ? parseInt(season, 10) : 1;
      const sameSeason = blocks.filter((b) => {
        const m = b.heading.match(/Season\s*(\d{1,3})/i);
        return m && parseInt(m[1], 10) === wantedSeason;
      });
      if (sameSeason.length)
        blocks = sameSeason;
    }
    const perBlock = await Promise.all(blocks.map(async (block) => {
      const quality = indexQuality(block.heading);
      const mirrorLists = await Promise.all(block.links.map((link) => resolveNexdrive(link.href, isTv ? episode : null)));
      const mirrors = mirrorLists.reduce((acc, list) => acc.concat(list), []);
      const seenMirrors = {};
      const uniqueMirrors = mirrors.filter((m) => {
        if (!m || !m.href || seenMirrors[m.href])
          return false;
        seenMirrors[m.href] = true;
        return true;
      });
      const resolvedLists = await Promise.all(uniqueMirrors.map((m) => resolveMirrorLink(m.href, m.label)));
      return resolvedLists.reduce((acc, list) => acc.concat(list), []).map((s) => ({
        url: s.url,
        quality: qualityLabel(s.quality || quality),
        title: `RogMovies ${block.heading}`.trim(),
        name: s.title || "RogMovies",
        headers: { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
        subtitles: [],
        // s.size is already formatted, don't re-run through formatBytes
        size: s.size || ""
      }));
    }));
    const seenUrls = {};
    return perBlock.reduce((acc, list) => acc.concat(list), []).filter((s) => {
      if (!s || !s.url || seenUrls[s.url])
        return false;
      seenUrls[s.url] = true;
      return true;
    }).filter((s) => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
