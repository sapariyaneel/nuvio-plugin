const cheerio = require('cheerio-without-node-native');

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

let MAIN_URL = "https://new2.moviesdrive.christmas";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
let domainCacheTimestamp = 0;
let cachedRegistry = null;

function getRegistry() {
    if (cachedRegistry) return Promise.resolve(cachedRegistry);
    return fetch(DOMAINS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.json())
        .then(d => {
            cachedRegistry = d || {};
            return cachedRegistry;
        })
        .catch(() => {
            cachedRegistry = {};
            return cachedRegistry;
        });
}

function getHubcloudDomain() {
    return getRegistry().then(d => d.hubcloud || "https://hubcloud.cx");
}

function getGdflixDomain() {
    return getRegistry().then(d => d.gdflix || "https://new6.gdflix.dad");
}

function getDrivebotDomain() {
    return getRegistry().then(d => d.drivebot || "https://drivebot.sbs");
}

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    "Referer": `${MAIN_URL}/`,
};

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function meetsMinSize(sizeStr) {
    const m = String(sizeStr || '').match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
    if (!m) return true;
    const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
    return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}

function extractServerName(source) {
    if (!source) return 'Unknown';

    const src = source.trim();

    if (/HubCloud/i.test(src)) {
        if (/FSL/i.test(src)) return 'HubCloud FSL Server';
        if (/FSL V2/i.test(src)) return 'HubCloud FSL V2 Server';
        if (/S3/i.test(src)) return 'HubCloud S3 Server';
        if (/Buzz/i.test(src)) return 'HubCloud BuzzServer';
        if (/10\s*Gbps/i.test(src)) return 'HubCloud 10Gbps';
        return 'HubCloud';
    }

    if (/Pixeldrain/i.test(src)) return 'Pixeldrain';
    if (/StreamTape/i.test(src)) return 'StreamTape';
    if (/HubCdn/i.test(src)) return 'HubCdn';
    if (/HbLinks/i.test(src)) return 'HbLinks';
    if (/Hubstream/i.test(src)) return 'Hubstream';

    return src.replace(/^www\./i, '').split(/[.\s]/)[0];
}

function rot13(value) {
    return value.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function atob(value) {
    if (!value) return '';
    let input = String(value).replace(/=+$/, '');
    let output = '';
    let bc = 0, bs, buffer, idx = 0;
    while ((buffer = input.charAt(idx++))) {
        buffer = BASE64_CHARS.indexOf(buffer);
        if (~buffer) {
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
        }
    }
    return output;
}

function btoa(value) {
    if (value == null) return '';
    let str = String(value);
    let output = '';
    let i = 0;
    while (i < str.length) {
        const chr1 = str.charCodeAt(i++);
        const chr2 = str.charCodeAt(i++);
        const chr3 = str.charCodeAt(i++);

        const enc1 = chr1 >> 2;
        const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        let enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = 64;
            enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }

        output +=
            BASE64_CHARS.charAt(enc1) +
            BASE64_CHARS.charAt(enc2) +
            BASE64_CHARS.charAt(enc3) +
            BASE64_CHARS.charAt(enc4);
    }
    return output;
}

function cleanTitle(title) {
    const parts = title.split(/[.\-_]/);

    const qualityTags = [
        "WEBRip", "WEB-DL", "WEB", "BluRay", "HDRip", "DVDRip", "HDTV",
        "CAM", "TS", "R5", "DVDScr", "BRRip", "BDRip", "DVD", "PDTV", "HD"
    ];

    const audioTags = [
        "AAC", "AC3", "DTS", "MP3", "FLAC", "DD5", "EAC3", "Atmos"
    ];

    const subTags = [
        "ESub", "ESubs", "Subs", "MultiSub", "NoSub", "EnglishSub", "HindiSub"
    ];

    const codecTags = [
        "x264", "x265", "H264", "HEVC", "AVC"
    ];

    const startIndex = parts.findIndex(part =>
        qualityTags.some(tag => part.toLowerCase().includes(tag.toLowerCase()))
    );

    const endIndex = parts.findLastIndex(part =>
        subTags.some(tag => part.toLowerCase().includes(tag.toLowerCase())) ||
        audioTags.some(tag => part.toLowerCase().includes(tag.toLowerCase())) ||
        codecTags.some(tag => part.toLowerCase().includes(tag.toLowerCase()))
    );

    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        return parts.slice(startIndex, endIndex + 1).join(".");
    } else if (startIndex !== -1) {
        return parts.slice(startIndex).join(".");
    } else {
        return parts.slice(-3).join(".");
    }
}

