// Vidnest Scraper for Nuvio Local Scrapers
// React Native compatible version - Promise-based approach only
// Extracts streaming links using TMDB ID for Vidnest servers with AES-GCM decryption

function __nvToStr(v){return v===undefined||v===null?'':String(v);}
function __nvDetectQuality(rawText,fallbackQuality){const text=__nvToStr(rawText).toLowerCase();if(/2160p|4k\b|\buhd\b/i.test(text))return'2160p';if(/1080p/i.test(text))return'1080p';if(/720p/i.test(text))return'720p';if(/480p/i.test(text))return'480p';if(/360p/i.test(text))return'360p';const fb=__nvToStr(fallbackQuality).trim();if(fb)return fb;return null;}
function __nvQualityIcon(quality){const q=__nvToStr(quality).toLowerCase();if(/2160p|4k|uhd/.test(q))return'⚡';if(/720p/.test(q))return'💎';return'🔥';}
function __nvFormatBytes(bytes){const gb=bytes/(1024*1024*1024);if(gb>=1)return`${gb.toFixed(1)} GB`;const mb=bytes/(1024*1024);return`${Math.round(mb)} MB`;}
function __nvDetectSize({sizeBytes,sizeLabel,rawText}={}){if(typeof sizeBytes==='number'&&isFinite(sizeBytes)&&sizeBytes>0){return __nvFormatBytes(sizeBytes);}if(sizeLabel&&typeof sizeLabel==='string'&&sizeLabel.trim()&&sizeLabel.trim().toUpperCase()!=='N/A'){return sizeLabel.trim();}const text=__nvToStr(rawText);const m=text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);if(m){return`${m[1]} ${m[2].toUpperCase()}`;}return null;}
function __nvDetectContainer(rawText,url){const text=`${__nvToStr(rawText)} ${__nvToStr(url)}`.toLowerCase();if(/\.mp4(?:[?#]|$)|\.mp4[^a-z0-9]/i.test(text))return'MP4';if(/\.mkv(?:[?#]|$)|\.mkv[^a-z0-9]/i.test(text))return'MKV';return null;}
function __nvDetectCodec(rawText){const text=__nvToStr(rawText).toLowerCase();if(/h\.?265|x265|hevc/i.test(text))return'H.265';if(/h\.?264|x264|avc/i.test(text))return'H.264';return null;}
function __nvDetectHDR(rawText){const text=__nvToStr(rawText).toLowerCase();if(/hdr10\+/i.test(text))return'HDR10+';if(/hdr10/i.test(text))return'HDR10';if(/\bhdr\b/i.test(text))return'HDR';return null;}
function __nvDetectDolbyVision(rawText){const text=__nvToStr(rawText).toLowerCase();return/dolby\s*vision|dovi|[.\-_]dv[.\-_]/i.test(text);}
function __nvDetectSource(rawText){const text=__nvToStr(rawText);if(!text.trim())return null;if(/blu-?ray/i.test(text))return'BluRay';return'WEB-DL';}
function __nvDetectAudioType(rawText,dubKeywords){const text=__nvToStr(rawText).toLowerCase();if(!text.trim())return null;if(/multi[\s-]?audio|\bmulti\b/i.test(text))return'Multi-Audio';const dubPattern=Array.isArray(dubKeywords)&&dubKeywords.length?new RegExp(dubKeywords.join('|'),'i'):/dual|dubbed|hindi/i;if(dubPattern.test(text))return'Dual-Audio';if(/audio|dub|dd5\.1|ddp5\.1|eac3|atmos|truehd|aac|dts/i.test(text)){return'Single-Audio';}return null;}
function __nvDetectAudioChannels(rawText){const text=__nvToStr(rawText).toLowerCase();let channels=null;if(/truehd\s*7\.1/i.test(text))channels='TrueHD 7.1';else if(/ddp5\.1|eac3|e-ac-3/i.test(text))channels='DDP5.1';else if(/dd5\.1|ac-?3|5\.1/i.test(text))channels='DD5.1';else if(/truehd/i.test(text))channels='TrueHD';else if(/aac/i.test(text))channels='AAC';if(!channels)return null;if(/atmos/i.test(text))channels+='+Atmos';return channels;}
function formatStreamTitle(opts){const{title,year,season,episode,rawText='',sizeBytes,sizeLabel,url,quality:qualityFallback,dubKeywords,}=opts||{};const combinedText=[rawText,qualityFallback,url].filter(Boolean).join(' ');const quality=__nvDetectQuality(rawText,qualityFallback)||'Unknown';const size=__nvDetectSize({sizeBytes,sizeLabel,rawText})||'Unknown Size';const container=__nvDetectContainer(combinedText,url)||'MKV';const lines=[];const displayTitle=__nvToStr(title).trim()||'Unknown Title';let titleSuffix='';if(season!==undefined&&season!==null&&episode!==undefined&&episode!==null){const s=String(season).padStart(2,'0');const e=String(episode).padStart(2,'0');titleSuffix=` - (S${s}E${e})`;}else if(year){titleSuffix=` - (${year})`;}lines.push(`🎬 ${displayTitle}${titleSuffix}`);lines.push(`${__nvQualityIcon(quality)} ${quality} | ${size} | 📼 ${container}`);const hdr=__nvDetectHDR(combinedText);const codec=__nvDetectCodec(combinedText);const dv=__nvDetectDolbyVision(combinedText);if(hdr||codec){const parts=[];if(hdr)parts.push(hdr);parts.push(codec||'H.264');let line3=`🌈 ${parts.join(' | ')}`;if(dv)line3+=' | 👁️ DV';lines.push(line3);}else if(dv){lines.push('🌈 👁️ DV');}const audioType=__nvDetectAudioType(combinedText,dubKeywords);const audioChannels=__nvDetectAudioChannels(combinedText);if(audioType||audioChannels){const parts=[];if(audioType)parts.push(`🔊 ${audioType}`);if(audioChannels)parts.push(`🎧 ${audioChannels}`);lines.push(parts.join(' | '));}const source=__nvDetectSource(combinedText);if(source){lines.push(`📀 ${source}`);}return lines.join('\n');}

// TMDB API Configuration
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Vidnest Configuration
const VIDNEST_BASE_URL = 'https://backend.vidnest.fun';
const PASSPHRASE = 'T8c8PQlSQVU4mBuW4CbE/g57VBbM5009QHd+ym93aZZ5pEeVpToY6OdpYPvRMVYp';
const SERVERS = ['allmovies', 'hollymoviehd'];

// Working headers for Vidnest API
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://vidnest.fun/',
    'Origin': 'https://vidnest.fun',
    'DNT': '1'
};

// Headers for stream playback (separate from API headers)
const PLAYBACK_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// React Native-safe Base64 utilities (no Buffer dependency)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToBytes(base64) {
    if (!base64) return new Uint8Array(0);
    
    // Remove padding
    let input = String(base64).replace(/=+$/, '');
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
    
    // Convert string to bytes
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
        bytes[i] = output.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes) {
    if (!bytes || bytes.length === 0) return '';
    
    let output = '';
    let i = 0;
    const len = bytes.length;
    
    while (i < len) {
        const a = bytes[i++];
        const b = i < len ? bytes[i++] : 0;
        const c = i < len ? bytes[i++] : 0;
        
        const bitmap = (a << 16) | (b << 8) | c;
        
        output += BASE64_CHARS.charAt((bitmap >> 18) & 63);
        output += BASE64_CHARS.charAt((bitmap >> 12) & 63);
        output += i - 2 < len ? BASE64_CHARS.charAt((bitmap >> 6) & 63) : '=';
        output += i - 1 < len ? BASE64_CHARS.charAt(bitmap & 63) : '=';
    }
    
    return output;
}

// Node.js compatible atob function
function atob(str) {
    return base64ToBytes(str).map(byte => String.fromCharCode(byte)).join('');
}

// AES-GCM Decryption using server (React Native compatible)
function decryptAesGcm(encryptedB64, passphraseB64) {
    console.log('[Vidnest] Starting AES-GCM decryption via server...');
    
    return fetch('https://aesdec.nuvioapp.space/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            encryptedData: encryptedB64,
            passphrase: passphraseB64
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        console.log('[Vidnest] Server decryption successful');
        return data.decrypted;
    })
    .catch(error => {
        console.error(`[Vidnest] Server decryption failed: ${error.message}`);
        throw error;
    });
}

// Validate stream URL accessibility
function validateStreamUrl(url, headers) {
    console.log(`[Vidnest] Validating stream URL: ${url.substring(0, 60)}...`);
    
    return fetch(url, {
        method: 'HEAD',
        headers: headers,
        timeout: 5000
    })
    .then(response => {
        // Accept 200 OK, 206 Partial Content, or 302 redirects
        const isValid = response.ok || response.status === 206 || response.status === 302;
        console.log(`[Vidnest] URL validation result: ${response.status} - ${isValid ? 'VALID' : 'INVALID'}`);
        return isValid;
    })
    .catch(error => {
        console.log(`[Vidnest] URL validation failed: ${error.message}`);
        return false;
    });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    const defaultHeaders = { ...WORKING_HEADERS };
    
    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }).catch(function(error) {
        console.error(`[Vidnest] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Get movie/TV show details from TMDB
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    
    return makeRequest(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
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

// Extract quality from URL or response
function extractQuality(url) {
    if (!url) return 'Unknown';
    
    // Try to extract quality from URL patterns
    const qualityPatterns = [
        /(\d{3,4})p/i,  // 1080p, 720p, etc.
        /(\d{3,4})k/i,  // 1080k, 720k, etc.
        /quality[_-]?(\d{3,4})/i,  // quality-1080, quality_720, etc.
        /res[_-]?(\d{3,4})/i,  // res-1080, res_720, etc.
        /(\d{3,4})x\d{3,4}/i,  // 1920x1080, 1280x720, etc.
    ];

    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }

    // Additional quality detection based on URL patterns
    if (url.includes('1080') || url.includes('1920')) return '1080p';
    if (url.includes('720') || url.includes('1280')) return '720p';
    if (url.includes('480') || url.includes('854')) return '480p';
    if (url.includes('360') || url.includes('640')) return '360p';
    if (url.includes('240') || url.includes('426')) return '240p';

    return 'Unknown';
}

// Process Vidnest API response
function processVidnestResponse(data, serverName, mediaInfo, seasonNum, episodeNum) {
    const streams = [];
    
    try {
        console.log(`[Vidnest] Processing response from ${serverName}:`, JSON.stringify(data, null, 2));
        
        // Check if response has success field and streams/sources
        if (!data.success && !data.streams && !data.sources) {
            console.log(`[Vidnest] ${serverName}: No valid streams found in response`);
            return streams;
        }
        
        // Extract sources or streams array
        const sources = data.sources || data.streams || [];
        
        if (!Array.isArray(sources) || sources.length === 0) {
            console.log(`[Vidnest] ${serverName}: No sources/streams array found`);
            return streams;
        }
        
        // Process each source
        sources.forEach((source, index) => {
            if (!source) return;
            
            // Extract video URL from various possible fields
            const videoUrl = source.file || source.url || source.src || source.link;
            
            if (!videoUrl) {
                console.log(`[Vidnest] ${serverName}: Source ${index} has no video URL`);
                return;
            }
            
            // Extract quality
            let quality = extractQuality(videoUrl);
            
            // Extract language information
            let languageInfo = '';
            if (source.language) {
                languageInfo = ` [${source.language}]`;
            }
            
            // Extract label information for better naming
            let labelInfo = '';
            if (source.label) {
                labelInfo = ` - ${source.label}`;
            }
            
            // Determine stream type
            let streamType = 'Unknown';
            if (source.type === 'hls' || videoUrl.includes('.m3u8')) {
                streamType = 'HLS';
                if (quality === 'Unknown') {
                    quality = 'Adaptive'; // HLS streams are usually adaptive
                }
            } else if (videoUrl.includes('.mp4')) {
                streamType = 'MP4';
            } else if (videoUrl.includes('.mkv')) {
                streamType = 'MKV';
            }
            
            // Create rich media title via the shared formatter
            const richTitle = formatStreamTitle({
                title: mediaInfo.title,
                year: mediaInfo.year,
                season: seasonNum && episodeNum ? seasonNum : undefined,
                episode: seasonNum && episodeNum ? episodeNum : undefined,
                rawText: `${source.label || ''} ${source.language || ''} ${streamType}`.trim(),
                url: videoUrl,
                quality: quality
            });

            streams.push({
                name: `Vidnest ${serverName.charAt(0).toUpperCase() + serverName.slice(1)}${labelInfo}${languageInfo} - ${quality}`,
                title: richTitle,
                url: videoUrl,
                quality: quality,
                size: 'Unknown',
                provider: 'vidnest'
            });
            
            console.log(`[Vidnest] ${serverName}: Added ${quality}${languageInfo} stream: ${videoUrl.substring(0, 60)}...`);
        });
        
    } catch (error) {
        console.error(`[Vidnest] Error processing ${serverName} response: ${error.message}`);
    }
    
    return streams;
}

// Fetch streams from a single server
function fetchFromServer(serverName, mediaType, tmdbId, mediaInfo, seasonNum, episodeNum) {
    console.log(`[Vidnest] Fetching from ${serverName}...`);
    
    // Build API URL
    let apiUrl;
    if (mediaType === 'tv' && seasonNum && episodeNum) {
        apiUrl = `${VIDNEST_BASE_URL}/${serverName}/${mediaType}/${tmdbId}/${seasonNum}/${episodeNum}`;
    } else {
        apiUrl = `${VIDNEST_BASE_URL}/${serverName}/${mediaType}/${tmdbId}`;
    }
    
    console.log(`[Vidnest] ${serverName} API URL: ${apiUrl}`);
    
    return makeRequest(apiUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(responseText) {
            console.log(`[Vidnest] ${serverName} response length: ${responseText.length} characters`);
            
            // Try to parse as JSON first
            try {
                const data = JSON.parse(responseText);
                
                // Check if response contains encrypted data
                if (data.encrypted && data.data) {
                    console.log(`[Vidnest] ${serverName}: Detected encrypted response, decrypting...`);
                    
                    return decryptAesGcm(data.data, PASSPHRASE)
                        .then(function(decryptedText) {
                            console.log(`[Vidnest] ${serverName}: Decryption successful`);
                            
                            try {
                                const decryptedData = JSON.parse(decryptedText);
                                return processVidnestResponse(decryptedData, serverName, mediaInfo, seasonNum, episodeNum);
                            } catch (parseError) {
                                console.error(`[Vidnest] ${serverName}: JSON parse error after decryption: ${parseError.message}`);
                                return [];
                            }
                        });
                } else {
                    // Process non-encrypted response
                    return processVidnestResponse(data, serverName, mediaInfo, seasonNum, episodeNum);
                }
            } catch (parseError) {
                console.error(`[Vidnest] ${serverName}: Invalid JSON response: ${parseError.message}`);
                return [];
            }
        })
        .catch(function(error) {
            console.error(`[Vidnest] ${serverName} error: ${error.message}`);
            return [];
        });
}

// Main function to extract streaming links for Nuvio
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[Vidnest] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);
    
    return new Promise((resolve, reject) => {
        // First, fetch media details from TMDB
        getTMDBDetails(tmdbId, mediaType)
            .then(function(mediaInfo) {
                console.log(`[Vidnest] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);
                
                // Process both servers in parallel
                const serverPromises = SERVERS.map(serverName => {
                    return fetchFromServer(serverName, mediaType, tmdbId, mediaInfo, seasonNum, episodeNum);
                });
                
                return Promise.all(serverPromises)
                    .then(function(results) {
                        // Combine all streams from all servers
                        const allStreams = [];
                        results.forEach(streams => {
                            allStreams.push(...streams);
                        });
                        
                        // Remove duplicate streams by URL
                        const uniqueStreams = [];
                        const seenUrls = new Set();
                        allStreams.forEach(stream => {
                            if (!seenUrls.has(stream.url)) {
                                seenUrls.add(stream.url);
                                uniqueStreams.push(stream);
                            }
                        });
                        
                        // Validate all streams in parallel
                        console.log(`[Vidnest] Validating ${uniqueStreams.length} streams...`);
                        const validationPromises = uniqueStreams.map(stream => 
                            validateStreamUrl(stream.url, PLAYBACK_HEADERS)
                                .then(isValid => ({ stream, isValid }))
                        );
                        
                        return Promise.all(validationPromises)
                            .then(function(results) {
                                const validStreams = results
                                    .filter(r => r.isValid)
                                    .map(r => r.stream);
                                
                                console.log(`[Vidnest] Filtered ${uniqueStreams.length - validStreams.length} broken links`);
                                
                                // Sort streams by quality (highest first)
                        const getQualityValue = (quality) => {
                            const q = quality.toLowerCase().replace(/p$/, ''); // Remove trailing 'p'
                            
                            // Handle specific quality names
                            if (q === '4k' || q === '2160') return 2160;
                            if (q === '1440') return 1440;
                            if (q === '1080') return 1080;
                            if (q === '720') return 720;
                            if (q === '480') return 480;
                            if (q === '360') return 360;
                            if (q === '240') return 240;
                            
                            // Handle unknown quality (put at end)
                            if (q === 'unknown') return 0;
                            
                            // Try to parse as number
                            const numQuality = parseInt(q);
                            if (!isNaN(numQuality) && numQuality > 0) {
                                return numQuality;
                            }
                            
                            // Default for unrecognized qualities
                            return 1;
                        };
                        
                                validStreams.sort((a, b) => {
                                    const qualityA = getQualityValue(a.quality);
                                    const qualityB = getQualityValue(b.quality);
                                    return qualityB - qualityA;
                                });
                                
                                console.log(`[Vidnest] Total valid streams found: ${validStreams.length}`);
                                resolve(validStreams);
                            });
                    });
            })
            .catch(function(error) {
                console.error(`[Vidnest] Error fetching media details: ${error.message}`);
                resolve([]); // Return empty array on error for Nuvio compatibility
            });
    });
}

// Export for React Native compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
