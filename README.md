# Nuvio Local Scrapers

A collection of local scrapers for the Nuvio streaming application. These scrapers allow you to fetch streams from various sources directly within the app.

## Installation

1. Open Nuvio app
2. Go to Settings → Local Scrapers
3. Add this repository URL:
   ```
   https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/
   ```
4. Enable the scrapers you want to use

## Scraper Development

**💡 Tip:** Check existing scrapers in the `providers/` directory (built) or `src/providers/` (source) for real working examples before starting your own.

### Runtime

Nuvio runs scrapers in a sandboxed **QuickJS** engine (not Hermes/React Native). This means:

- **Native `async`/`await` is fully supported** - write real async functions, no `.then()`/`.catch()` chains required.
- No `console.*` calls in shipped provider code - the app's local cache/logging pipeline is sensitive to log volume and can behave unpredictably (stale cache, slowdowns) when providers log heavily. Do all debugging locally against the built file, then strip every `console.log`/`console.warn`/`console.error` before committing.
- No Node.js built-ins (`fs`, `path`, `crypto`, `Buffer`). Use `fetch()` for HTTP, and hand-rolled JS (or `crypto-js`, provided as an external module) for anything crypto-shaped.
- `WebAssembly` exists only as an inert stub (`instantiate()` returns empty exports) - a provider that depends on executing WASM cannot work in this runtime.

### Build pipeline

Provider source lives in `src/<providerName>/index.js` and is bundled with esbuild into `providers/<providerName>.js`:

```bash
node build.js              # build every provider under src/
node build.js vidrock      # build a single provider
node build.js --watch      # rebuild on change (needs nodemon)
```

Build target is `es2020` (`build.js`) - matches what QuickJS supports natively, so esbuild does not need to downlevel `async`/`await` into generators the way it used to for Hermes.

### Core Function

Export a `getStreams` function - `async function` is the natural shape now, but returning a plain `Promise` still works if you prefer it:

```javascript
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  // Your scraping logic here - real async/await, no Promise-chain gymnastics needed
  // Return an array of stream objects, or [] on any failure (never throw out of getStreams)
  return streams;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
```

