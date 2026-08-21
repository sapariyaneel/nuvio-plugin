/**
 * hdhub4u - Built from src/providers/hdhub4u.js
 * Generated: 2026-08-21T09:28:32.153Z
 */

// src/providers/hdhub4u.js
var CryptoJS = typeof require === "function" ? require("crypto-js") : global.CryptoJS;
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://hdhub4u.glass";
var FALLBACK_SEARCH_URL = "https://search.pingora.fyi";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var SEARCH_HEADERS = {
  ...HEADERS,
  "Accept": "application/json, text/plain, */*",
  "Referer": `${FALLBACK_BASE_URL}/`,
  "Origin": FALLBACK_BASE_URL
};
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true, redirect: "follow" });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}
async function getBaseUrl() {
  const d = await getDomains();
  return d.HDHUB4u || FALLBACK_BASE_URL;
}
async function getSearchUrl() {
  const d = await getDomains();
  return d.hdhub4uSearch || FALLBACK_SEARCH_URL;
}
function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
}
function indexQuality(str) {
  const m = (str || "").match(/(\d{3,4})[pP]/);
  return m ? parseInt(m[1], 10) : 2160;
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
function cleanTitle(raw) {
  const name = (raw || "").split("(")[0].trim().replace(/\s+/g, " ");
  const seasonMatch = (raw || "").match(/Season\s*\d+/i);
  const yearMatch = (raw || "").match(/\b(19|20)\d{2}\b/);
  let out = name;
  if (seasonMatch)
    out += ` (${seasonMatch[0]})`;
  if (yearMatch)
    out += ` (${yearMatch[0]})`;
  return out;
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
function rot13(value) {
  return (value || "").replace(
    /[a-zA-Z]/g,
    (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)
  );
}
async function getRedirectLinks(url) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
    let combined = "";
    let m;
    while ((m = regex.exec(html)) !== null) {
      combined += m[1] || m[2] || "";
    }
    const decodedString = base64Decode(rot13(base64Decode(base64Decode(combined))));
    const jsonObject = JSON.parse(decodedString);
    const encodedurl = base64Decode(jsonObject.o || "").trim();
    const data = (jsonObject.data || "").trim();
    const wphttp1 = (jsonObject.blog_url || jsonObject.l || "").trim();
    if (!wphttp1 || !data) {
      return encodedurl || url;
    }
    try {
      const resp = await fetch(`${wphttp1}?re=${data}`, { skipSizeCheck: true, redirect: "follow" });
      const html2 = await resp.text();
      const $ = cheerio.load(html2);
      const directlink = $("body").text().trim();
      return encodedurl.length ? encodedurl : directlink;
    } catch (e) {
      return encodedurl || url;
    }
  } catch (e) {
    return url;
  }
}
async function pixelDrainExtractor(link, quality, label) {
  try {
    const base = originOf(link) || "https://pixeldrain.dev";
    const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
    return [{ url: finalUrl, quality, title: `HDhub4u Pixeldrain ${label}`.trim() }];
  } catch (e) {
    return [];
  }
}
async function hubCdnExtractor(url) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    const scriptText = $("script:contains(var reurl)").first().html() || html;
    const m = scriptText.match(/reurl\s*=\s*"([^"]+)"/);
    if (!m)
      return [];
    const encodedUrl = m[1].split("?r=")[1];
    if (!encodedUrl)
      return [];
    const decoded = base64Decode(encodedUrl);
    const idx = decoded.lastIndexOf("link=");
    if (idx === -1)
      return [];
    const decodedUrl = decoded.substring(idx + 5);
    if (!decodedUrl)
      return [];
    return [{ url: decodedUrl, quality: "Unknown", title: "HDhub4u HUBCDN" }];
  } catch (e) {
    return [];
  }
}
async function hubcdnnExtractor(url) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const m = html.match(/r=([A-Za-z0-9+/=]+)/);
    if (!m)
      return [];
    const decoded = base64Decode(m[1]);
    const idx = decoded.lastIndexOf("link=");
    if (idx === -1)
      return [];
    const m3u8 = decoded.substring(idx + 5);
    if (!m3u8)
      return [];
    return [{ url: m3u8, quality: "Unknown", title: "HDhub4u Hubcdn", type: "m3u8" }];
  } catch (e) {
    return [];
  }
}
async function hubDriveExtractor(url) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    const href = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
    if (!href)
      return [];
    if (href.toLowerCase().includes("hubcloud"))
      return hubCloudExtractor(href, "HubDrive");
    return loadExtractor(href, "HubDrive");
  } catch (e) {
    return [];
  }
}
async function hubCloudExtractor(url, referer) {
  try {
    const ref = referer || "HubCloud";
    let currentUrl = url;
    if (currentUrl.includes("hubcloud.ink"))
      currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
    const baseUrl = originOf(currentUrl);
    if (!baseUrl)
      return [];
    let href;
    if (currentUrl.includes("hubcloud.php")) {
      href = currentUrl;
    } else {
      const html = await (await fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
      const $first = cheerio.load(html);
      const raw = $first("#download").attr("href") || "";
      if (!raw)
        return [];
      href = raw.toLowerCase().startsWith("http") ? raw : `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
    }
    if (!href.trim())
      return [];
    const pageHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
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
    const perButton = await Promise.all(buttons.map(async ({ link, label }) => {
      if (!link)
        return [];
      try {
        if (label.includes("fsl server")) {
          return [{ url: link, quality, title: `${ref} [FSL Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("download file")) {
          return [{ url: link, quality, title: `${ref} ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("buzzserver")) {
          const resp = await fetch(`${link}/download`, {
            headers: { ...HEADERS, Referer: link },
            redirect: "manual",
            skipSizeCheck: true
          });
          const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
          return dlink.trim() ? [{ url: dlink, quality, title: `${ref} [BuzzServer] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }] : [];
        } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server") || label.includes("pixeldrain")) {
          const base = originOf(link);
          const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
          return [{ url: finalUrl, quality, title: `${ref} Pixeldrain ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("s3 server")) {
          return [{ url: link, quality, title: `${ref} [S3 Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("fslv2")) {
          return [{ url: link, quality, title: `${ref} [FSLv2] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("mega server")) {
          return [{ url: link, quality, title: `${ref} [Mega Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        } else if (label.includes("10gbps")) {
          return [];
        } else {
          const nested = await loadExtractor(link, "");
          return nested.map((s) => ({ ...s, size: s.size || formatBytes(sizeInBytes) }));
        }
      } catch (e) {
        return [];
      }
    }));
    const streams = perButton.flat();
    return streams;
  } catch (e) {
    return [];
  }
}
async function hblinksExtractor(url, referer) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    const anchors = $("h3 a, h5 a, div.entry-content p a").toArray();
    const perAnchor = await Promise.all(anchors.map(async (el) => {
      let href = $(el).attr("href") || "";
      if (!href)
        return [];
      const lower = href.toLowerCase();
      try {
        if (lower.includes("hubdrive")) {
          return await hubDriveExtractor(href);
        } else if (lower.includes("hubcloud")) {
          return await hubCloudExtractor(href, "Hblinks");
        } else if (lower.includes("hubcdn")) {
          return await hubCdnExtractor(href);
        } else {
          return await loadExtractor(href, "Hblinks");
        }
      } catch (e) {
        return [];
      }
    }));
    return perAnchor.flat();
  } catch (e) {
    return [];
  }
}
async function vidStackExtractor(url) {
  try {
    const hash = url.split("#").pop().split("/").pop();
    const baseUrl = originOf(url);
    if (!baseUrl)
      return [];
    const encoded = (await (await fetch(`${baseUrl}/api/v1/video?id=${hash}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0" },
      skipSizeCheck: true,
      redirect: "follow"
    })).text()).trim();
    const key = CryptoJS.enc.Utf8.parse("kiemtienmua911ca");
    const ivList = ["1234567890oiuytr", "0123456789abcdef"];
    let decryptedText = null;
    for (const ivStr of ivList) {
      try {
        const iv = CryptoJS.enc.Utf8.parse(ivStr);
        const ciphertext = CryptoJS.enc.Hex.parse(encoded);
        const decrypted = CryptoJS.AES.decrypt(
          { ciphertext },
          key,
          { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (text) {
          decryptedText = text;
          break;
        }
      } catch (e) {
      }
    }
    if (!decryptedText)
      return [];
    const m3u8Match = decryptedText.match(/"source":"(.*?)"/);
    if (!m3u8Match)
      return [];
    const m3u8 = m3u8Match[1].replace(/\\\//g, "/").replace("https", "http");
    const subtitles = [];
    const subSection = decryptedText.match(/"subtitle":\{(.*?)\}/);
    if (subSection) {
      const subMatches = [...subSection[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
      for (const m of subMatches) {
        const lang = m[1];
        const path = m[2].replace(/\\\//g, "/").split("#")[0];
        if (path)
          subtitles.push({ lang, url: path.startsWith("http") ? path : baseUrl + path });
      }
    }
    return [{
      url: m3u8,
      quality: "Unknown",
      title: "HDhub4u Hubstream",
      subtitles,
      headers: { Referer: url, Origin: originOf(url) }
    }];
  } catch (e) {
    return [];
  }
}
async function loadExtractor(url, referer) {
  if (!url || !url.startsWith("http"))
    return [];
  const host = (originOf(url) || "").toLowerCase();
  try {
    if (host.includes("hubcdn")) {
      return host.includes("hubcdnn") ? await hubcdnnExtractor(url) : await hubCdnExtractor(url);
    }
    if (host.includes("hubdrive"))
      return await hubDriveExtractor(url);
    if (host.includes("hubcloud"))
      return await hubCloudExtractor(url, referer || "HubCloud");
    if (host.includes("hblinks"))
      return await hblinksExtractor(url, referer);
    if (host.includes("hubstream"))
      return await vidStackExtractor(url);
    if (host.includes("pixeldrain"))
      return await pixelDrainExtractor(url, "Unknown", "");
    if (host.includes("hdstream4u"))
      return [{ url, quality: "Unknown", title: "HDhub4u HdStream4u" }];
    return [{ url, quality: "Unknown", title: "HDhub4u" }];
  } catch (e) {
    return [];
  }
}
async function resolveAndExtract(link) {
  try {
    let finalLink = link;
    if (link.includes("?id=")) {
      finalLink = await getRedirectLinks(link);
    }
    if (!finalLink)
      return [];
    if (finalLink.toLowerCase().includes("hubdrive")) {
      return hubDriveExtractor(finalLink);
    }
    return loadExtractor(finalLink, "HDhub4u");
  } catch (e) {
    return [];
  }
}
async function resolveImdbToTmdb(imdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = await (await fetch(url, { skipSizeCheck: true, redirect: "follow" })).json();
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
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true, redirect: "follow" })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title)
      return [];
    const searchBase = await getSearchUrl();
    const searchUrl = `${searchBase}/collections/post/documents/search?q=${encodeURIComponent(title)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=1`;
    const searchJson = await (await fetch(searchUrl, { headers: SEARCH_HEADERS, skipSizeCheck: true, redirect: "follow" })).json();
    const hits = searchJson && searchJson.hits ? searchJson.hits : [];
    if (!hits.length)
      return [];
    const results = hits.map((h) => ({
      title: h.document.post_title,
      url: h.document.permalink,
      thumbnail: h.document.post_thumbnail
    }));
    const lcTitle = title.toLowerCase();
    const titleMatches = results.filter((r) => r.title.toLowerCase().includes(lcTitle));
    let match;
    if (mediaType === "tv" && season) {
      const seasonRegex = new RegExp(`Season\\s*0?${season}\\b|\\bS0?${season}\\b`, "i");
      match = (titleMatches.length ? titleMatches : results).find((r) => seasonRegex.test(r.title));
    }
    if (!match)
      match = titleMatches[0] || results[0];
    const matchPath = match.url.startsWith("http") ? match.url.replace(/^https?:\/\/[^/]+/, "") : match.url;
    const pageUrl = `${baseUrl}${matchPath.startsWith("/") ? "" : "/"}${matchPath}`;
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(pageHtml);
    const rawLinks = [];
    if (mediaType === "tv") {
      const episodeRegex = new RegExp(`Episode\\s*0?${episode}\\b`, "i");
      $("h5 a").each((i, el) => {
        const text = $(el).text();
        if (episodeRegex.test(text)) {
          const href = $(el).attr("href");
          if (href)
            rawLinks.push(href);
        }
      });
      if (!rawLinks.length) {
        const altRegex = /Episode\s*(\d+)/i;
        $("h5 a").each((i, el) => {
          const text = $(el).text();
          const m = text.match(altRegex);
          if (m && parseInt(m[1], 10) === parseInt(episode, 10)) {
            const href = $(el).attr("href");
            if (href)
              rawLinks.push(href);
          }
        });
      }
      if (!rawLinks.length) {
        const epNumRegex = new RegExp(`^E0*${episode}\\b`, "i");
        $("h4").each((i, el) => {
          const heading = $(el).text().trim();
          if (epNumRegex.test(heading)) {
            $(el).find("a").each((j, a) => {
              const href = $(a).attr("href");
              if (href)
                rawLinks.push(href);
            });
          }
        });
      }
    } else {
      $("h3 a, h4 a").each((i, el) => {
        const text = $(el).text();
        if (/480|720|1080|2160|4K/i.test(text)) {
          const href = $(el).attr("href");
          if (href)
            rawLinks.push(href);
        }
      });
      $(".page-body > div a").each((i, el) => {
        const href = $(el).attr("href") || "";
        if (/https:\/\/(.*\.)?(hdstream4u|hubstream)\..*/i.test(href))
          rawLinks.push(href);
      });
    }
    const uniqueLinks = [...new Set(rawLinks.filter(Boolean))];
    if (!uniqueLinks.length)
      return [];
    const perLink = await Promise.all(uniqueLinks.map((link) => resolveAndExtract(link)));
    const streams = perLink.flat();
    return streams.filter((s) => s && s.url).map((s) => ({
      url: s.url,
      quality: typeof s.quality === "number" ? qualityLabel(s.quality) : s.quality || "Unknown",
      title: s.title || "HDhub4u",
      name: s.title || "HDhub4u",
      headers: s.headers || { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
      subtitles: s.subtitles || [],
      size: s.size || ""
    })).filter((s) => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
