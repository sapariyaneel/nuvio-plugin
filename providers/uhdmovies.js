/**
 * uhdmovies - Built from src/providers/uhdmovies.js
 * Generated: 2026-08-17T09:56:23.805Z
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
function getDomains() {
  return __async(this, null, function* () {
    if (cachedDomains)
      return cachedDomains;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true, redirect: "follow" });
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
    return d.UHDMovies || FALLBACK_BASE_URL;
  });
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
function uhdMoviesGetUrl(finallink, quality) {
  return __async(this, null, function* () {
    try {
      const token = finallink.split("https://video-seed.xyz/?url=")[1] || "";
      const resp = yield fetch("https://video-seed.xyz/api", {
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
      const text = yield resp.text();
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
  });
}
function driveseedCFType1(url) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(`${url}?type=1`, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
      const $ = cheerio.load(html);
      return $("a.btn-success").toArray().map((el) => $(el).attr("href")).filter((h) => h && h.startsWith("http"));
    } catch (e) {
      return [];
    }
  });
}
function driveseedResumeCloudLink(baseUrl, path) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(`${baseUrl}${path}`, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
      const $ = cheerio.load(html);
      const href = $("a.btn-success").attr("href");
      return href && href.startsWith("http") ? href : null;
    } catch (e) {
      return null;
    }
  });
}
function driveseedResumeBot(url) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      const html = yield resp.text();
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
      const dl = yield fetch(`${baseUrl}/download?id=${id}`, {
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
      const json = JSON.parse(yield dl.text());
      const finalUrl = json.url;
      return finalUrl && finalUrl.startsWith("http") ? finalUrl : null;
    } catch (e) {
      return null;
    }
  });
}
function driveseedInstantLink(finalLink) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(finalLink, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
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
  });
}
function driveseedGetUrl(url, referer, siteName) {
  return __async(this, null, function* () {
    try {
      const name = siteName || "Driveseed";
      let currentUrl = url;
      const baseDomain = getOrigin(currentUrl);
      if (currentUrl.includes("r?key=")) {
        const html = yield (yield fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
        const $2 = cheerio.load(html);
        const scriptData = $2("script").first().html() || "";
        const afterReplace = scriptData.split('replace("')[1];
        const path = afterReplace ? afterReplace.split('")')[0] : "";
        currentUrl = `${baseDomain}${path}`;
      }
      const pageHtml = yield (yield fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
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
      const streams = [];
      const buttons = $("div.text-center > a").toArray();
      for (const el of buttons) {
        const href = $(el).attr("href");
        const text = $(el).text();
        if (!href)
          continue;
        try {
          if (text.toLowerCase().includes("instant download")) {
            const link = yield driveseedInstantLink(href);
            if (link)
              streams.push({ url: link, quality: qualityLabel(quality), title: `${name} Instant(Download) (Use VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (text.toLowerCase().includes("resume worker bot")) {
            const link = yield driveseedResumeBot(href);
            if (link)
              streams.push({ url: link, quality: qualityLabel(quality), title: `${name} ResumeBot(VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (text.toLowerCase().includes("direct links")) {
            const links = yield driveseedCFType1(baseDomain + href);
            for (const l of links)
              streams.push({ url: l, quality: qualityLabel(quality), title: `${name} DirectLink ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (text.toLowerCase().includes("resume cloud")) {
            const link = yield driveseedResumeCloudLink(baseDomain, href);
            if (link)
              streams.push({ url: link, quality: qualityLabel(quality), title: `${name} ResumeCloud ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (text.toLowerCase().includes("cloud download")) {
            streams.push({ url: href, quality: qualityLabel(quality), title: `${name} Cloud Download ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
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
function bypassHrefli(url) {
  return __async(this, null, function* () {
    try {
      const host = getOrigin(url);
      const formHeaders = __spreadProps(__spreadValues({}, HEADERS), { "Content-Type": "application/x-www-form-urlencoded" });
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
      let res = yield fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      let $ = cheerio.load(yield res.text());
      let form = getForm($);
      res = yield fetch(form.action, { method: "POST", headers: __spreadProps(__spreadValues({}, formHeaders), { Referer: url }), body: form.data.toString(), skipSizeCheck: true, redirect: "follow" });
      $ = cheerio.load(yield res.text());
      form = getForm($);
      res = yield fetch(form.action, { method: "POST", headers: __spreadProps(__spreadValues({}, formHeaders), { Referer: url }), body: form.data.toString(), skipSizeCheck: true, redirect: "follow" });
      const html4 = yield res.text();
      const cookieMatch = html4.match(/s_343\('([^']+)',\s*'([^']+)',\s*\d+\)/);
      if (!cookieMatch)
        return null;
      const [, cookieName, cookieValue] = cookieMatch;
      const goResp = yield fetch(`${host}/?go=${cookieName}`, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Cookie: `${cookieName}=${encodeURIComponent(cookieValue)}`, Referer: form.action }),
        skipSizeCheck: true,
        redirect: "follow"
      });
      const goHtml = yield goResp.text();
      const $go = cheerio.load(goHtml);
      const metaRefresh = $go('meta[http-equiv="refresh"]').attr("content") || "";
      let driveUrl = metaRefresh.includes("url=") ? metaRefresh.split("url=")[1] : null;
      if (!driveUrl)
        return null;
      const finalText = yield (yield fetch(driveUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
      const afterReplace = finalText.split('replace("')[1];
      const path = afterReplace ? afterReplace.split('")')[0] : "";
      if (path === "/404")
        return null;
      return fixUrl(path, getOrigin(driveUrl));
    } catch (e) {
      return null;
    }
  });
}
function loadExtractor(link) {
  return __async(this, null, function* () {
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
  });
}
function resolveSourceLink(link) {
  return __async(this, null, function* () {
    try {
      let finalLink = link;
      if (link.includes("unblockedgames")) {
        finalLink = yield bypassHrefli(link);
        if (!finalLink)
          return [];
      }
      return loadExtractor(finalLink);
    } catch (e) {
      return [];
    }
  });
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
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetch(url, { skipSizeCheck: true, redirect: "follow" })).json();
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
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true, redirect: "follow" })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
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
      const pageHtml = yield (yield fetch(match.url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
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
      const resolvedGroups = yield Promise.all(uniqueLinks.map((link) => resolveSourceLink(link)));
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
        // s.size is already a formatted string from the extractor above - re-running it through
        // formatBytes() treats it as a raw byte count and produces NaN.
        size: s.size || ""
      })).filter((s) => meetsMinSize(s.size));
    } catch (e) {
      console.error("[UHDmovies]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