function fetchAndUpdateDomain() {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) {
        return Promise.resolve();
    }

    return fetch(DOMAINS_URL, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }).then(function (response) {
        if (response.ok) {
            return response.json().then(function (data) {
                if (data && data.moviesdrive && data.moviesdrive !== MAIN_URL) {
                    const newDomain = data.moviesdrive;
                    // probe before switching, registry entry can be stale
                    return fetch(newDomain, { method: 'HEAD', headers: HEADERS }).then(function (probe) {
                        if (probe.ok || (probe.status >= 300 && probe.status < 500)) {
                            MAIN_URL = newDomain;
                            HEADERS.Referer = `${MAIN_URL}/`;
                        }
                        domainCacheTimestamp = now;
                    }).catch(function () {
                        domainCacheTimestamp = now;
                    });
                }
                domainCacheTimestamp = now;
            });
        }
    }).catch(function (error) {
    });
}

function getCurrentDomain() {
    return fetchAndUpdateDomain().then(function () {
        return MAIN_URL;
    });
}

function pixelDrainExtractor(link) {
    return Promise.resolve().then(() => {
        let fileId;
        const match = link.match(/(?:file|u)\/([A-Za-z0-9]+)/);
        if (match) {
            fileId = match[1];
        } else {
            fileId = link.split('/').pop();
        }
        if (!fileId) {
            return [{ source: 'Pixeldrain', quality: 'Unknown', url: link }];
        }

        const infoUrl = `https://pixeldrain.com/api/file/${fileId}/info`;
        let fileInfo = { name: '', quality: 'Unknown', size: 0 };

        return fetch(infoUrl, { headers: HEADERS })
            .then(response => response.json())
            .then(info => {
                if (info && info.name) {
                    fileInfo.name = info.name;
                    fileInfo.size = info.size || 0;

                    const qualityMatch = info.name.match(/(\d{3,4})p/);
                    if (qualityMatch) {
                        fileInfo.quality = qualityMatch[0];
                    }
                }
                const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
                return [{
                    source: 'Pixeldrain',
                    quality: fileInfo.quality,
                    url: directUrl,
                    name: fileInfo.name,
                    size: formatBytes(fileInfo.size),
                }];
            })
            .catch(e => {
                const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
                return [{
                    source: 'Pixeldrain',
                    quality: fileInfo.quality,
                    url: directUrl,
                    name: fileInfo.name,
                    size: formatBytes(fileInfo.size),
                }];
            });
    }).catch(e => {
        return [{ source: 'Pixeldrain', quality: 'Unknown', url: link }];
    });
}

function streamTapeExtractor(link) {
    const url = new URL(link);
    url.hostname = 'streamtape.com';
    const normalizedLink = url.toString();

    return fetch(normalizedLink, { headers: HEADERS })
        .then(res => res.text())
        .then(data => {
            const match = data.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/);

            if (match && match[1]) {
                const scriptContent = match[1];
                const urlPartMatch = scriptContent.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);

                if (urlPartMatch && urlPartMatch[1]) {
                    const videoSrc = 'https:' + urlPartMatch[1];
                    return [{ source: 'StreamTape', quality: 'Stream', url: videoSrc }];
                }
            }

            const simpleMatch = data.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
            if (simpleMatch && simpleMatch[0]) {
                const videoSrc = 'https:' + simpleMatch[0].slice(1, -1);
                return [{ source: 'StreamTape', quality: 'Stream', url: videoSrc }];
            }

            return [];
        })
        .catch(e => {
            return [];
        });
}

function hubStreamExtractor(url, referer) {
    return fetch(url, { headers: { ...HEADERS, Referer: referer } })
        .then(response => {
            return [{ source: 'Hubstream', quality: 'Unknown', url }];
        })
        .catch(e => {
            return [];
        });
}

function hbLinksExtractor(url, referer) {
    return fetch(url, { headers: { ...HEADERS, Referer: referer } })
        .then(response => response.text())
        .then(data => {
            const $ = cheerio.load(data);
            const links = $('h3 a, div.entry-content p a').map((i, el) => $(el).attr('href')).get();

            const finalLinks = [];
            const promises = links.map(link => loadExtractor(link, url));

            return Promise.all(promises)
                .then(results => {
                    results.forEach(extracted => finalLinks.push(...extracted));
                    return finalLinks;
                });
        });
}

function hubCdnExtractor(url, referer) {
    return fetch(url, { headers: { ...HEADERS, Referer: referer } })
        .then(response => response.text())
        .then(data => {
            const encodedMatch = data.match(/r=([A-Za-z0-9+/=]+)/);
            if (encodedMatch && encodedMatch[1]) {
                const m3u8Data = atob(encodedMatch[1]);
                const m3u8Link = m3u8Data.substring(m3u8Data.lastIndexOf('link=') + 5);
                return [{
                    source: 'HubCdn',
                    quality: 'M3U8',
                    url: m3u8Link,
                }];
            }
            return [];
        })
        .catch(() => []);
}

function hubDriveExtractor(url, referer) {
    return fetch(url, { headers: { ...HEADERS, Referer: referer } })
        .then(response => response.text())
        .then(data => {
            const $ = cheerio.load(data);
            const href = $('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href');
            if (href) {
                return loadExtractor(href, url);
            }
            return [];
        })
        .catch(() => []);
}


