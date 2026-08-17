// fourkHDhub.js
// 4KHDHUB - High quality movie & series site (4khdhub.dad)
// Search: /?s={query}  Results in div.card-grid a
// Download links: div.download-item a[href] → redirect URLs → HubCloud extraction
// TV episodes: div.episodes-list div.season-item → div.episode-download-item → a[href]

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://4khdhub.one";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
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
  return d["4khdhub"] || FALLBACK_BASE_URL;
}

function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
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

async function resolveHubCloud(url) {
  try {
    // HubCloud: first get the #download link
    const html1 = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
    const $1 = cheerio.load(html1);
    let href = $1("#download").attr("href") || "";
    if (!href) return null;

    if (!href.startsWith("http")) {
      const base = url.match(/^(https?:\/\/[^/]+)/)?.[1] || "";
      href = base + "/" + href.replace(/^\//, "");
    }

    // Load the hubcloud page
    const html2 = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $2 = cheerio.load(html2);
    const header = $2("div.card-header").text() || "";
    const sizeText = $2("i#size").first().text() || "";
    const quality = extractQuality(header);
    const sizeInBytes = toBytes(sizeText);

    const buttons = $2("a.btn").toArray().map(a => ({
      link: $2(a).attr("href") || "",
      label: ($2(a).text() || "").toLowerCase().trim()
    }));

    const streams = [];
    for (const { link, label } of buttons) {
      if (!link) continue;
      try {
        if (label.includes("fsl server") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server")) {
          streams.push({ url: link, quality, title: `4KHDHUB [${label}]`, size: formatBytes(sizeInBytes )});
        } else if (label.includes("buzzserver")) {
          const resp = await fetch(`${link}/download`, {
            headers: { ...HEADERS, Referer: link },
            redirect: "manual",
            skipSizeCheck: true
          });
          const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
          if (dlink.trim()) streams.push({ url: dlink, quality, title: `4KHDHUB [BuzzServer]`, size: formatBytes(sizeInBytes )});
        } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server") || label.includes("pixeldrain")) {
          const base = originOf(link);
          const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
          streams.push({ url: finalUrl, quality, title: `4KHDHUB [Pixeldrain]`, size: formatBytes(sizeInBytes )});
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
          if (finalLink) streams.push({ url: finalLink, quality, title: `4KHDHUB [10Gbps]`, size: formatBytes(sizeInBytes )});
        } else if (link.match(/\.(mp4|mkv|m3u8)/i)) {
          streams.push({ url: link, quality, title: `4KHDHUB [${label}]`, size: formatBytes(sizeInBytes )});
        }
      } catch (e) {}
    }

    return streams.length ? streams : null;
  } catch (e) {
    return null;
  }
}

async function resolveRedirect(rawUrl) {
  // Many links have ?id= param that needs to be followed as a redirect
  try {
    if (!rawUrl.includes("id=")) return rawUrl;
    const resp = await fetch(rawUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    return resp.url || rawUrl;
  } catch (e) {
    return rawUrl;
  }
}

// Non-hubcloud mirrors (hubdrive.tips and similar) don't get the structured resolveHubCloud()
// treatment, so they never got a size at all. Do a best-effort generic scrape instead of nothing -
// most of these mirror pages still print a plain GB/MB figure somewhere even without hubcloud's
// specific i#size markup.
async function probeSize(url) {
  try {
    const html = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
    const m = html.match(/([\d.]+\s*(?:GB|MB))(?!\w)/i);
    return m ? formatBytes(toBytes(m[1])) : "";
  } catch (e) {
    return "";
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

    const baseUrl = await getBaseUrl();

    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.card-grid a").each((i, a) => {
      const href = $(a).attr("href");
      const t = $("h3", a).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;

    // 3. Load content page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    if (isTV) {
      // Find episodes by season/episode number in div.episodes-list
      let found = false;
      const episodeHrefs = [];
      $page("div.episodes-list div.season-item").each((i, seasonEl) => {
        if (found) return;
        const seasonText = $page("div.episode-number", seasonEl).text();
        const seasonMatch = seasonText.match(/S?([1-9][0-9]*)/);
        if (!seasonMatch || parseInt(seasonMatch[1]) !== season) return;

        $page("div.episode-download-item", seasonEl).each((j, epItem) => {
          if (found) return;
          const epText = $page("div.episode-file-info span.badge-psa", epItem).text();
          const epMatch = epText.match(/Episode-0*([1-9][0-9]*)/);
          if (!epMatch || parseInt(epMatch[1]) !== episode) return;

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
          const resolved = await resolveRedirect(href);

          if (resolved.toLowerCase().includes("hubcloud")) {
            const hubStreams = await resolveHubCloud(resolved);
            if (hubStreams) {
              for (const s of hubStreams) {
                streams.push({ ...s, title: `4KHDHUB [S${season}E${episode}] ${s.title || ""}`.trim(), subtitles: [] });
              }
            }
          } else {
            streams.push({
              url: resolved,
              quality: extractQuality(epText),
              title: `4KHDHUB [S${season}E${episode}]`,
              size: await probeSize(resolved),
              subtitles: []
            });
          }
        } catch (e) {}
      }
    } else {
      // Movie: get download items
      const hrefs = [];
      $page("div.download-item a").each((i, a) => {
        const href = $page(a).attr("href");
        if (href && href.startsWith("http")) hrefs.push(href);
      });

      for (const href of hrefs.slice(0, 5)) {
        try {
          const resolved = await resolveRedirect(href);

          if (resolved.toLowerCase().includes("hubcloud")) {
            const hubStreams = await resolveHubCloud(resolved);
            if (hubStreams) {
              for (const s of hubStreams) {
                streams.push({ ...s, subtitles: [] });
              }
            }
          } else {
            streams.push({
              url: resolved,
              quality: extractQuality(resolved),
              title: `4KHDHUB`,
              size: await probeSize(resolved),
              subtitles: []
            });
          }
        } catch (e) {}
      }
    }

    return streams.filter(s => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
