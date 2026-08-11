/**
 * streamFormat.js
 *
 * Shared "rich formatting" helper for provider stream titles.
 *
 * Produces the 5-line stream display format used across Nuvio providers:
 *
 *   🎬 {Title} - ({Year})                    [or "- (S01E02)" for TV]
 *   {⚡/💎/🔥} {Quality} | {Size} | 📼 {MP4/MKV}
 *   🌈 {HDR/HDR10/HDR10+} | {H.264/H.265} [+ 👁️ DV]
 *   🔊 {Single/Dual/Multi-Audio} | 🎧 {DD5.1/DDP5.1/TrueHD 7.1}[+Atmos]
 *   📀 {BluRay/WEB-DL}
 *
 * Every line except the first is optional and is omitted when the
 * underlying info can't be derived from what the provider scraped -
 * we never fabricate HDR/codec/audio details that aren't really there.
 * The title/quality/size/container line (line 2) is always included
 * because every stream has *some* quality and either a known or
 * "Unknown" size.
 *
 * CommonJS, no dependencies - safe to require() from any provider,
 * obfuscated or not.
 */

function toStr(v) {
  return v === undefined || v === null ? '' : String(v);
}

/**
 * Detect quality tier from arbitrary raw text (filename, title, label...).
 * Falls back to a provider-supplied quality string if regex finds nothing.
 */
function detectQuality(rawText, fallbackQuality) {
  const text = toStr(rawText).toLowerCase();

  if (/2160p|4k\b|\buhd\b/i.test(text)) return '2160p';
  if (/1080p/i.test(text)) return '1080p';
  if (/720p/i.test(text)) return '720p';
  if (/480p/i.test(text)) return '480p';
  if (/360p/i.test(text)) return '360p';

  const fb = toStr(fallbackQuality).trim();
  if (fb) return fb;

  return null;
}

/** Icon for a quality string. ⚡ = 2160p/4K, 💎 = 720p, 🔥 = everything else (1080p/480p/etc). */
function qualityIcon(quality) {
  const q = toStr(quality).toLowerCase();
  if (/2160p|4k|uhd/.test(q)) return '⚡';
  if (/720p/.test(q)) return '💎';
  return '🔥';
}

/**
 * Detect a human size label ("1.4 GB") from raw text.
 * Prefers explicit numeric bytes/label passed in by the caller.
 */
function detectSize({ sizeBytes, sizeLabel, rawText } = {}) {
  if (typeof sizeBytes === 'number' && isFinite(sizeBytes) && sizeBytes > 0) {
    return formatBytes(sizeBytes);
  }

  if (sizeLabel && typeof sizeLabel === 'string' && sizeLabel.trim() && sizeLabel.trim().toUpperCase() !== 'N/A') {
    return sizeLabel.trim();
  }

  const text = toStr(rawText);
  const m = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (m) {
    return `${m[1]} ${m[2].toUpperCase()}`;
  }

  return null;
}

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

