/**
 * hindmoviez - Built from src/providers/hindmoviez.js
 * Generated: 2026-08-20T09:51:42.126Z
 */

// src/providers/hindmoviez.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://hindmovie.icu";
var MVLINK_AJAX_URL = "https://mvlink.blog/wp-admin/admin-ajax.php";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
};
var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function utf8Bytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 65535)
      i++;
    if (code < 128) {
      bytes.push(code);
    } else if (code < 2048) {
      bytes.push(192 | code >> 6, 128 | code & 63);
    } else if (code < 65536) {
      bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    } else {
      bytes.push(
        240 | code >> 18,
        128 | code >> 12 & 63,
        128 | code >> 6 & 63,
        128 | code & 63
      );
    }
  }
  return bytes;
}
function base64UrlEncode(str) {
  const bytes = utf8Bytes(str);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : void 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : void 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[(b0 & 3) << 4 | (b1 === void 0 ? 0 : b1 >> 4)];
    out += b1 === void 0 ? "" : B64_CHARS[(b1 & 15) << 2 | (b2 === void 0 ? 0 : b2 >> 6)];
    out += b2 === void 0 ? "" : B64_CHARS[b2 & 63];
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_");
}
async function resolveHshareUrl(href) {
  try {
    const m = String(href || "").match(/^https?:\/\/hshare\.ink\/\?id=(.+)$/i);
    if (!m)
      return href;
    const rawId = decodeURIComponent(m[1]);
    if (!rawId)
      return href;
    const encodedId = base64UrlEncode(rawId);
    const body = `action=hindshare_sign&d=${encodeURIComponent(encodedId)}`;
    const resp = await fetch(MVLINK_AJAX_URL, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://mvlink.blog/"
      },
      body,
      skipSizeCheck: true,
      redirect: "follow"
    });
    const data = await resp.json();
    return data && data.success && data.data && data.data.url ? data.data.url : href;
  } catch (e) {
    return href;
  }
}
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}
async function getBaseUrl() {
  const d = await getDomains();
  return d.hindmoviez || FALLBACK_BASE_URL;
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
async function resolveImdbToTmdb(imdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = await (await fetch(url, { skipSizeCheck: true })).json();
    const results = mediaType === "tv" ? data.tv_results : data.movie_results;
    return results && results.length ? results[0].id : null;
  } catch (e) {
    return null;
  }
}
async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      tmdbId = await resolveImdbToTmdb(tmdbId, mediaType);
      if (!tmdbId)
        return [];
    }
    const baseUrl = await getBaseUrl();
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title)
      return [];
    const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(searchHtml);
    const results = [];
    $("article").each((i, el) => {
      const a = $("h2.entry-title a", el);
      const href = a.attr("href");
      const t = a.text().trim();
      if (href)
        results.push({ title: t, url: href });
    });
    if (!results.length)
      return [];
    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
    if (!match) {
      match = results.find((r) => r.title.toLowerCase().includes("season") && r.title.toLowerCase().includes(lcTitle.split(" ")[0]));
    }
    if (!match)
      match = results[0];
    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $page = cheerio.load(pageHtml);
    const streams = [];
    if (isTV) {
      let foundEp = false;
      const h3s = $page("h3").toArray();
      for (const h3 of h3s) {
        if (foundEp)
          break;
        const h3Text = $page(h3).text();
        const seasonMatch = h3Text.match(/Season\s*(\d+)/i);
        if (!seasonMatch || parseInt(seasonMatch[1]) !== season)
          continue;
        const p = $page(h3).next();
        if (!p.length || p.prop("tagName") !== "P")
          continue;
        const episodeListUrl = p.find("a[href]").first().attr("href");
        if (!episodeListUrl)
          continue;
        try {
          const epListHtml = await (await fetch(episodeListUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
          const $epList = cheerio.load(epListHtml);
          const epAnchors = $epList("h3 > a").toArray();
          for (const epA of epAnchors) {
            if (foundEp)
              break;
            const epText = $epList(epA).text();
            const epMatch = epText.match(/Episode\s*(\d+)/i);
            if (!epMatch || parseInt(epMatch[1]) !== episode)
              continue;
            const epHref = $epList(epA).attr("href");
            if (!epHref)
              continue;
            try {
              const resolvedEpUrl = await resolveHshareUrl(epHref);
              const epPageHtml = await (await fetch(resolvedEpUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
              const $epPage = cheerio.load(epPageHtml);
              const epName = ($epPage("div.container p").filter((i, p2) => $epPage(p2).text().includes("Name:")).first().text() || "").replace("Name:", "").trim();
              const epSizeText = ($epPage("div.container p").filter((i, p2) => $epPage(p2).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
              const epSizeBytes = toBytes(epSizeText);
              $epPage("a.btn").each((i, btn) => {
                const btnHref = $epPage(btn).attr("href") || "";
                if (btnHref && btnHref.startsWith("http")) {
                  streams.push({
                    url: btnHref,
                    quality: extractQuality(epName || btnHref),
                    title: `Hindmoviez [S${season}E${episode}]`,
                    subtitles: [],
                    size: formatBytes(epSizeBytes)
                  });
                }
              });
              foundEp = true;
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
    } else {
      const maxButtons = $page("a.maxbutton").toArray();
      for (const btn of maxButtons.slice(0, 3)) {
        try {
          const btnUrl = $page(btn).attr("href");
          if (!btnUrl)
            continue;
          const btnPageHtml = await (await fetch(btnUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
          const $btnPage = cheerio.load(btnPageHtml);
          const getLinksAnchors = $btnPage("div.entry-content a:contains('Get Links')").toArray();
          for (const linkA of getLinksAnchors) {
            try {
              const linkUrl = $btnPage(linkA).attr("href");
              if (!linkUrl)
                continue;
              const resolvedLinkUrl = await resolveHshareUrl(linkUrl);
              const linkPageHtml = await (await fetch(resolvedLinkUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
              const $linkPage = cheerio.load(linkPageHtml);
              const name = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Name:")).first().text() || "").replace("Name:", "").trim();
              const sizeText = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
              const sizeBytes = toBytes(sizeText);
              $linkPage("a.btn").each((i, dlBtn) => {
                const dlHref = $linkPage(dlBtn).attr("href") || "";
                if (dlHref && dlHref.startsWith("http")) {
                  streams.push({
                    url: dlHref,
                    quality: extractQuality(name || dlHref),
                    title: `Hindmoviez [${name || "Download"}]`,
                    subtitles: [],
                    size: formatBytes(sizeBytes)
                  });
                }
              });
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
    }
    return streams.filter((s) => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
