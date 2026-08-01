// vegamovies.js
// Vegamovies (https://vegamovies.catering) - Hindi/English movie & series site, Typesense-backed search
// Search: GET /search.php?q={title}&page=1 -> Typesense hits {document:{id, imdb_id, permalink, category}}
// Content: GET /wp-json/wp/v2/posts/{id} (WP REST API - bypasses theme's client-side download-button gating)
// Links: nexdrive.fit shortlink pages -> G-Direct(fastdl.zip)/V-Cloud(vcloud.zip->hubcloud.foo) buttons -> HubCloud chain

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://vegamovies.catering";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

let cachedDomains = null;

async function getDomains() {
  if (cachedDomains) return cachedDomains;
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
  return d.vegamovies || FALLBACK_BASE_URL;
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
  if (n >= 2160) return "2160p";
  if (n >= 1440) return "1440p";
  if (n >= 1080) return "1080p";
  if (n >= 720) return "720p";
  if (n >= 480) return "480p";
  if (n >= 360) return "360p";
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

function cleanTitle(raw) {
  return (raw || "").split("(")[0].trim().replace(/\s+/g, " ");
}

async function getImdbId(tmdbId, mediaType) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
  const data = await (await fetch(url, { skipSizeCheck: true })).json();
  return data && data.imdb_id ? data.imdb_id : null;
}

async function getTmdbTitle(tmdbId, mediaType) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const data = await (await fetch(url, { skipSizeCheck: true })).json();
  return data.title || data.name || null;
}

async function searchSite(query) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=1`;
  const res = await fetch(url, { headers: HEADERS, skipSizeCheck: true });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.hits)) return [];
  return data.hits.map(h => h.document).filter(Boolean);
}

function pickCandidate(hits, imdbId, isTv, season) {
  let pool = imdbId ? hits.filter(h => h.imdb_id === imdbId) : hits;
  if (!pool.length) pool = hits;
  if (!pool.length) return null;

  if (isTv) {
    const targetSeason = season || 1;
    const seasonMatch = pool.find(h => {
      const m = (h.permalink || "").match(/season-(\d+)/i);
      return m && parseInt(m[1], 10) === targetSeason;
    });
    if (seasonMatch) return seasonMatch;
  }

  return pool[0];
}

async function getPostContent(id) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/wp-json/wp/v2/posts/${id}`;
  const res = await fetch(url, { headers: HEADERS, skipSizeCheck: true });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && data.content ? data.content.rendered : null;
}

function extractQualityBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $("h3, h5").each((i, el) => {
    const heading = $(el).text().trim();
    if (!heading) return;
    const links = [];
    let next = $(el).next();
    let hops = 0;
    while (next.length && hops < 3) {
      if (next.is("h3") || next.is("h5")) break;
      next.find("a[href]").each((j, a) => {
        const href = $(a).attr("href");
        const label = $(a).text().trim();
        if (href) links.push({ href, label });
      });
      if (links.length) break;
      next = next.next();
      hops++;
    }
    if (links.length) blocks.push({ heading, links });
  });

  return blocks;
}