/** Container: MP4 if url/text mentions .mp4, else MKV. Returns null if nothing at all to go on. */
function detectContainer(rawText, url) {
  const text = `${toStr(rawText)} ${toStr(url)}`.toLowerCase();
  if (/\.mp4(?:[?#]|$)|\.mp4[^a-z0-9]/i.test(text)) return 'MP4';
  if (/\.mkv(?:[?#]|$)|\.mkv[^a-z0-9]/i.test(text)) return 'MKV';
  return null;
}

/** Codec: H.265 if hevc/x265 detected, else H.264 if any codec-ish signal found, else null. */
function detectCodec(rawText) {
  const text = toStr(rawText).toLowerCase();
  if (/h\.?265|x265|hevc/i.test(text)) return 'H.265';
  if (/h\.?264|x264|avc/i.test(text)) return 'H.264';
  return null;
}

/** HDR tier, or null if nothing detected (never fabricated). */
function detectHDR(rawText) {
  const text = toStr(rawText).toLowerCase();
  if (/hdr10\+/i.test(text)) return 'HDR10+';
  if (/hdr10/i.test(text)) return 'HDR10';
  if (/\bhdr\b/i.test(text)) return 'HDR';
  return null;
}

/** Dolby Vision flag. */
function detectDolbyVision(rawText) {
  const text = toStr(rawText).toLowerCase();
  return /dolby\s*vision|dovi|[.\-_]dv[.\-_]/i.test(text);
}

/** Source: BluRay if detected, else WEB-DL (default assumption for web scrapers). Null if no text at all. */
function detectSource(rawText) {
  const text = toStr(rawText);
  if (!text.trim()) return null;
  if (/blu-?ray/i.test(text)) return 'BluRay';
  return 'WEB-DL';
}

/** Audio type: Multi-Audio / Dual-Audio / Single-Audio, or null if nothing to infer from. */
function detectAudioType(rawText, dubKeywords) {
  const text = toStr(rawText).toLowerCase();
  if (!text.trim()) return null;

  if (/multi[\s-]?audio|\bmulti\b/i.test(text)) return 'Multi-Audio';

  const dubPattern = Array.isArray(dubKeywords) && dubKeywords.length
    ? new RegExp(dubKeywords.join('|'), 'i')
    : /dual|dubbed|hindi/i;

  if (dubPattern.test(text)) return 'Dual-Audio';

  // Only claim Single-Audio when there's an actual audio-related signal;
  // otherwise we genuinely don't know.
  if (/audio|dub|dd5\.1|ddp5\.1|eac3|atmos|truehd|aac|dts/i.test(text)) {
    return 'Single-Audio';
  }

  return null;
}

/** Audio channel layout, or null if no audio-channel signal present. */
function detectAudioChannels(rawText) {
  const text = toStr(rawText).toLowerCase();
  let channels = null;

  if (/truehd\s*7\.1/i.test(text)) channels = 'TrueHD 7.1';
  else if (/ddp5\.1|eac3|e-ac-3/i.test(text)) channels = 'DDP5.1';
  else if (/dd5\.1|ac-?3|5\.1/i.test(text)) channels = 'DD5.1';
  else if (/truehd/i.test(text)) channels = 'TrueHD';
  else if (/aac/i.test(text)) channels = 'AAC';

  if (!channels) return null;

  if (/atmos/i.test(text)) channels += '+Atmos';

  return channels;
}

/**
 * Build the rich multi-line stream title.
 *
 * @param {Object} opts
 * @param {string} opts.title - Movie/show title.
 * @param {string|number} [opts.year] - Release year.
 * @param {number} [opts.season] - Season number (TV).
 * @param {number} [opts.episode] - Episode number (TV).
 * @param {string} [opts.rawText] - Raw scraped text to regex against (filename, label, quality string, etc).
 *                                   Can be a concatenation of several signal strings.
 * @param {number} [opts.sizeBytes] - Known size in bytes, if the provider already tracks it numerically.
 * @param {string} [opts.sizeLabel] - Known size as a human label ("1.4 GB"), if already extracted.
 * @param {string} [opts.url] - Stream URL (used for container/codec hints).
 * @param {string} [opts.quality] - Provider's already-extracted quality string, used as a fallback.
 * @param {string[]} [opts.dubKeywords] - Provider-appropriate dub-language keywords for dual-audio detection.
 * @returns {string} The formatted multi-line stream title.
 */
function formatStreamTitle(opts) {
  const {
    title,
    year,
    season,
    episode,
    rawText = '',
    sizeBytes,
    sizeLabel,
    url,
    quality: qualityFallback,
    dubKeywords,
  } = opts || {};

  const combinedText = [rawText, qualityFallback, url].filter(Boolean).join(' ');

  const quality = detectQuality(rawText, qualityFallback) || 'Unknown';
  const size = detectSize({ sizeBytes, sizeLabel, rawText }) || 'Unknown Size';
  const container = detectContainer(combinedText, url) || 'MKV';

  const lines = [];

  // Line 1: title + year/episode - always present.
  const displayTitle = toStr(title).trim() || 'Unknown Title';
  let titleSuffix = '';
  if (season !== undefined && season !== null && episode !== undefined && episode !== null) {
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    titleSuffix = ` - (S${s}E${e})`;
  } else if (year) {
    titleSuffix = ` - (${year})`;
  }
  lines.push(`🎬 ${displayTitle}${titleSuffix}`);

  // Line 2: quality/size/container - always present (derivable for every stream).
  lines.push(`${qualityIcon(quality)} ${quality} | ${size} | 📼 ${container}`);

  // Line 3: HDR/codec - only if we detected at least one of them.
  const hdr = detectHDR(combinedText);
  const codec = detectCodec(combinedText);
  const dv = detectDolbyVision(combinedText);
  if (hdr || codec) {
    const parts = [];
    if (hdr) parts.push(hdr);
    parts.push(codec || 'H.264');
    let line3 = `🌈 ${parts.join(' | ')}`;
    if (dv) line3 += ' | 👁️ DV';
    lines.push(line3);
  } else if (dv) {
    lines.push('🌈 👁️ DV');
  }

  // Line 4: audio type/channels - only if we detected something.
  const audioType = detectAudioType(combinedText, dubKeywords);
  const audioChannels = detectAudioChannels(combinedText);
  if (audioType || audioChannels) {
    const parts = [];
    if (audioType) parts.push(`🔊 ${audioType}`);
    if (audioChannels) parts.push(`🎧 ${audioChannels}`);
    lines.push(parts.join(' | '));
  }

  // Line 5: source (BluRay/WEB-DL) - only if we have some raw text signal.
  const source = detectSource(combinedText);
  if (source) {
    lines.push(`📀 ${source}`);
  }

  return lines.join('\n');
}

module.exports = {
  formatStreamTitle,
  detectQuality,
  qualityIcon,
  detectSize,
  detectContainer,
  detectCodec,
  detectHDR,
  detectDolbyVision,
  detectSource,
  detectAudioType,
  detectAudioChannels,
};
