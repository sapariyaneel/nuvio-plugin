// moviesmod.js - Bollywood/Hollywood, same Driveseed/Driveleech + unblockedgames bypass as uhdmovies.js

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://moviesmod.zone";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

let cachedDomains = null;

async function getDomains() {
  if (cachedDomains) return cachedDomains;
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
  return d.moviesmod || FALLBACK_BASE_URL;
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
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${domain}${url}`;
  return `${domain}/${url}`;
}

function indexQuality(str) {
  const m = (str || "").match(/(\d{3,4})[pP]/);
  return m ? parseInt(m[1], 10) : 2160;
}

function qualityLabel(n) {
  if (n >= 2160) return "2160p";
  if (n >= 1440) return "1440p";
  if (n >= 1080) return "1080p";
  if (n >= 720) return "720p";
  if (n >= 480) return "480p";
  return "Unknown";
}

function toBytes(size) {
  const m = (size || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "GB") return v * 1024 ** 3;
  if (unit === "MB") return v * 1024 ** 2;
  return v * 1024;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function meetsMinSize(sizeStr) {
  const m = String(sizeStr || "").match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
  if (!m) return true;
  const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}

function cleanTitle(title) {
  const name = (title || "").replace(/\.[a-zA-Z0-9]{2,4}$/, "");
  const normalized = name
    .replace(/WEB[-_. ]?DL/gi, "WEB-DL")
    .replace(/WEB[-_. ]?RIP/gi, "WEBRIP")
    .replace(/H[ .]?265/gi, "H265")
    .replace(/H[ .]?264/gi, "H264")
    .replace(/DDP[ .]?([0-9]\.[0-9])/gi, "DDP$1");

  const sourceTags = new Set(["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"]);
  const codecTags = new Set(["H264", "H265", "X264", "X265", "HEVC", "AVC"]);
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const audioExtras = new Set(["ATMOS"]);
  const hdrTags = new Set(["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"]);

  const tags = [];
  const titleParts = [];
  for (const part of normalized.split(/[ _.]/)) {
    const p = part.toUpperCase();
    if (sourceTags.has(p) || codecTags.has(p)) {
      tags.push(p);
    } else if (audioTags.some(t => p.startsWith(t)) || audioExtras.has(p)) {
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

async function driveseedCFType1(url) {
  try {
    const html = await (await fetch(`${url}?type=1`, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    return $("a.btn-success").toArray().map(el => $(el).attr("href")).filter(h => h && h.startsWith("http"));
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
    if (!token || !id) return null;

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
    const extracted = resolvedUrl.split("url=")[1];
    return extracted && extracted.length ? decodeURIComponent(extracted) : null;
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
      const $ = cheerio.load(html);
      const scriptData = $("script").first().html() || "";
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
    if (fileName.length > 0) labelExtras += `[${fileName}]`;
    if (size.length > 0) labelExtras += `[${size}]`;

    const streams = [];
    const buttons = $("div.text-center > a").toArray();

    for (const el of buttons) {
      const href = $(el).attr("href");
      const text = $(el).text();
      if (!href) continue;

      try {
        if (text.toLowerCase().includes("instant download")) {
          const link = await driveseedInstantLink(href);
          if (link) streams.push({ url: link, quality: qualityLabel(quality), title: `${name} Instant(Download) (Use VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
        } else if (text.toLowerCase().includes("resume worker bot")) {
          const link = await driveseedResumeBot(href);
          if (link) streams.push({ url: link, quality: qualityLabel(quality), title: `${name} ResumeBot(VLC) ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
        } else if (text.toLowerCase().includes("direct links")) {
          const links = await driveseedCFType1(baseDomain + href);
          for (const l of links) streams.push({ url: l, quality: qualityLabel(quality), title: `${name} DirectLink ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
        } else if (text.toLowerCase().includes("resume cloud")) {
          const link = await driveseedResumeCloudLink(baseDomain, href);
          if (link) streams.push({ url: link, quality: qualityLabel(quality), title: `${name} ResumeCloud ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
        } else if (text.toLowerCase().includes("cloud download")) {
          streams.push({ url: href, quality: qualityLabel(quality), title: `${name} Cloud Download ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
        }
      } catch (e) {}
    }
    return streams;
  } catch (e) {
    return [];
  }
}

// unblockedgames bypass - forms need Content-Type+Referer or the WAF serves a decoy page
async function bypassHrefli(url) {
  try {
    const host = getOrigin(url);
    const formHeaders = { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" };

    const getForm = ($) => ({
      action: $("form#landing").attr("action") || "",
      data: (() => {
        const params = new URLSearchParams();
        $("form#landing input").each((i, el) => {
          params.append($(el).attr("name") || "", $(el).attr("value") || "");
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

    // regex the raw HTML, the decoy page template varies per request so the cheerio selector isn't reliable
    const cookieMatch = html4.match(/s_343\('([^']+)',\s*'([^']+)',\s*\d+\)/);
    if (!cookieMatch) return null;
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
    if (!driveUrl) return null;

    const finalText = await (await fetch(driveUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const afterReplace = finalText.split('replace("')[1];
    const path = afterReplace ? afterReplace.split('")')[0] : "";
    if (path === "/404") return null;

    return fixUrl(path, getOrigin(driveUrl));
  } catch (e) {
    return null;
  }
}

async function loadExtractor(link) {
  if (!link || !link.startsWith("http")) return [];
  const host = getOrigin(link).toLowerCase();
  try {
    if (host.includes("driveseed")) return driveseedGetUrl(link, null, "Driveseed");
    if (host.includes("driveleech")) return driveseedGetUrl(link, null, "Driveleech");
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
      if (!finalLink) return [];
    }
    return loadExtractor(finalLink);
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

async function resolveModproLink(modproUrl) {
  try {
    const html = await (await fetch(modproUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(html);
    const gdriveLink =
      $("a.maxbutton-fast-server-gdrive").attr("href") ||
      $("a.maxbutton-google-drive-server-2").attr("href") ||
      "";
    if (!gdriveLink) return [];
    return resolveSourceLink(gdriveLink);
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      tmdbId = await resolveImdbToTmdb(tmdbId, mediaType);
      if (!tmdbId) return [];
    }

    const baseUrl = await getBaseUrl();

    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true, redirect: "follow" })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("article.latestPost").each((i, el) => {
      const titleRaw = ($(el).find("h2.title a").text() || "").trim().replace(/^Download\s+/i, "");
      const href = fixUrl($(el).find("h2.title a").attr("href") || "", baseUrl);
      if (titleRaw && href) results.push({ title: titleRaw, url: href });
    });
    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle)) || results[0];

    const pageHtml = await (await fetch(match.url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" })).text();
    const $page = cheerio.load(pageHtml);

    const entryTitle = $page("h1, h2.title").first().text() || "";
    const isTvSeries = /Season/i.test(entryTitle) && !/S0/i.test(entryTitle);

    const modproLinks = [];
    $page("a.maxbutton").toArray().forEach(el => {
      const href = $page(el).attr("href") || "";
      if (/modpro\.blog/.test(href)) modproLinks.push(href);
    });
    const uniqueModproLinks = [...new Set(modproLinks)];
    if (!uniqueModproLinks.length) return [];

    void isTvSeries;
    void season;
    void episode;

    const streams = [];
    for (const link of uniqueModproLinks) {
      const extracted = await resolveModproLink(link);
      streams.push(...extracted);
    }

    return streams
      .filter(s => s && s.url)
      .map(s => ({
        url: s.url,
        quality: s.quality || "Unknown",
        title: s.title || "MoviesMod",
        name: s.title || "MoviesMod",
        headers: s.headers || { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
        subtitles: [],
        size: s.size || ""
      }))
      .filter(s => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