async function resolveNexdrive(nexdriveUrl) {
  try {
    const html = await (await fetch(nexdriveUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(html);
    const links = [];
    $("a[href]").each((i, el) => {
      const href = $(el).attr("href") || "";
      const label = $(el).text().trim();
      if (/vcloud\.zip|fastdl\.zip|hubcloud|hubdrive/i.test(href)) {
        links.push({ href, label });
      }
    });
    return links;
  } catch (e) {
    return [];
  }
}

async function fastdlExtractor(url) {
  try {
    const u = new URL(url);
    const downloadParam = u.searchParams.get("download");
    if (!downloadParam) return [];
    const res = await fetch(url, { headers: HEADERS, redirect: "manual", skipSizeCheck: true });
    const loc = res.headers.get("location");
    if (loc) return [{ url: loc, quality: 0, title: "G-Direct" }];
    return [];
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
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  return output;
}

// vcloud.zip gates its real link behind a `var url = atob(atob('...'))` timer-reveal button
// rather than a real API call (confirmed directly in the site's own JS comments).
async function resolveVcloudToken(vcloudUrl) {
  try {
    const html = await (await fetch(vcloudUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const m = html.match(/atob\(atob\('([A-Za-z0-9+/=]+)'\)\)/);
    if (!m) return vcloudUrl;
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
    if (currentUrl.includes("hubcloud.ink")) currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");

    if (/vcloud\.zip/i.test(currentUrl)) {
      currentUrl = await resolveVcloudToken(currentUrl);
    }

    const baseUrl = originOf(currentUrl);
    if (!baseUrl) return [];

    let href;
    if (currentUrl.includes("hubcloud.php") || /vcloud\.zip/i.test(currentUrl)) {
      href = currentUrl;
    } else {
      const html = await (await fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $first = cheerio.load(html);
      const raw = $first("#download").attr("href") || "";
      if (!raw) return [];
      href = raw.toLowerCase().startsWith("http")
        ? raw
        : `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
    }
    if (!href.trim()) return [];

    const pageHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    const size = $("i#size").first().text() || "";
    const header = $("div.card-header").first().text() || "";
    const headerDetails = cleanTitle(header);
    const quality = indexQuality(header);
    const sizeInBytes = toBytes(size);

    let labelExtras = "";
    if (headerDetails.length > 0) labelExtras += `[${headerDetails}]`;
    if (size.length > 0) labelExtras += `[${size}]`;

    const buttons = $("a.btn").toArray().map(el => ({
      link: $(el).attr("href") || "",
      label: ($(el).text() || "").toLowerCase()
    }));

    const streams = [];
    for (const { link, label } of buttons) {
      if (!link) continue;
      try {
        if (label.includes("fsl server") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server")) {
          streams.push({ url: link, quality, title: `${ref} ${labelExtras}`.trim(), size: formatBytes(sizeInBytes )});
        } else if (label.includes("buzzserver")) {
          const resp = await fetch(`${link}/download`, {
            headers: { ...HEADERS, Referer: link },
            redirect: "manual",
            skipSizeCheck: true
          });
          const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
          if (dlink.trim()) streams.push({ url: dlink, quality, title: `${ref} [BuzzServer] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes )});
        } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server")) {
          const base = originOf(link);
          const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
          streams.push({ url: finalUrl, quality, title: `${ref} Pixeldrain ${labelExtras}`.trim(), size: formatBytes(sizeInBytes )});
        } else if (label.includes("10gbps")) {
          let redirectUrl = link;
          let finalLink = null;
          for (let i = 0; i < 5; i++) {
            const r = await fetch(redirectUrl, { redirect: "manual", skipSizeCheck: true });
            if (r.status >= 300 && r.status < 400) {
              const loc = r.headers.get("location");
              if (loc && loc.includes("link=")) { finalLink = loc.split("link=")[1]; break; }
              if (loc) redirectUrl = new URL(loc, redirectUrl).toString();
            } else break;
          }
          if (finalLink) streams.push({ url: finalLink, quality, title: `${ref} [10Gbps] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes )});
        }
      } catch (e) {}
    }
    return streams;
  } catch (e) {
    return [];
  }
}

async function resolveMirrorLink(href, label) {
  try {
    if (/fastdl\.zip/i.test(href)) return fastdlExtractor(href);
    if (/vcloud\.zip|hubcloud|hubdrive/i.test(href)) return hubCloudExtractor(href, "V-Cloud");
    return [];
  } catch (e) {
    return [];
  }
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
      if (!tmdbId) return [];
    }

    const isTv = mediaType === "tv";
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

    const content = await getPostContent(candidate.id);
    if (!content) {
      return [];
    }

    const blocks = extractQualityBlocks(content);
    if (!blocks.length) {
      return [];
    }

    const streams = [];
    for (const block of blocks) {
      const quality = indexQuality(block.heading);
      for (const link of block.links) {
        const nexdriveLinks = await resolveNexdrive(link.href);
        for (const mirror of nexdriveLinks) {
          const resolved = await resolveMirrorLink(mirror.href, mirror.label);
          for (const s of resolved) {
            streams.push({
              url: s.url,
              quality: qualityLabel(s.quality || quality),
              title: `Vegamovies ${block.heading}`.trim(),
              name: s.title || "Vegamovies",
              subtitles: [],
              // s.size is already a formatted string from the extractor above - re-running it
              // through formatBytes() treats it as a raw byte count and produces NaN.
              size: s.size || ""
            });
          }
        }
      }
    }

    return streams;
  } catch (e) {
    console.error("[Vegamovies]", e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