// search-recover.php isn't the real file page, hit ?api=search to get the actual hubcloud /drive/ url
function resolveHubcloudSearchRecover(url) {
    try {
        const u = new URL(url);
        const rawQ = u.searchParams.get("q") || "";
        const fromAc = u.searchParams.get("from_ac") || "";
        if (!rawQ || !fromAc) return Promise.resolve(null);

        // q param is base64 of the plain search text
        let q = rawQ;
        try {
            const padded = rawQ + "=".repeat((4 - (rawQ.length % 4)) % 4);
            const decoded = atob(padded);
            if (decoded && /^[\x20-\x7E]+$/.test(decoded)) q = decoded;
        } catch (e) {}

        const apiUrl = `${u.origin}${u.pathname}?api=search&q=${encodeURIComponent(q)}&page=1&from_ac=${encodeURIComponent(fromAc)}`;
        return fetch(apiUrl, { headers: { ...HEADERS, Accept: "application/json" } })
            .then(r => r.json())
            .then(data => (data && Array.isArray(data.hits) && data.hits[0] && data.hits[0].url) || null)
            .catch(() => null);
    } catch (e) {
        return Promise.resolve(null);
    }
}

function hubCloudExtractor(url, referer, skipDomainSwap) {
    let currentUrl = url;

    if (!skipDomainSwap) {
        return getHubcloudDomain().then(liveDomain => {
            try {
                const u = new URL(currentUrl);
                if (u.hostname.includes("hubcloud")) {
                    const live = new URL(liveDomain);
                    if (u.hostname !== live.hostname) {
                        u.protocol = live.protocol;
                        u.host = live.host;
                        currentUrl = u.toString();
                    }
                }
            } catch (e) {}
            return hubCloudExtractor(currentUrl, referer, true);
        });
    }

    if (currentUrl.includes("search-recover.php")) {
        return resolveHubcloudSearchRecover(currentUrl).then(resolvedUrl => {
            if (!resolvedUrl) return [];
            return hubCloudExtractor(resolvedUrl, referer);
        });
    }

    if (/\/(video|drive)\//i.test(currentUrl)) {
        return fetch(currentUrl, {
            headers: { ...HEADERS, Referer: referer }
        })
            .then(r => r.text())
            .then(html => {
                const $ = cheerio.load(html);

                const hubPhp = $('a[href*="hubcloud.php"]').attr('href');
                if (!hubPhp) return [];

                return hubCloudExtractor(hubPhp, currentUrl, true);
            })
            .catch(() => []);
    }


    const initialFetch = currentUrl.includes("hubcloud.php")
        ? fetch(currentUrl, {
            headers: { ...HEADERS, Referer: referer },
            redirect: "follow"
        }).then(response =>
            response.text().then(html => ({
                pageData: html,
                finalUrl: response.url || currentUrl
            }))
        )
        : fetch(currentUrl, {
            headers: { ...HEADERS, Referer: referer }
        })
            .then(r => r.text())
            .then(pageData => {
                let finalUrl = currentUrl;
                const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
                if (scriptUrlMatch && scriptUrlMatch[1]) {
                    finalUrl = scriptUrlMatch[1];
                    return fetch(finalUrl, {
                        headers: { ...HEADERS, Referer: currentUrl }
                    })
                        .then(r => r.text())
                        .then(secondData => ({
                            pageData: secondData,
                            finalUrl
                        }));
                }
                return { pageData, finalUrl };
            });

    return initialFetch
        .then(({ pageData, finalUrl }) => {
            const $ = cheerio.load(pageData);

            const size = $('i#size').text().trim();
            const header = $('div.card-header').text().trim();

            const getIndexQuality = (str) => {
                const match = (str || '').match(/(\d{3,4})[pP]/);
                return match ? parseInt(match[1]) : 2160;
            };

            const quality = getIndexQuality(header);
            const headerDetails = cleanTitle(header);

            const labelExtras = (() => {
                let extras = '';
                if (headerDetails) extras += `[${headerDetails}]`;
                if (size) extras += `[${size}]`;
                return extras;
            })();

            const sizeInBytes = (() => {
                if (!size) return 0;
                const m = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
                if (!m) return 0;
                const v = parseFloat(m[1]);
                if (m[2].toUpperCase() === 'GB') return v * 1024 ** 3;
                if (m[2].toUpperCase() === 'MB') return v * 1024 ** 2;
                if (m[2].toUpperCase() === 'KB') return v * 1024;
                return 0;
            })();

            const links = [];
            const elements = $('a.btn[href]').get();

            const processElements = elements.map(el => {
                const link = $(el).attr('href');
                const text = $(el).text();

                if (/telegram/i.test(text) || /telegram/i.test(link)) {
                    return Promise.resolve();
                }

                const fileName = header || headerDetails || 'Unknown';

                if (text.includes("Download File")) {
                    links.push({
                        source: `HubCloud ${labelExtras}`,
                        quality,
                        url: link,
                        size: sizeInBytes,
                        fileName
                    });
                    return Promise.resolve();
                }

                if (text.includes("FSL V2")) {
                    links.push({
                        source: `HubCloud - FSL V2 Server ${labelExtras}`,
                        quality,
                        url: link,
                        size: sizeInBytes,
                        fileName
                    });
                    return Promise.resolve();
                }

                if (text.includes("FSL")) {
                    links.push({
                        source: `HubCloud - FSL Server ${labelExtras}`,
                        quality,
                        url: link,
                        size: sizeInBytes,
                        fileName
                    });
                    return Promise.resolve();
                }

                if (text.includes("S3 Server")) {
                    links.push({
                        source: `HubCloud - S3 Server ${labelExtras}`,
                        quality,
                        url: link,
                        size: sizeInBytes,
                        fileName
                    });
                    return Promise.resolve();
                }

                if (text.includes("BuzzServer")) {
                    return fetch(`${link}/download`, {
                        method: 'GET',
                        headers: { ...HEADERS, Referer: link },
                        redirect: 'manual'
                    })
                        .then(resp => {
                            if (resp.status >= 300 && resp.status < 400) {
                                const loc = resp.headers.get('location');
                                const m = loc?.match(/hx-redirect=([^&]+)/);
                                if (m) {
                                    links.push({
                                        source: `HubCloud - BuzzServer ${labelExtras}`,
                                        quality,
                                        url: decodeURIComponent(m[1]),
                                        size: sizeInBytes,
                                        fileName
                                    });
                                }
                            }
                        })
                        .catch(() => { });
                }

                // 10Gbps resolves through a redirect chain to a Google-hosted download link, skip
                if (text.includes("10Gbps")) {
                    return Promise.resolve();
                }

                if (link.includes("pixeldra")) {
                    return pixelDrainExtractor(link)
                        .then(extracted => {
                            links.push(...extracted.map(l => ({
                                ...l,
                                quality: typeof l.quality === 'number' ? l.quality : quality,
                                size: l.size || sizeInBytes,
                                fileName
                            })));
                        })
                        .catch(() => { });
                }

                return loadExtractor(link, finalUrl).then(r => links.push(...r));
            });

            return Promise.all(processElements).then(() => links);
        })
        .catch(() => []);
}



