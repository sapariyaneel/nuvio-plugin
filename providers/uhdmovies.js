/**
 * uhdmovies - Built from src/providers/uhdmovies.js
 * Generated: 2026-08-21T09:28:32.229Z
 */

// src/providers/uhdmovies.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://uhdmovies.autos";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
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
  return d.UHDMovies || FALLBACK_BASE_URL;
}
function getOrigin(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch (e) {
    return "";
  }
}
function fixUrl(url, domain) {
  if (!url)
    return "";
  if (url.startsWith("http"))
    return url;
  if (url.startsWith("//"))
    return `https:${url}`;
  if (url.startsWith("/"))
    return `${domain}${url}`;
  return `${domain}/${url}`;
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
function cleanTitle(title) {
  const name = (title || "").replace(/\.[a-zA-Z0-9]{2,4}$/, "");
  const normalized = name.replace(/WEB[-_. ]?DL/gi, "WEB-DL").replace(/WEB[-_. ]?RIP/gi, "WEBRIP").replace(/H[ .]?265/gi, "H265").replace(/H[ .]?264/gi, "H264").replace(/DDP[ .]?([0-9]\.[0-9])/gi, "DDP$1");
  const sourceTags = /* @__PURE__ */ new Set(["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"]);
  const codecTags = /* @__PURE__ */ new Set(["H264", "H265", "X264", "X265", "HEVC", "AVC"]);
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const audioExtras = /* @__PURE__ */ new Set(["ATMOS"]);
  const hdrTags = /* @__PURE__ */ new Set(["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"]);
  const tags = [];
  const titleParts = [];
  for (const part of normalized.split(/[ _.]/)) {
    const p = part.toUpperCase();
    if (sourceTags.has(p) || codecTags.has(p)) {
      tags.push(p);
    } else if (audioTags.some((t) => p.startsWith(t)) || audioExtras.has(p)) {
      tags.push(p);
    } else if (hdrTags.has(p)) {
      tags.push(p === "DV" || p === "DOLBYVISION" ? "DOLBYVISION" : p);
    } else if (p === "NF" || p === "CR") {
      tags.push(p);
    } else {
      titleParts.push(part);
    }
  }
  const cleanTitleStr = titleParts.join(" ").replace(/\s+/g, " ").trim();
  const cleanTags = [...new Set(tags)].join(" ");
  return [cleanTitleStr, cleanTags].filter(Boolean).join(" ");
}
function removeLeadingIndex(title) {
  return (title || "").replace(/^[[(]?\s*\d+\s*[\])\-_.]*\s*/, "");
}
async function uhdMoviesGetUrl(finallink, quality) {
  try {
    const token = finallink.split("https://video-seed.xyz/?url=")[1] || "";
    const resp = await fetch("https://video-seed.xyz/api", {
      method: "POST",
      headers: {
        "x-token": "video-seed.xyz",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: finallink
      },
      body: new URLSearchParams({ keys: token }).toString(),
      skipSizeCheck: true,
      redirect: "follow"
    });
    const text = await resp.text();
    const afterUrl = text.split('url":"')[1];
    if (!afterUrl)
      return [];
    const finalLink = afterUrl.split('","name')[0].replace(/\\\//g, "/");
    if (!finalLink)
      return [];
    return [{ url: finalLink, quality: qualityLabel(indexQuality(quality)), title: `UHDMovies ${quality || ""}`.trim() }];
  } catch (e) {
    return [];
  }
}
async function driveseedCFType1(url) {
  try {
    const html = await (await fetch(`${url}?type=1`, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    return $("a.btn-success").toArray().map((el) => $(el).attr("href")).filter((h) => h && h.startsWith("http"));
  } catch (e) {
    return [];
  }
}
async function driveseedResumeCloudLink(baseUrl, path) {
  try {
    const html = await (await fetch(`${baseUrl}${path}`, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    const href = $("a.btn-success").attr("href");
    return href && href.startsWith("http") ? href : null;
  } catch (e) {
    return null;
  }
}
async function driveseedResumeBot(url) {
  try {
    const resp = await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    const html = await resp.text();
    const cookieHeader = resp.headers.get("set-cookie") || "";
    const ssidMatch = cookieHeader.match(/PHPSESSID=([^;]+)/);
    const ssid = ssidMatch ? ssidMatch[1] : "";
    const tokenMatch = html.match(/formData\.append\('token', '([a-f0-9]+)'\)/);
    const token = tokenMatch ? tokenMatch[1] : "";
    const idMatch = html.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/);
    const id = idMatch ? idMatch[1] : "";
    if (!token || !id)
      return null;
    const baseUrl = url.split("/download")[0];
    const body = new URLSearchParams({ token }).toString();
    const dl = await fetch(`${baseUrl}/download?id=${id}`, {
      method: "POST",
      headers: {
        Accept: "*/*",
        Origin: baseUrl,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: ssid ? `PHPSESSID=${ssid}` : ""
      },
      body,
      skipSizeCheck: true,
      redirect: "follow"
    });
    const json = JSON.parse(await dl.text());
    const finalUrl = json.url;
    return finalUrl && finalUrl.startsWith("http") ? finalUrl : null;
  } catch (e) {
    return null;
  }
}
async function driveseedInstantLink(finalLink) {
  try {
    const resp = await fetch(finalLink, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    const resolvedUrl = resp.url || finalLink;
    if (resolvedUrl === finalLink)
      return null;
    const extracted = resolvedUrl.split("url=")[1];
    if (!extracted)
      return null;
    const decoded = decodeURIComponent(extracted);
    return decoded.startsWith("http") ? decoded : null;
  } catch (e) {
    return null;
  }
}
async function driveseedGetUrl(url, referer, siteName) {
  try {
    const name = siteName || "Driveseed";
    let currentUrl = url;
    const baseDomain = getOrigin(currentUrl);
    if (currentUrl.includes("r?key=")) {
      const html = await (await fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
      const $2 = cheerio.load(html);
      const scriptData = $2("script").first().html() || "";
      const afterReplace = scriptData.split('replace("')[1];
      const path = afterReplace ? afterReplace.split('")')[0] : "";
      currentUrl = `${baseDomain}${path}`;
    }
    const pageHtml = await (await fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(pageHtml);
    const rawFileName = ($("li.list-group-item").first().text() || "").replace("Name : ", "").trim();
    const fileName = cleanTitle(removeLeadingIndex(rawFileName));
    const size = ($("li:nth-child(3)").first().text() || "").replace("Size : ", "").trim();
    const quality = indexQuality(rawFileName);
    const sizeInBytes = toBytes(size);
    let labelExtras = "";
    if (fileName.length > 0)
      labelExtras += `[${fileName}]`;
    if (size.length > 0)
      labelExtras += `[${size}]`;
    const buttons = $("div.text-center > a").toArray();
    const perButton = await Promise.all(buttons.map(async (el) => {
      const href = $(el).attr("href");
      const text = $(el).text();
      if (!href)
        return [];
      try {
        if (text.toLowerCase().includes("instant download")) {
          const link = await driveseedInstantLink(href);
          return link ? [{ url: link, quality: qualityLabel(quality), title: `${name} Instant(Download) (Use VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }] : [];
        } else if (text.toLowerCase().includes("resume worker bot")) {
          const link = await driveseedResumeBot(href);
          return link ? [{ url: link, quality: qualityLabel(quality), title: `${name} ResumeBot(VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }] : [];
        } else if (text.toLowerCase().includes("direct links")) {
          const links = await driveseedCFType1(baseDomain + href);
          return links.map((l) => ({ url: l, quality: qualityLabel(quality), title: `${name} DirectLink ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }));
        } else if (text.toLowerCase().includes("resume cloud")) {
          const link = await driveseedResumeCloudLink(baseDomain, href);
          return link ? [{ url: link, quality: qualityLabel(quality), title: `${name} ResumeCloud ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }] : [];
        } else if (text.toLowerCase().includes("cloud download")) {
          return [{ url: href, quality: qualityLabel(quality), title: `${name} Cloud Download ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) }];
        }
        return [];
      } catch (e) {
        return [];
      }
    }));
    return perButton.flat();
  } catch (e) {
    return [];
  }
}
async function bypassHrefli(url) {
  try {
    const host = getOrigin(url);
    const formHeaders = { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" };
    const getForm = ($2) => ({
      action: $2("form#landing").attr("action") || "",
      data: (() => {
        const params = new URLSearchParams();
        $2("form#landing input").each((i, el) => {
          params.append($2(el).attr("name") || "", $2(el).attr("value") || "");
        });
        return params;
      })()
    });
    let res = await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    let $ = cheerio.load(await res.text());
    let form = getForm($);
    res = await fetch(form.action, { method: "POST", headers: { ...formHeaders, Referer: url }, body: form.data.toString(), skipSizeCheck: true, redirect: "follow" });
    $ = cheerio.load(await res.text());
    form = getForm($);
    res = await fetch(form.action, { method: "POST", headers: { ...formHeaders, Referer: url }, body: form.data.toString(), skipSizeCheck: true, redirect: "follow" });
    const html4 = await res.text();
    const cookieMatch = html4.match(/s_343\('([^']+)',\s*'([^']+)',\s*\d+\)/);
    if (!cookieMatch)
      return null;
    const [, cookieName, cookieValue] = cookieMatch;
    const goResp = await fetch(`${host}/?go=${cookieName}`, {
      headers: { ...HEADERS, Cookie: `${cookieName}=${encodeURIComponent(cookieValue)}`, Referer: form.action },
      skipSizeCheck: true,
      redirect: "follow"
    });
    const goHtml = await goResp.text();
    const $go = cheerio.load(goHtml);
    const metaRefresh = $go('meta[http-equiv="refresh"]').attr("content") || "";
    let driveUrl = metaRefresh.includes("url=") ? metaRefresh.split("url=")[1] : null;
    if (!driveUrl)
      return null;
    const finalText = await (await fetch(driveUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const afterReplace = finalText.split('replace("')[1];
    const path = afterReplace ? afterReplace.split('")')[0] : "";
    if (path === "/404")
      return null;
    return fixUrl(path, getOrigin(driveUrl));
  } catch (e) {
    return null;
  }
}
async function loadExtractor(link) {
  if (!link || !link.startsWith("http"))
    return [];
  const host = getOrigin(link).toLowerCase();
  try {
    if (host.includes("driveseed"))
      return driveseedGetUrl(link, null, "Driveseed");
    if (host.includes("driveleech"))
      return driveseedGetUrl(link, null, "Driveleech");
    if (host.includes("video-seed.xyz"))
      return uhdMoviesGetUrl(link, "");
    return [];
  } catch (e) {
    return [];
  }
}
async function resolveSourceLink(link) {
  try {
    let finalLink = link;
    if (link.includes("unblockedgames")) {
      finalLink = await bypassHrefli(link);
      if (!finalLink)
        return [];
    }
    return loadExtractor(finalLink);
  } catch (e) {
    return [];
  }
}
function extractSeasonEpisodeLinks(html, wantedSeason, wantedEpisode) {
  const seasonMarkerRe = /Season\s*0?(\d{1,3})\b|\bS0?(\d{1,3})(?=[.\s]|$)/gi;
  const markers = [];
  let m;
  while ((m = seasonMarkerRe.exec(html)) !== null) {
    const num = parseInt(m[1] || m[2], 10);
    if (num)
      markers.push({ index: m.index, season: num });
  }
  const regions = [];
  let regionStart = 0;
  let regionSeason = 1;
  for (const marker of markers) {
    if (marker.season !== regionSeason) {
      regions.push({ season: regionSeason, html: html.slice(regionStart, marker.index) });
      regionStart = marker.index;
      regionSeason = marker.season;
    }
  }
  regions.push({ season: regionSeason, html: html.slice(regionStart) });
  const wanted = regions.filter((r) => r.season === wantedSeason);
  if (!wanted.length)
    return [];
  const episodeAnchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links = [];
  for (const region of wanted) {
    let am;
    episodeAnchorRe.lastIndex = 0;
    while ((am = episodeAnchorRe.exec(region.html)) !== null) {
      const href = am[1];
      const label = am[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (!/episode/i.test(label) || /zip/i.test(label))
        continue;
      const epMatch = label.match(/episode\s*(\d+)/i);
      if (epMatch && parseInt(epMatch[1], 10) === wantedEpisode)
        links.push(href);
    }
  }
  return links;
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
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(searchHtml);
    const results = [];
    $("article.gridlove-post").each((i, el) => {
      let titleRaw = ($(el).find("h1.sanket").text() || "").trim().replace(/^Download\s+/i, "");
      const m = titleRaw.match(/(^.*\)\d*)/);
      if (m)
        titleRaw = m[1];
      const href = fixUrl($(el).find("div.entry-image > a").attr("href") || "", baseUrl);
      if (titleRaw && href)
        results.push({ title: titleRaw, url: href });
    });
    if (!results.length)
      return [];
    const lcTitle = title.toLowerCase();
    const titleMatches = results.filter((r) => r.title.toLowerCase().includes(lcTitle));
    let match;
    if (mediaType === "tv" && season) {
      const seasonRegex = new RegExp(`Season\\s*0?${season}\\b|\\bS0?${season}\\b`, "i");
      const seasonMatches = (titleMatches.length ? titleMatches : results).filter((r) => seasonRegex.test(r.title));
      if (seasonMatches.length) {
        match = seasonMatches.reduce(
          (best, r) => r.title.length < best.title.length ? r : best
        );
      }
    }
    if (!match)
      match = titleMatches[0] || results[0];
    const pageHtml = await (await fetch(match.url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $page = cheerio.load(pageHtml);
    const sourceLinks = [];
    if (mediaType === "tv") {
      const found = extractSeasonEpisodeLinks(pageHtml, parseInt(season, 10), parseInt(episode, 10));
      for (const href of found)
        sourceLinks.push(href);
    } else {
      $page("div.entry-content > p").each((i, el) => {
        const node = $page(el);
        if (!/\[.*\]/.test(node.text()))
          return;
        const next = node.next();
        const href = next.find("a.maxbutton-1").attr("href");
        if (href)
          sourceLinks.push(href);
      });
    }
    const uniqueLinks = [...new Set(sourceLinks.filter(Boolean))];
    if (!uniqueLinks.length)
      return [];
    const resolvedGroups = await Promise.all(uniqueLinks.map((link) => resolveSourceLink(link)));
    const streams = [];
    for (const group of resolvedGroups)
      streams.push(...group);
    return streams.filter((s) => s && s.url).map((s) => ({
      url: s.url,
      quality: s.quality || "Unknown",
      title: s.title || "UHDmovies",
      name: s.title || "UHDmovies",
      headers: s.headers || { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
      subtitles: [],
      // s.size is already formatted, don't re-run through formatBytes
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