**Parameters:**
- `tmdbId` (string|number): TMDB ID (or an `tt`-prefixed IMDb ID - resolve it via TMDB's `/find` endpoint first)
- `mediaType` (string): "movie" or "tv"
- `seasonNum` (number): Season number (TV only)
- `episodeNum` (number): Episode number (TV only)

### Stream Object Format
Each stream must return this shape (see `src/providers/vidrock.js` or `src/moviebox/index.js` for real examples):

```javascript
{
  name: "Vidrock",            // Provider name
  title: "Vidrock 1080p",     // Display title (quality, server, etc.)
  url: "https://stream.url",  // Direct stream URL (m3u8/mp4/mpd)
  quality: "1080p",           // "480p" | "720p" | "1080p" | "4K" | "Auto" | "Unknown"
  size: "1.2 GB",             // Real size when computable, "Unknown" otherwise - never guessed
  headers: HEADERS,           // Headers required for playback (Referer/Origin/User-Agent as needed)
  subtitles: []               // Array of {url, lang} - empty array if none
}
```

**Minimum size filter:** every provider in this repo drops streams under 150MB from its return value (see `meetsMinSize`/equivalent in any `src/providers/*.js` file). Only apply this where you have a real per-stream size - never fabricate one just to pass the filter, and never drop a stream whose size you couldn't determine.

### Headers (When Needed)
Include headers if the stream requires them for playback - check any `src/providers/*.js` file for a real working example:

```javascript
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://example.com/",
  "Origin": "https://example.com"
};
```

### Runtime Compatibility
- **✅ Native `async`/`await`** - QuickJS supports it directly, no transpilation needed
- Use `fetch()` for HTTP requests (no axios) - pass `redirect: "follow"` explicitly, the app's fetch polyfill does not auto-follow redirects otherwise
- Use `cheerio-without-node-native` for HTML parsing
- Avoid Node.js modules (fs, path, crypto, Buffer)
- No `console.*` calls in shipped code

### Testing
Build the provider, then run it directly against the built output:

```bash
node build.js vidrock
node -e "
const { getStreams } = require('./providers/vidrock.js');
getStreams(550, 'movie').then(streams => {
  console.log('Found', streams.length, 'streams');
  streams.forEach(s => console.log(s.name, s.quality, s.size));
}).catch(console.error);
"
```

### Manifest Entry
Add your scraper to `manifest.json` (see existing entries for examples):

```json
{
  "id": "yourscraper",
  "name": "Your Scraper",
  "description": "Brief description of what your scraper does",
  "version": "1.0.0",
  "author": "Your Name",
  "supportedTypes": ["movie", "tv"],
  "filename": "providers/yourscraper.js",
  "enabled": true,
  "formats": ["mkv"],
  "logo": "https://your-logo-url.com/logo.png",
  "contentLanguage": ["en"]
}
```

## Publishing to GitHub

1. **Create a new repository on GitHub:**
   - Go to github.com
   - Click "New repository"
   - Name it `nuvio-local-scrapers`
   - Make it public
   - Don't initialize with README (we already have one)

2. **Upload files:**
   ```bash
   cd /path/to/local-scrapers-repo
   git init
   git add .
   git commit -m "Initial commit with UHD Movies scraper"
   git branch -M main
   git remote add origin https://github.com/sapariyaneel/nuvio-plugin.git
   git push -u origin main
   ```

3. **Get the raw URL:**
   ```
   https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/main/
   ```

## Contributing

### Development Workflow

1. **Fork this repository**
   ```bash
   # Clone your fork
   git clone https://github.com/sapariyaneel/nuvio-plugin.git
   cd nuvio-plugin
   ```

2. **Create a new branch**
   ```bash
   git checkout -b add-newscraper
   ```

3. **Develop your scraper**
   - Create `newscraper.js`
   - Update `manifest.json`
   - Create `test_newscraper.js`
   - Test thoroughly

4. **Test your scraper**
   ```bash
   # Run tests
   node test_newscraper.js
   
   # Test with different content types
   # Verify stream URLs work
   # Check error handling
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add NewScraper with support for movies and TV shows"
   git push origin add-newscraper
   ```

6. **Submit a pull request**
   - Include description of the scraper
   - List supported features
   - Provide test results
   - Mention any limitations

### Code Review Checklist

Before submitting, ensure your scraper:

- [ ] **Follows naming conventions** (camelCase, descriptive names)
- [ ] **Has proper error handling** (try/catch, graceful failures - `getStreams` returns `[]`, never throws)
- [ ] **Has zero `console.*` calls** in the shipped/built file
- [ ] **Is QuickJS compatible** (no Node.js modules, uses native `fetch()`/`async`/`await`)
- [ ] **Has been tested against the built output** (movies and TV, real TMDB IDs)
- [ ] **Updates manifest.json** (correct metadata and version)
- [ ] **Respects rate limits** (reasonable delays between requests)
- [ ] **Handles edge cases** (missing content, network errors)
- [ ] **Returns proper stream objects** (correct format and required fields)
- [ ] **Is well-documented** (comments explaining complex logic)

### Scraper Quality Standards

#### Performance
- Response time < 15 seconds for most requests
- Handles concurrent requests gracefully
- Minimal memory usage
- Efficient DOM parsing

#### Reliability
- Success rate > 80% for popular content
- Graceful degradation when source is unavailable
- Proper timeout handling
- Retry logic for transient failures

#### User Experience
- Clear, descriptive stream titles
- Accurate quality and size information
- Sorted results (highest quality first)
- Consistent naming conventions

### Debugging Tips

Do all debugging locally, against the real built file - never ship a `console.*` call. A `console.log` chain that helps you trace a failure locally is fine to add temporarily, but strip it before the final build/commit.

```bash
node build.js yourscraper
node -e "
const { getStreams } = require('./providers/yourscraper.js');
getStreams(550, 'movie').then(s => console.log(s.length, s));
"
```

If a request or parse step is failing, add a temporary `console.log` at that one point, run the command above, then remove it once you've found the issue - the app's own cache/logging pipeline gets slower and less predictable the more a shipped provider logs, so nothing should reach `providers/`.

#### URL Resolution Issues
```javascript
// Validate URLs before returning
async function validateUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok || response.status === 206; // 206 for partial content
  } catch (error) {
    return false;
  }
}
```

### Real-World Examples

#### UHDMovies Scraper Features
- **Episode-specific extraction** for TV shows
- **Multiple tech domains** (tech.unblockedgames.world, tech.examzculture.in, etc.)
- **SID link resolution** with multi-step form submission
- **Driveleech URL processing** with multiple download methods
- **Quality parsing** with technical details (10-bit, HEVC, HDR)

#### MoviesMod Scraper Features
- **Dynamic domain fetching** from GitHub repository
- **String similarity matching** for content selection
- **Intermediate link resolution** (modrefer.in decoding)
- **Multiple download servers** (Resume Cloud, Worker Bot, Instant Download)
- **Broken link filtering** (report pages, invalid URLs)
- **Parallel processing** of multiple quality options

#### MovieBox Scraper Features
- **Official mobile-app API**, not a browser-scraped web frontend (`api3-api6.aoneroom.com`, `wefeed-mobile-bff`)
- **Guest session bootstrap** - mints a session token via one unauthenticated call, no login required
- **HMAC-MD5 request signing** matching the real Android client's `x-tr-signature`
- **Multi-candidate merge** - queries every plausible search match (not just the top title score) and keeps the best stream per quality across all of them, since the best-quality upload isn't reliably the top text match
- **Real 4K support** - verified genuine (not relabeled) via `ffprobe` reading the actual video container's resolution, not trusting API-reported labels
- See `src/moviebox/index.js` for the full implementation - a good reference for building a provider around a real app API instead of HTML scraping

### Advanced Techniques

#### 1. Multi-Domain Support
```javascript
const TECH_DOMAINS = [
  'tech.unblockedgames.world',
  'tech.examzculture.in',
  'tech.creativeexpressionsblog.com',
  'tech.examdegree.site'
];

function isTechDomain(url) {
  return TECH_DOMAINS.some(domain => url.includes(domain));
}
```

#### 2. Form-Based Authentication
```javascript
async function submitVerificationForm(formUrl, formData) {
  const response = await fetch(formUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': previousUrl
    },
    body: new URLSearchParams(formData).toString()
  });
  return response;
}
```

#### 3. JavaScript Execution Simulation
```javascript
// Extract dynamic values from JavaScript code
function extractFromJavaScript(html) {
  const cookieMatch = html.match(/s_343\('([^']+)',\s*'([^']+)'/);
  const linkMatch = html.match(/c\.setAttribute\("href",\s*"([^"]+)"\)/);
  
  return {
    cookieName: cookieMatch?.[1],
    cookieValue: cookieMatch?.[2],
    linkPath: linkMatch?.[1]
  };
}
```

### Maintenance

#### Updating Existing Scrapers
- Monitor source website changes
- Update selectors and logic as needed
- Test after updates
- Increment version number in manifest

#### Handling Source Changes
- Implement fallback mechanisms
- Use multiple extraction methods
- Add domain rotation support
- Monitor for breaking changes

### Troubleshooting

#### Common Issues

1. **CORS Errors**
   - Use appropriate headers
   - Consider proxy solutions
   - Check source website restrictions

2. **Rate Limiting**
   - Add delays between requests
   - Implement exponential backoff
   - Use different user agents

3. **Captcha/Bot Detection**
   - Rotate user agents
   - Add realistic delays
   - Implement session management

4. **Dynamic Content**
   - Look for API endpoints
   - Parse JavaScript for data
   - Use multiple extraction methods

#### Getting Help

- Check existing scraper implementations
- Reproduce with `node -e` against a real TMDB ID (see Testing section) - no `console.log` in shipped code, so debug locally before removing logging
- Test with different content types
- Ask for help in community discussions

---

## 🧰 Tools & Technologies

<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=javascript,nodejs,github,githubactions&theme=light&perline=4" />
  </a>
</p>

---



## 📄 License

[![GNU GPLv3 Image](https://www.gnu.org/graphics/gplv3-127x51.png)](http://www.gnu.org/licenses/gpl-3.0.en.html)

These scrapers are **free software**: you can use, study, share, and modify them as you wish.

They are distributed under the terms of the [GNU General Public License](https://www.gnu.org/licenses/gpl.html) version 3 or later, published by the Free Software Foundation.

---

## ⚖️ DMCA Disclaimer

We hereby issue this notice to clarify that these scrapers function similarly to a standard web browser by fetching video files from the internet.

- **No content is hosted by this repository or the Nuvio application.**
- Any content accessed is hosted by third-party websites.
- Users are solely responsible for their usage and must comply with their local laws.

If you believe content is violating copyright laws, please contact the **actual file hosts**, **not** the developers of this repository or the Nuvio app.

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check the Nuvio app documentation
- Join the community discussions

---

**Thank You for using Nuvio Local Scrapers!**