async function gdFlixExtractor(url, referer = null) {
    const links = [];

    const getIndexQuality = (name) => {
        const m = (name || '').match(/(\d{3,4})[pP]/);
        return m ? parseInt(m[1]) : 2160;
    };

    const toBytes = (size) => {
        if (!size) return 0;
        const m = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
        if (!m) return 0;
        const v = parseFloat(m[1]);
        return m[2].toUpperCase() === 'GB' ? v * 1024 ** 3 :
            m[2].toUpperCase() === 'MB' ? v * 1024 ** 2 :
                v * 1024;
    };

    try {
        /* meta refresh redirect */
        let res = await fetch(url, { headers: HEADERS });
        let html = await res.text();
        let refresh = html.match(/url=([^"]+)/i);
        let finalUrl = refresh ? refresh[1] : url;

        const page = await fetch(finalUrl, { headers: HEADERS }).then(r => r.text());
        const $ = cheerio.load(page);

        const fileName = $('li:contains("Name")').text().replace('Name :', '').trim();
        const fileSizeText = $('li:contains("Size")').text().replace('Size :', '').trim();
        const quality = getIndexQuality(fileName);
        const sizeBytes = toBytes(fileSizeText);

        const anchors = $('div.text-center a[href]').get();

        for (const a of anchors) {
            const el = $(a);
            const text = el.text().toLowerCase();
            const href = el.attr('href');

            /* DIRECT */
            if (text.includes('direct')) {
                links.push({
                    source: 'GDFlix [Direct]',
                    quality,
                    url: href,
                    size: sizeBytes,
                    fileName
                });
            }

            /* INDEX LINKS */
            else if (text.includes('index')) {
                const gdflixBase = await getGdflixDomain();
                const indexPage = await fetch(`${gdflixBase}${href}`).then(r => r.text());
                const $$ = cheerio.load(indexPage);

                const btns = $$('a.btn-outline-info').get();
                for (const b of btns) {
                    const serverUrl = gdflixBase + $$(b).attr('href');
                    const serverPage = await fetch(serverUrl).then(r => r.text());
                    const $$$ = cheerio.load(serverPage);

                    $$$('div.mb-4 > a[href]').each((_, x) => {
                        links.push({
                            source: 'GDFlix [Index]',
                            quality,
                            url: $$(x).attr('href'),
                            size: sizeBytes,
                            fileName
                        });
                    });
                }
            }

            /* DRIVEBOT */
            else if (text.includes('drivebot')) {
                const id = href.match(/id=([^&]+)/)?.[1];
                const doId = href.match(/do=([^=]+)/)?.[1];
                if (!id || !doId) continue;

                const drivebotBase = await getDrivebotDomain();
                const bases = [...new Set([drivebotBase, 'https://drivebot.sbs', 'https://drivebot.cfd'])];

                for (const base of bases) {
                    try {
                        const bot = await fetch(`${base}/download?id=${id}&do=${doId}`);
                        const cookie = bot.headers.get('set-cookie') || '';
                        const html = await bot.text();

                        const token = html.match(/token', '([a-f0-9]+)/)?.[1];
                        const postId = html.match(/download\?id=([^']+)/)?.[1];
                        if (!token || !postId) continue;

                        const dl = await fetch(`${base}/download?id=${postId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Referer': `${base}/download?id=${id}&do=${doId}`,
                                'Cookie': cookie
                            },
                            body: `token=${token}`
                        }).then(r => r.text());

                        const final = dl.match(/url":"(.*?)"/)?.[1]?.replace(/\\/g, '');
                        if (final) {
                            links.push({
                                source: 'GDFlix [DriveBot]',
                                quality,
                                url: final,
                                size: sizeBytes,
                                fileName
                            });
                        }
                    } catch { }
                }
            }

            /* INSTANT DL */
            else if (text.includes('instant')) {
                const r = await fetch(href, { redirect: 'manual' });
                const loc = r.headers.get('location');
                if (loc) {
                    links.push({
                        source: 'GDFlix [Instant]',
                        quality,
                        url: loc.replace('url=', ''),
                        size: sizeBytes,
                        fileName
                    });
                }
            }

            /* GOFILE */
            else if (text.includes('gofile')) {
                const extracted = await goFileExtractor(href);
                extracted.forEach(l => links.push({
                    ...l,
                    quality,
                    size: l.size || sizeBytes,
                    fileName
                }));
            }

            /* PIXELDRAIN */
            else if (text.includes('pixel')) {
                return pixelDrainExtractor(link)
                    .then(extracted => {
                        links.push(...extracted.map(l => ({
                            ...l,
                            quality: typeof l.quality === 'number' ? l.quality : quality,
                            size: l.size || sizeInBytes,
                            fileName
                        })));
                    }).catch(() => { });
            }
        }
    } catch { }

    return links;
}

async function goFileExtractor(url) {
    const links = [];
    try {
        const id = url.match(/(?:\?c=|\/d\/)([a-zA-Z0-9-]+)/)?.[1];
        if (!id) return [];

        const acc = await fetch('https://api.gofile.io/accounts', { method: 'POST' }).then(r => r.json());
        const token = acc?.data?.token;
        if (!token) return [];

        const js = await fetch('https://gofile.io/dist/js/global.js').then(r => r.text());
        const wt = js.match(/appdata\.wt\s*=\s*["']([^"']+)/)?.[1];
        if (!wt) return [];

        const data = await fetch(`https://api.gofile.io/contents/${id}?wt=${wt}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        const files = Object.values(data.data.children);
        const file = files[0];
        if (!file) return [];

        const size = file.size;
        const sizeFormatted =
            size < 1024 ** 3
                ? `${(size / 1024 ** 2).toFixed(2)} MB`
                : `${(size / 1024 ** 3).toFixed(2)} GB`;

        links.push({
            source: 'GoFile',
            quality: getIndexQuality(file.name),
            url: file.link,
            size: sizeFormatted,
            fileName: file.name,
            headers: { Cookie: `accountToken=${token}` },
            label: `GoFile [${sizeFormatted}]`
        });
    } catch { }

    return links;
}


/**
 * Main extractor dispatcher. Determines which specific extractor to use based on the URL.
 * Replicates the `loadExtractor` logic flow.
 * @param {string} url The URL of the hoster page.
 * @param {string} referer The referer URL.
 * @returns {Promise<Array<{quality: string, url: string, source: string}>>} A list of final links.
 */
function loadExtractor(url, referer = MAIN_URL) {
    const hostname = new URL(url).hostname;

    if (hostname.includes('gdflix')) {
        return gdFlixExtractor(url, referer);
    }

    if (hostname.includes('gofile')) {
        return goFileExtractor(url);
    }

    if (hostname.includes('hubcloud')) {
        return hubCloudExtractor(url, referer);
    }
    if (hostname.includes('hubdrive')) {
        return hubDriveExtractor(url, referer);
    }
    if (hostname.includes('hubcdn')) {
        return hubCdnExtractor(url, referer);
    }
    if (hostname.includes('hblinks')) {
        return hbLinksExtractor(url, referer);
    }
    if (hostname.includes('hubstream')) {
        return hubStreamExtractor(url, referer);
    }
    if (hostname.includes('pixeldrain')) {
        return pixelDrainExtractor(url);
    }
    if (hostname.includes('streamtape')) {
        return streamTapeExtractor(url);
    }
    if (hostname.includes('hdstream4u')) {
        // This is VidHidePro, often a simple redirect. For this script, we assume it's a direct link.
        return Promise.resolve([{ source: 'HdStream4u', quality: 'Unknown', url }]);
    }

    // Skip unsupported hosts like linkrit.com
    if (hostname.includes('linkrit')) {
        return Promise.resolve([]);
    }
    if (
        hostname.includes('google.') ||
        hostname.includes('ampproject.org') ||
        hostname.includes('gstatic.') ||
        hostname.includes('doubleclick.') ||
        hostname.includes('ddl2')
    ) {
        return Promise.resolve([]);
    }


    const sourceName = hostname.replace(/^www\./, '');
    return Promise.resolve([{ source: sourceName, quality: 'Unknown', url }]);
}

// imdbId narrows to exact matches, falls back to unfiltered set if none match
function search(query, page = 1, imdbId = null) {
    return getCurrentDomain()
        .then(currentDomain => {
            const apiUrl = `${currentDomain}/search.php?q=${encodeURIComponent(query)}&page=${page}`;
            return fetch(apiUrl, { headers: HEADERS });
        })
        .then(res => res.json())
        .then(json => {
            if (!json?.hits?.length) {
                return [];
            }

            const docs = json.hits.map(hit => hit.document);
            const filtered = imdbId ? docs.filter(doc => doc.imdb_id === imdbId) : docs;
            const pool = filtered.length ? filtered : docs;

            const results = pool.map(doc => ({
                    title: doc.post_title,
                    url: doc.permalink.startsWith('http')? doc.permalink: `${MAIN_URL}${doc.permalink.startsWith('/') ? '' : '/'}${doc.permalink}`,
                    poster: doc.post_thumbnail ?? null,
                    year: (() => {
                        const match = doc.post_title.match(/\b(19|20)\d{2}\b/);
                        return match ? Number(match[0]) : null;
                    })(),
                    imdbId: doc.imdb_id
                }));

            return results;
        });
}



// Splits the raw page HTML into <h5>...</h5> blocks in document order (regex, not cheerio -
// the app's cheerio shim doesn't reliably support the nextAll()/prop('tagName') sibling walk
// this used to rely on). Returns {text, html} per block so callers can both test the plain text
// against a season/episode pattern and pull hrefs out of the block's own markup.
function splitH5Blocks(rawHtml) {
    const blocks = [];
    const re = /<h5\b[^>]*>([\s\S]*?)<\/h5>/gi;
    let m;
    while ((m = re.exec(rawHtml)) !== null) {
        const inner = m[1];
        const text = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&ndash;|&mdash;/gi, '-').replace(/\s+/g, ' ').trim();
        blocks.push({ text, html: inner, index: m.index });
    }
    return blocks;
}

function extractHrefs(blockHtml) {
    const hrefs = [];
    const re = /<a\b[^>]*href=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(blockHtml)) !== null) hrefs.push(m[1]);
    return hrefs;
}

// Season header blocks repeat per quality (e.g. 480p/720p/1080p all say "Season 1"), with no <hr>
// between them - only a different season's header (or the trailing <hr> before the next season)
// marks the end of this season's run. Walk every h5 block in order and stay "inside" the target
// season until a different Season N header shows up.
function extractSeasonPageUrls(rawHtml, seasonPattern) {
    const blocks = splitH5Blocks(rawHtml);
    const anySeasonPattern = /\bSeason\s*0?\d+\b/i;
    const urls = [];
    let inSeason = false;

    for (const block of blocks) {
        if (anySeasonPattern.test(block.text)) {
            inSeason = seasonPattern.test(block.text);
            continue;
        }
        if (!inSeason) continue;
        if (!/single\s*episode/i.test(block.text) || /zip/i.test(block.text)) continue;
        for (const href of extractHrefs(block.html)) {
            if (!urls.includes(href)) urls.push(href);
        }
    }
    return urls;
}

// Episode header blocks (e.g. "EP01 - 480p [210MB]") are followed by one or more h5 blocks
// holding the hoster link(s), until the next "EpN" header. Same raw-HTML approach as above.
function extractEpisodeLinks(rawHtml, episodePattern) {
    const blocks = splitH5Blocks(rawHtml);
    const anyEpisodePattern = /\bEp\s*0?\d+\b/i;
    const links = [];
    let inEpisode = false;

    for (const block of blocks) {
        if (anyEpisodePattern.test(block.text)) {
            inEpisode = episodePattern.test(block.text);
            continue;
        }
        if (!inEpisode) continue;
        for (const href of extractHrefs(block.html)) {
            if (/hubcloud|gdflix/i.test(href)) links.push(href);
        }
    }
    return links;
}

/**
 * Fetches the media page and extracts all hoster links.
 * This combines the logic of `load()` and `loadLinks()` from the Kotlin provider.
 * @param {string} mediaUrl The URL of the movie or TV show page.
 * @returns {Promise<Array<any>>} A list of all final, extracted download links.
 */
function getDownloadLinks(mediaUrl, season, episode) {
    return getCurrentDomain()
        .then(currentDomain => {
            HEADERS.Referer = `${currentDomain}/`;
            return fetch(mediaUrl, { headers: HEADERS });
        })
        .then(response => response.text())
        .then(data => {
            const $ = cheerio.load(data);

            const typeRaw = $('h1.post-title').text();
            const posterTitle = $('.poster-title').first().text().trim();

            // Season detection done on the raw HTML too, not just cheerio's .text() - a page
            // title/poster-title selector mismatch here silently routes a TV page down the
            // movie branch, which is a much harder failure to notice than an empty result.
            const rawTitleMatch = data.match(/<h1[^>]*class=["'][^"']*post-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
            const rawTitleText = rawTitleMatch ? rawTitleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            const seasonSource = posterTitle || typeRaw || rawTitleText;
            const seasonMatch = seasonSource.match(/\bSeason\s*(\d+)\b/i);
            const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : null;
            const isMovie = !seasonMatch;

            const title = posterTitle;

            if (isMovie) {
                const links = $('h5 a')
                    .map((_, el) => $(el).attr('href'))
                    .get()
                    .filter(Boolean);

                const hosterRegex = /hubcloud|gdflix|gdlink/i;

                // h5 links usually point straight at a hoster, only fetch intermediate page as fallback
                const extractMdrive = (url) => {
                    if (hosterRegex.test(url)) {
                        return Promise.resolve([url]);
                    }
                    return fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    })
                        .then(res => res.text())
                        .then(html => {
                            const $$ = cheerio.load(html);

                            return $$('a[href]')
                                .map((_, el) => {
                                    const href = $$(el).attr('href');
                                    return hosterRegex.test(href) ? href : null;
                                })
                                .get()
                                .filter(Boolean);
                        })
                        .catch(e => {
                            return [];
                        });
                };


                const promises = links.map(url => {
                    return extractMdrive(url).then(extractedUrls => {
                        return Promise.all(
                            extractedUrls.map(serverUrl =>
                                loadExtractor(serverUrl, mediaUrl)
                                    .catch(err => {
                                        return [];
                                    })
                            )
                        );
                    }).catch(err => {
                        return [];
                    });
                });


                return Promise.all(promises).then(results => {
                    const flat = results.flat(2);

                    const seen = new Set();
                    const finalLinks = flat.filter(link => {
                        if (!link?.url || seen.has(link.url)) return false;
                        seen.add(link.url);
                        return true;
                    });

                    return {
                        finalLinks,
                        isMovie: true
                    };
                });
            } else {
                const seasonPattern = new RegExp(`Season\\s*0?${season}\\b`, 'i');
                const episodePattern = new RegExp(`Ep\\s*0?${episode}\\b`, 'i');

                // Done on the raw HTML instead of walking cheerio siblings - the app's cheerio shim
                // doesn't reliably support nextAll()/prop('tagName') for this kind of stateful walk
                // (same issue documented for uhdmovies.js/vegamovies.js).
                const seasonPageUrls = extractSeasonPageUrls(data, seasonPattern);

                if (seasonPageUrls.length === 0) {
                    return Promise.resolve({ finalLinks: [], isMovie: false });
                }

                const mdrivePromises = seasonPageUrls.map(seasonPageUrl =>
                    fetch(seasonPageUrl, { headers: HEADERS })
                        .then(r => r.text())
                        .then(episodeHtml => extractEpisodeLinks(episodeHtml, episodePattern))
                        .catch(() => [])
                );

                return Promise.all(mdrivePromises).then(allEpisodeLinks => {
                    const flatLinks = allEpisodeLinks.flat();

                    if (flatLinks.length === 0) {
                        return { finalLinks: [], isMovie: false };
                    }

                    const extractorPromises = flatLinks.map(serverUrl =>
                        loadExtractor(serverUrl, seasonPageUrls[0])
                            .catch(e => {
                                return [];
                            })
                    );

                    return Promise.all(extractorPromises).then(results => {
                        const flat = results.flat();

                        const seen = new Set();
                        const finalLinks = flat.filter(link => {
                            if (!link?.url || seen.has(link.url)) return false;
                            seen.add(link.url);
                            return true;
                        });

                        return {
                            finalLinks,
                            isMovie: false
                        };
                    });
                });

            }

        });
}


async function resolveImdbToTmdb(imdbId, mediaType) {
    try {
        const url = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const data = await (await fetch(url, { skipSizeCheck: true })).json();
        const results = mediaType === 'tv' ? data.tv_results : data.movie_results;
        return results && results.length ? results[0].id : null;
    } catch (e) {
        return null;
    }
}

function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }).then(function (response) {
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
    }).then(function (data) {
        const title = mediaType === 'tv' ? data.name : data.title;
        const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
        const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
        return {
            title: title,
            year: year,
            imdbId: data.external_ids?.imdb_id || null
        };
    });
}

function normalizeTitle(title) {
    if (!title) return '';

    return title
        .toLowerCase()
        .replace(/\b(the|a|an)\b/g, '')
        .replace(/[:\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
}

function calculateTitleSimilarity(title1, title2) {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);

    if (norm1 === norm2) return 1.0;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

function findBestTitleMatch(mediaInfo, searchResults, mediaType, season) {
    if (!searchResults || searchResults.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const result of searchResults) {
        let score = calculateTitleSimilarity(mediaInfo.title, result.title);

        if (mediaInfo.year && result.year) {
            const yearDiff = Math.abs(mediaInfo.year - result.year);
            if (yearDiff === 0) {
                score += 0.2;
            } else if (yearDiff <= 1) {
                score += 0.1;
            } else if (yearDiff > 5) {
                score -= 0.3;
            }
        }

        if (mediaType === 'tv' && season) {
            const titleLower = result.title.toLowerCase();
            const hasSeason = titleLower.includes(`season ${season}`) ||
                titleLower.includes(`s${season}`) ||
                titleLower.includes(`season ${season.toString().padStart(2, '0')}`);
            if (hasSeason) {
                score += 0.3;
            } else {
                score -= 0.2;
            }
        }

        if (result.title.toLowerCase().includes('2160p') ||
            result.title.toLowerCase().includes('4k')) {
            score += 0.05;
        }

        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = result;
        }
    }

    return bestMatch;
}

function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
    const resolveStep = (typeof tmdbId === 'string' && tmdbId.trim().toLowerCase().startsWith('tt'))
        ? resolveImdbToTmdb(tmdbId, mediaType).then(function (resolved) {
            if (!resolved) return null;
            tmdbId = resolved;
            return true;
        })
        : Promise.resolve(true);

    return resolveStep.then(function (resolvedOk) {
        if (!resolvedOk) return [];

        return getTMDBDetails(tmdbId, mediaType).then(function (mediaInfo) {
        if (!mediaInfo.title) {
            throw new Error('Could not extract title from TMDB response');
        }

        // search by title text, the Typesense index isn't ID-keyed
        const searchQuery = mediaInfo.title;

        return search(searchQuery, 1, mediaInfo.imdbId).then(function (searchResults) {
            if (searchResults.length === 0) {
                return [];
            }

            const bestMatch = findBestTitleMatch(mediaInfo, searchResults, mediaType, season);

            const selectedMedia = bestMatch || searchResults[0];

            return getDownloadLinks(selectedMedia.url, season, episode).then(function (result) {
                const { finalLinks, isMovie } = result;

                let filteredLinks = finalLinks;

                const streams = filteredLinks
                    .filter(function (link) {
                        return link && link.url;
                    })
                    .map(function (link) {
                        let mediaTitle;
                        if (link.fileName && link.fileName !== 'Unknown') {
                            mediaTitle = link.fileName;
                        } else if (mediaType === 'tv' && season && episode) {
                            mediaTitle =
                                `${mediaInfo.title} ` +
                                `S${String(season).padStart(2, '0')}` +
                                `E${String(episode).padStart(2, '0')}`;
                        } else if (mediaInfo.year) {
                            mediaTitle = `${mediaInfo.title} (${mediaInfo.year})`;
                        } else {
                            mediaTitle = mediaInfo.title;
                        }

                        // Size & server
                        const formattedSize = formatBytes(link.size);
                        const serverName = extractServerName(link.source);

                        // Quality normalization (APP-SAFE)
                        let qualityStr = 'Unknown';
                        if (link.quality >= 2160) qualityStr = '2160p';
                        else if (link.quality >= 1440) qualityStr = '1440p';
                        else if (link.quality >= 1080) qualityStr = '1080p';
                        else if (link.quality >= 720) qualityStr = '720p';
                        else if (link.quality >= 480) qualityStr = '480p';
                        else if (link.quality >= 360) qualityStr = '360p';
                        else qualityStr = '240p';

                        return {
                            name: `Moviesdrive ${serverName}`,
                            title: mediaTitle,
                            url: link.url,
                            quality: qualityStr,
                            size: formattedSize,
                            provider: 'Moviesdrive'
                        };
                    });

                const qualityOrder = {
                    '2160p': 5,
                    '1440p': 4,
                    '1080p': 3,
                    '720p': 2,
                    '480p': 1,
                    '360p': 0,
                    '240p': -1,
                    'Unknown': -2
                };

                streams.sort(function (a, b) {
                    return (qualityOrder[b.quality] ?? -3) - (qualityOrder[a.quality] ?? -3);
                });

                const filteredStreams = streams.filter(function (s) { return meetsMinSize(s.size); });
                return filteredStreams;
            });

        });
    });
    }).catch(function (error) {
        return [];
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = { getStreams };
}