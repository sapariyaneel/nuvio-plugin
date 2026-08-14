// cinejoy.js
// CineJoy (https://cinejoy.to) - TMDB-id-based movie & TV streaming via an encrypted
// RPC channel the site itself calls "lumen-gate-v1" (api.shegu.st).
//
// The site's own bundle (BOqDcafn.js) does ECDH(P-256) with a hardcoded server static
// public key, HKDF-SHA256 to derive per-session AES-256-GCM keys, then wraps every RPC
// call in a 12-stage keyed byte-scrambling pipeline on top of the AES-GCM encryption
// (substitution, permutation, rotation, nibble-swap, mod-256 add, interleave, a Feistel
// round, block permutation, CBC-style chaining - all seeded from the session's derived
// master key via a counter-mode HKDF DRBG). Even the JSON field names in each request
// are per-session randomized, derived the same way.
//
// This was reverse-engineered from the live site (there is no public spec) - see
// reference/cinejoy-research/FINDINGS.md for the full writeup, including a genuine dead
// end that got fixed: the original ask assumed a scrypt proof-of-work challenge, which
// does not exist (confirmed 404 on both endpoints that theory relied on). The real
// blocker turned out to be a single wrong constant - the seeded DRBG's HKDF output
// length was 256 bytes, not 32 - found by patching crypto.subtle.deriveBits on the live
// page and reading the real call parameters directly, since the site's own JS is
// genuinely obfuscated (javascript-obfuscator string-array indirection, not just
// Rocket-Loader-deferred plain JS) and resists further static reading.
//
// This app's runtime (React Native/Hermes) has no crypto.subtle, TextDecoder, or Buffer
// (see vidrock.js's own note on this), so every primitive below - SHA-256, HMAC,
// HKDF, P-256 ECDH, AES-256-GCM - is plain JS, verified byte-exact against Node's
// native crypto during development (see reference/cinejoy-research/test_*.js).

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_CINEJOY_ORIGIN = "https://cinejoy.to";
// The crypto gate itself, not the scrapeable frontend - this is the site's own protocol
// backend (see reference/cinejoy-research/FINDINGS.md), not something that gets
// domain-rotated the way the HTML frontend can; only CINEJOY_ORIGIN rotates via domains.json.
const GATE_ORIGIN = "https://api.shegu.st";
const INFO_PREFIX = "lumen-gate-v1";

const SERVER_STATIC_PUB_B64URL = "BDneWBpzICIVPCtCd8JbpLNxmJiqhCWJaEHar4kp7Yivrp3ZpGS6Rv1rCvDuFrmhnWxUviPpnJhcUJPE-P9Simk";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

async function getCinejoyOrigin() {
  const d = await getDomains();
  return (d.cinejoy || FALLBACK_CINEJOY_ORIGIN).replace(/\/+$/, "");
}

function buildHeaders(cinejoyOrigin) {
  return {
    "User-Agent": USER_AGENT,
    "Origin": cinejoyOrigin,
    "Referer": cinejoyOrigin + "/"
  };
}

// Only servers confirmed to resolve reliably in testing; "servers" lists more (Athens,
// Joy, Castle, Sakura, Canaias) but this keeps the per-title call count reasonable.
const SUPPORTED_SERVERS = ["Lisbon", "Solara"];

// ---------------------------------------------------------------------------
// SHA-256 / HMAC-SHA256 / HKDF (RFC 5869) - verified byte-exact against Node's
// crypto.createHash/createHmac/hkdfSync.
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);

function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

function sha256(bytes) {
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const msgLenBits = bytes.length * 8;
  const withOne = new Uint8Array(bytes.length + 1);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  let totalLen = withOne.length;
  while (totalLen % 64 !== 56) totalLen++;
  const padded = new Uint8Array(totalLen + 8);
  padded.set(withOne);
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(msgLenBits / 0x100000000), false);
  dv.setUint32(padded.length - 4, msgLenBits >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = ((padded[offset+i*4]<<24)|(padded[offset+i*4+1]<<16)|(padded[offset+i*4+2]<<8)|(padded[offset+i*4+3])) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15]>>>3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
  }
  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outDv.setUint32(i*4, h[i], false);
  return out;
}

function concatBytes(...arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

function hmacSha256(key, msg) {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) k = sha256(k);
  if (k.length < blockSize) { const p = new Uint8Array(blockSize); p.set(k); k = p; }
  const opad = new Uint8Array(blockSize), ipad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) { opad[i] = k[i] ^ 0x5c; ipad[i] = k[i] ^ 0x36; }
  const inner = sha256(concatBytes(ipad, msg));
  return sha256(concatBytes(opad, inner));
}

function hkdf(ikm, salt, info, length) {
  const saltBytes = salt.length === 0 ? new Uint8Array(32) : salt;
  const prk = hmacSha256(saltBytes, ikm);
  let t = new Uint8Array(0), okm = new Uint8Array(0), counter = 1;
  while (okm.length < length) {
    t = hmacSha256(prk, concatBytes(t, info, new Uint8Array([counter])));
    okm = concatBytes(okm, t);
    counter++;
  }
  return okm.slice(0, length);
}

// ---------------------------------------------------------------------------
// P-256 (secp256r1) elliptic curve point arithmetic, for ECDH.
//
// Deliberately NOT using native BigInt: this repo's own build.js targets es2016
// specifically "to transpile async/await to generators for Hermes" (React Native's
// JS engine on older app builds), and BigInt literals/arithmetic have no es2016
// downlevel form - esbuild hard-errors trying to transpile them, and even if it
// didn't, older Hermes has no BigInt support to fall back on at runtime. A first
// version of this file used BigInt and passed every local Node test (Node has full
// BigInt support) while being silently unloadable in the actual app - confirmed
// only after it shipped and returned zero streams everywhere, including "test
// provider". This version uses a 17-limb, 16-bit-per-limb bignum representation.
//
// Limb size matters: schoolbook multiplication accumulates up to NUM_LIMBS partial
// products into a single wide-array slot before any carry propagation runs. Each
// product of two b-bit limbs is up to 2^(2b), so NUM_LIMBS*2^(2b) must stay under
// 2^53 (the largest exactly-representable integer as a JS double) or the sum
// itself is already wrong before any reduction logic even runs. A first attempt
// at this used 30-bit limbs (9 limbs for 270 bits) on the reasoning that a single
// product fits in a double - true, but the *sum* of 9 such products is ~2^63.2,
// far past 2^53, corrupting every multiply silently (caught by cross-checking
// intermediate values against BigInt in a throwaway test script - Gx^2 mod P
// didn't match). 16-bit limbs keep 17*2^32 ~= 2^36.1, comfortably exact.
//
// Verified against Node's crypto.createECDH('prime256v1') in both directions
// after this fix (same cross-check test used to catch the 30-bit version's bug).
// ---------------------------------------------------------------------------

const LIMB_BITS = 16;
const LIMB_MASK = (1 << LIMB_BITS) - 1; // 0xffff
const NUM_LIMBS = 17; // 17 * 16 = 272 bits, comfortably covers the 256-bit field

function bnFromHex(hex) {
  // Parse a big-endian hex string into little-endian 30-bit limbs by repeated
  // divmod on a byte array - avoids any native big-integer type entirely.
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  const limbs = new Array(NUM_LIMBS).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    // limbs = limbs * 256 + bytes[i], carried across 30-bit limbs
    let carry = bytes[i];
    for (let j = 0; j < NUM_LIMBS; j++) {
      const v = limbs[j] * 256 + carry;
      limbs[j] = v & LIMB_MASK;
      carry = Math.floor(v / (LIMB_MASK + 1));
    }
  }
  return limbs;
}

function bnFromBytes(bytes) {
  const limbs = new Array(NUM_LIMBS).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < NUM_LIMBS; j++) {
      const v = limbs[j] * 256 + carry;
      limbs[j] = v & LIMB_MASK;
      carry = Math.floor(v / (LIMB_MASK + 1));
    }
  }
  return limbs;
}

function bnToBytes(a, len) {
  // Repeated divmod by 256 to extract bytes, little-endian order, then reverse.
  const limbs = a.slice();
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) {
    let rem = 0;
    for (let j = NUM_LIMBS - 1; j >= 0; j--) {
      const cur = rem * (LIMB_MASK + 1) + limbs[j];
      limbs[j] = Math.floor(cur / 256);
      rem = cur % 256;
    }
    out[i] = rem;
  }
  return out;
}

function bnIsZero(a) { for (let i = 0; i < NUM_LIMBS; i++) if (a[i] !== 0) return false; return true; }

function bnCompare(a, b) {
  for (let i = NUM_LIMBS - 1; i >= 0; i--) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function bnAddRaw(a, b) {
  const out = new Array(NUM_LIMBS);
  let carry = 0;
  for (let i = 0; i < NUM_LIMBS; i++) {
    const v = a[i] + b[i] + carry;
    out[i] = v & LIMB_MASK;
    carry = v >>> LIMB_BITS;
  }
  return { limbs: out, carry };
}

function bnSubRaw(a, b) {
  const out = new Array(NUM_LIMBS);
  let borrow = 0;
  for (let i = 0; i < NUM_LIMBS; i++) {
    let v = a[i] - b[i] - borrow;
    if (v < 0) { v += LIMB_MASK + 1; borrow = 1; } else { borrow = 0; }
    out[i] = v;
  }
  return { limbs: out, borrow };
}

function bnMod(a, m) {
  // a is assumed non-negative (as a limb array there's no sign), reduce mod m by
  // repeated subtraction guided by comparison - fine here since every caller keeps
  // operands within a small multiple of m (at most one extra subtraction needed
  // after an add, or the modmul reduction below), never doing full long division.
  let r = a.slice();
  while (bnCompare(r, m) >= 0) r = bnSubRaw(r, m).limbs;
  return r;
}

function bnAddMod(a, b, m) {
  const { limbs } = bnAddRaw(a, b);
  return bnMod(limbs, m);
}

function bnSubMod(a, b, m) {
  if (bnCompare(a, b) >= 0) return bnSubRaw(a, b).limbs;
  const { limbs } = bnAddRaw(a, bnSubRaw(m, b).limbs);
  return bnMod(limbs, m);
}

function bnMulMod(a, b, m) {
  // Schoolbook multiply into a double-width limb array, then reduce mod m via
  // repeated double-and-subtract (binary long division) - every intermediate
  // product of two 30-bit limbs fits exactly in a JS double (max ~2^60), and the
  // accumulation into a wider array keeps each slot well under 2^53 between
  // normalization passes.
  const wide = new Array(NUM_LIMBS * 2).fill(0);
  for (let i = 0; i < NUM_LIMBS; i++) {
    for (let j = 0; j < NUM_LIMBS; j++) {
      wide[i + j] += a[i] * b[j];
    }
  }
  // Normalize carries across the wide array.
  for (let i = 0; i < wide.length - 1; i++) {
    const carry = Math.floor(wide[i] / (LIMB_MASK + 1));
    wide[i] &= LIMB_MASK;
    wide[i + 1] += carry;
  }
  // Reduce mod m: process from the top bit down, doubling the modulus-aligned
  // remainder and subtracting when it fits - standard binary long division,
  // operating on a bit-length safely bounded by NUM_LIMBS*LIMB_BITS.
  let remainder = new Array(NUM_LIMBS).fill(0);
  for (let limbIdx = wide.length - 1; limbIdx >= 0; limbIdx--) {
    for (let bit = LIMB_BITS - 1; bit >= 0; bit--) {
      // remainder = remainder*2 + next bit of wide
      let carry = (wide[limbIdx] >>> bit) & 1;
      for (let k = 0; k < NUM_LIMBS; k++) {
        const v = remainder[k] * 2 + carry;
        remainder[k] = v & LIMB_MASK;
        carry = v >>> LIMB_BITS;
      }
      if (bnCompare(remainder, m) >= 0) remainder = bnSubRaw(remainder, m).limbs;
    }
  }
  return remainder;
}

function bnModInverse(a, m) {
  // Extended Euclidean algorithm, entirely in terms of add/sub/compare on limb
  // arrays plus a bnMulMod-free step count via repeated halving - implemented as
  // the binary (Stein's) extended GCD so no division primitive is needed at all.
  let u = bnMod(a, m), v = m.slice();
  let x1 = [1, ...new Array(NUM_LIMBS - 1).fill(0)], x2 = new Array(NUM_LIMBS).fill(0);
  const isEven = (n) => (n[0] & 1) === 0;
  const halveModM = (n) => {
    // n is even; divide by 2, then if the *original odd-adjustment* needs it, no
    // extra step is required since n is guaranteed even here.
    const out = new Array(NUM_LIMBS);
    let carry = 0;
    for (let i = NUM_LIMBS - 1; i >= 0; i--) {
      const cur = carry * (LIMB_MASK + 1) + n[i];
      out[i] = cur >>> 1;
      carry = cur & 1;
    }
    return out;
  };
  const halveWithAdjust = (n, adjust) => {
    // divide (possibly odd) n by 2 mod m: if n is odd, add m first (keeps parity
    // correct since m - the P-256 prime and order - are both odd).
    let t = n;
    if (!isEven(t)) t = bnAddRaw(t, adjust).limbs;
    return halveModM(t);
  };

  while (!bnIsZero(u)) {
    while (isEven(u)) {
      u = halveModM(u);
      x1 = halveWithAdjust(x1, m);
    }
    while (isEven(v)) {
      v = halveModM(v);
      x2 = halveWithAdjust(x2, m);
    }
    if (bnCompare(u, v) >= 0) {
      u = bnSubRaw(u, v).limbs;
      x1 = bnSubMod(x1, x2, m);
    } else {
      v = bnSubRaw(v, u).limbs;
      x2 = bnSubMod(x2, x1, m);
    }
  }
  return bnMod(x2, m);
}

const EC_P = bnFromHex("ffffffff00000001000000000000000000000000ffffffffffffffffffffffff");
const EC_A = bnSubMod(EC_P, [3, ...new Array(NUM_LIMBS - 1).fill(0)], EC_P);
const EC_B = bnFromHex("5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");
const EC_Gx = bnFromHex("6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296");
const EC_Gy = bnFromHex("4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5");
const EC_N = bnFromHex("ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
const BN_ZERO = new Array(NUM_LIMBS).fill(0);
const BN_TWO = [2, ...new Array(NUM_LIMBS - 1).fill(0)];
const BN_THREE = [3, ...new Array(NUM_LIMBS - 1).fill(0)];

// Plain affine point add/double (one bnModInverse per point operation). A
// Jacobian-projective rewrite was tried here to cut the number of modular
// inverses (the classic reason to prefer Jacobian coordinates), but measurement
// showed it made things WORSE for this specific bnModInverse implementation:
// Stein's binary GCD algorithm (used below) only costs ~3.75x one bnMulMod call
// here (measured: ~0.058ms vs ~0.015ms), nowhere near the "~50 multiplications"
// that would make trading one inverse for several extra multiplications a good
// deal - Jacobian's ~10-16 extra multiplications per point op outweighed the
// inverses it saved, measuring ~92ms/scalar-mult versus affine's ~55ms. Keeping
// the simpler, faster, already-Node-cross-checked affine version.
function ecPointDouble(pt) {
  if (pt === null) return null;
  const { x, y } = pt;
  if (bnIsZero(y)) return null;
  const xx = bnMulMod(x, x, EC_P);
  const num = bnAddMod(bnMulMod(BN_THREE, xx, EC_P), EC_A, EC_P);
  const den = bnModInverse(bnMulMod(BN_TWO, y, EC_P), EC_P);
  const lam = bnMulMod(num, den, EC_P);
  const x3 = bnSubMod(bnSubMod(bnMulMod(lam, lam, EC_P), x, EC_P), x, EC_P);
  const y3 = bnSubMod(bnMulMod(lam, bnSubMod(x, x3, EC_P), EC_P), y, EC_P);
  return { x: x3, y: y3 };
}

function ecPointAdd(p1, p2) {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  if (bnCompare(p1.x, p2.x) === 0) {
    if (bnIsZero(bnAddMod(p1.y, p2.y, EC_P))) return null;
    return ecPointDouble(p1);
  }
  const num = bnSubMod(p2.y, p1.y, EC_P);
  const den = bnModInverse(bnSubMod(p2.x, p1.x, EC_P), EC_P);
  const lam = bnMulMod(num, den, EC_P);
  const x3 = bnSubMod(bnSubMod(bnMulMod(lam, lam, EC_P), p1.x, EC_P), p2.x, EC_P);
  const y3 = bnSubMod(bnMulMod(lam, bnSubMod(p1.x, x3, EC_P), EC_P), p1.y, EC_P);
  return { x: x3, y: y3 };
}

function ecScalarMult(k, pt) {
  let result = null, addend = pt;
  for (let limbIdx = 0; limbIdx < NUM_LIMBS; limbIdx++) {
    let limb = k[limbIdx];
    for (let bit = 0; bit < LIMB_BITS; bit++) {
      if (limb & 1) result = ecPointAdd(result, addend);
      addend = ecPointDouble(addend);
      limb >>>= 1;
    }
  }
  return result;
}

function ecRandomPrivateKey(randomBytesFn) {
  let k;
  do { k = bnMod(bnFromBytes(randomBytesFn(32)), EC_N); } while (bnIsZero(k));
  return k;
}

function ecGetPublicKey(privateKey) { return ecScalarMult(privateKey, { x: EC_Gx, y: EC_Gy }); }

function ecEncodePoint(pt) {
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(bnToBytes(pt.x, 32), 1);
  out.set(bnToBytes(pt.y, 32), 33);
  return out;
}

function ecDecodePoint(bytes) {
  if (bytes.length !== 65 || bytes[0] !== 0x04) throw new Error("invalid P-256 point encoding");
  return { x: bnFromBytes(bytes.slice(1, 33)), y: bnFromBytes(bytes.slice(33, 65)) };
}

function ecDeriveSharedSecret(privateKey, publicPoint) {
  return bnToBytes(ecScalarMult(privateKey, publicPoint).x, 32);
}

// ---------------------------------------------------------------------------
// AES-256-GCM (full encrypt-with-tag + decrypt-with-verify).
// Verified against Node's crypto.createCipheriv('aes-256-gcm', ...).
// ---------------------------------------------------------------------------

const AES_SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);
const AES_RCON = new Uint8Array([0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,0x6c,0xd8,0xab,0x4d]);

function aesGmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p & 0xff;
}

function aesKeyExpansion256(key) {
  const Nk = 8, Nr = 14;
  const w = new Uint8Array(4 * 4 * (Nr + 1));
  w.set(key, 0);
  let bytesGenerated = 32, rconIdx = 0;
  const temp = new Uint8Array(4);
  while (bytesGenerated < w.length) {
    temp.set(w.subarray(bytesGenerated - 4, bytesGenerated));
    if (bytesGenerated % 32 === 0) {
      const t0 = temp[0]; temp[0] = temp[1]; temp[1] = temp[2]; temp[2] = temp[3]; temp[3] = t0;
      for (let i = 0; i < 4; i++) temp[i] = AES_SBOX[temp[i]];
      temp[0] ^= AES_RCON[rconIdx++];
    } else if (bytesGenerated % 32 === 16) {
      for (let i = 0; i < 4; i++) temp[i] = AES_SBOX[temp[i]];
    }
    for (let i = 0; i < 4; i++) w[bytesGenerated + i] = w[bytesGenerated - 32 + i] ^ temp[i];
    bytesGenerated += 4;
  }
  return w;
}

function aesAddRoundKey(state, w, round) { for (let i = 0; i < 16; i++) state[i] ^= w[round * 16 + i]; }
function aesSubBytes(state) { for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]]; }
function aesShiftRows(state) {
  const t = state.slice();
  for (let row = 1; row < 4; row++) for (let col = 0; col < 4; col++) state[col*4+row] = t[((col+row)%4)*4+row];
}
function aesMixColumns(state) {
  for (let c = 0; c < 4; c++) {
    const a0=state[c*4],a1=state[c*4+1],a2=state[c*4+2],a3=state[c*4+3];
    state[c*4]   = aesGmul(a0,2) ^ aesGmul(a1,3) ^ a2 ^ a3;
    state[c*4+1] = a0 ^ aesGmul(a1,2) ^ aesGmul(a2,3) ^ a3;
    state[c*4+2] = a0 ^ a1 ^ aesGmul(a2,2) ^ aesGmul(a3,3);
    state[c*4+3] = aesGmul(a0,3) ^ a1 ^ a2 ^ aesGmul(a3,2);
  }
}
function aes256EncryptBlock(block16, roundKeys) {
  const state = block16.slice();
  aesAddRoundKey(state, roundKeys, 0);
  for (let round = 1; round <= 13; round++) { aesSubBytes(state); aesShiftRows(state); aesMixColumns(state); aesAddRoundKey(state, roundKeys, round); }
  aesSubBytes(state); aesShiftRows(state); aesAddRoundKey(state, roundKeys, 14);
  return state;
}

function ghashMul(x, y) {
  let z = new Uint8Array(16), v = y.slice();
  for (let i = 0; i < 128; i++) {
    const byteIdx = i >> 3, bitIdx = 7 - (i & 7);
    if (x[byteIdx] & (1 << bitIdx)) for (let j = 0; j < 16; j++) z[j] ^= v[j];
    const lsb = v[15] & 1;
    for (let j = 15; j > 0; j--) v[j] = ((v[j] >> 1) | ((v[j-1] & 1) << 7)) & 0xff;
    v[0] = v[0] >> 1;
    if (lsb) v[0] ^= 0xe1;
  }
  return z;
}

function ghash(H, aad, ciphertext) {
  const blocks = [];
  for (let i = 0; i < aad.length; i += 16) { const b = new Uint8Array(16); b.set(aad.subarray(i, Math.min(i+16, aad.length))); blocks.push(b); }
  for (let i = 0; i < ciphertext.length; i += 16) { const b = new Uint8Array(16); b.set(ciphertext.subarray(i, Math.min(i+16, ciphertext.length))); blocks.push(b); }
  const lenBlock = new Uint8Array(16);
  const dv = new DataView(lenBlock.buffer);
  // bit-length = byte-length * 8, as two 32-bit big-endian halves. Payloads here
  // are always far under 2^29 bytes, so the high 32-bit half is always 0 - no
  // BigInt needed for a 64-bit value that never actually exceeds 32 bits in
  // practice (see the P-256 comment above for why BigInt is avoided at all).
  const aadBits = aad.length * 8, ctBits = ciphertext.length * 8;
  dv.setUint32(0, 0, false);
  dv.setUint32(4, aadBits >>> 0, false);
  dv.setUint32(8, 0, false);
  dv.setUint32(12, ctBits >>> 0, false);
  blocks.push(lenBlock);
  let y = new Uint8Array(16);
  for (const block of blocks) {
    const xored = new Uint8Array(16);
    for (let i = 0; i < 16; i++) xored[i] = y[i] ^ block[i];
    y = ghashMul(xored, H);
  }
  return y;
}

function gcmIncrementCounter(counterBlock) {
  const out = counterBlock.slice();
  for (let i = 15; i >= 12; i--) { out[i] = (out[i] + 1) & 0xff; if (out[i] !== 0) break; }
  return out;
}

function gcmGctr(roundKeys, icb, data) {
  const out = new Uint8Array(data.length);
  let counter = icb.slice();
  for (let offset = 0; offset < data.length; offset += 16) {
    const keystream = aes256EncryptBlock(counter, roundKeys);
    const chunkLen = Math.min(16, data.length - offset);
    for (let i = 0; i < chunkLen; i++) out[offset+i] = data[offset+i] ^ keystream[i];
    counter = gcmIncrementCounter(counter);
  }
  return out;
}

function gcmBuildJ0(iv) {
  const j0 = new Uint8Array(16);
  j0.set(iv, 0);
  j0[15] = 1;
  return j0;
}

function aes256GcmEncrypt(key, iv, plaintext, aad) {
  const roundKeys = aesKeyExpansion256(key);
  const H = aes256EncryptBlock(new Uint8Array(16), roundKeys);
  const J0 = gcmBuildJ0(iv);
  const ciphertext = gcmGctr(roundKeys, gcmIncrementCounter(J0), plaintext);
  const S = ghash(H, aad, ciphertext);
  const tag = gcmGctr(roundKeys, J0, S);
  const out = new Uint8Array(ciphertext.length + 16);
  out.set(ciphertext, 0);
  out.set(tag, ciphertext.length);
  return out;
}

function aes256GcmDecrypt(key, iv, ciphertextAndTag, aad) {
  const roundKeys = aesKeyExpansion256(key);
  const H = aes256EncryptBlock(new Uint8Array(16), roundKeys);
  const J0 = gcmBuildJ0(iv);
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
  const receivedTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
  const S = ghash(H, aad, ciphertext);
  const expectedTag = gcmGctr(roundKeys, J0, S);
  let tagMatch = true;
  for (let i = 0; i < 16; i++) if (expectedTag[i] !== receivedTag[i]) tagMatch = false;
  const plaintext = gcmGctr(roundKeys, gcmIncrementCounter(J0), ciphertext);
  return { plaintext, tagMatch };
}

// ---------------------------------------------------------------------------
// "lumen-gate-v1" protocol: handshake, 12-op transform pipeline, RPC, resolve.
// ---------------------------------------------------------------------------

function utf8(s) { return new TextEncoder().encode(s); }
function infoStr(...parts) { return utf8(INFO_PREFIX + "|" + parts.join("|")); }

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesToHex(bytes) {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}
function randomBytes(n) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

// Seeded DRBG (counter-mode HKDF), matching the site's own class for regenerating the
// 12-stage transform plan deterministically from the shared session master key.
class SeededDrbg {
  constructor(seed) { this.seed = seed; this.buf = new Uint8Array(0); this.pos = 0; this.counter = 0; }
  refill() {
    const ctrBytes = new Uint8Array(4);
    new DataView(ctrBytes.buffer).setUint32(0, this.counter++, false);
    // 256, not 32 - this was the actual bug that blocked every RPC call. Confirmed
    // against the live site by patching crypto.subtle.deriveBits and reading the real
    // call: HKDF(seed, ctrBytes, "lumen-gate-v1|drbg", 256).
    this.buf = hkdf(this.seed, ctrBytes, infoStr("drbg"), 256);
    this.pos = 0;
  }
  bytes(n) {
    const out = new Uint8Array(n);
    let filled = 0;
    while (filled < n) {
      if (this.pos >= this.buf.length) this.refill();
      const take = Math.min(n - filled, this.buf.length - this.pos);
      out.set(this.buf.subarray(this.pos, this.pos + take), filled);
      this.pos += take; filled += take;
    }
    return out;
  }
  int(max) {
    if (max <= 1) return 0;
    const limit = Math.floor(256 / max) * max;
    for (;;) { const b = this.bytes(1)[0]; if (b < limit) return b % max; }
  }
  permutation(n) {
    const arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) arr[i] = i;
    for (let i = n - 1; i > 0; i--) { const j = this.int(i + 1); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
}

function invertSbox(sbox) {
  const inv = new Uint8Array(sbox.length);
  for (let i = 0; i < sbox.length; i++) inv[sbox[i]] = i;
  return inv;
}

// The 12-op transform pipeline (m0 = [U0,Y0,$0,xx,cx,Wx,_x,ax,ox,ex] in the site's bundle).
function opXor(a, W) { const out = new Uint8Array(a.length); for (let i=0;i<a.length;i++) out[i] = a[i] ^ W.ks[i % W.ks.length]; return out; }
function opSbox(a, W, fwd) { const t = fwd ? W.sbox : W.sboxInv; const out = new Uint8Array(a.length); for (let i=0;i<a.length;i++) out[i]=t[a[i]]; return out; }
function opReverse(a) { const out = new Uint8Array(a.length); for (let i=0;i<a.length;i++) out[i]=a[a.length-1-i]; return out; }
function opRotate(a, W, fwd) { const rot = fwd ? W.rot : (8-W.rot); const out = new Uint8Array(a.length); for (let i=0;i<a.length;i++) out[i]=((a[i]<<rot)|(a[i]>>>(8-rot)))&0xff; return out; }
function opNibbleMask(a, W, fwd) {
  const out = new Uint8Array(a.length);
  for (let i=0;i<a.length;i++) {
    const t = (i*W.maskStep) & 255;
    if (fwd) { const sw=((a[i]<<4)|(a[i]>>>4))&255; out[i]=sw^t; }
    else { const x=a[i]^t; out[i]=((x<<4)|(x>>>4))&255; }
  }
  return out;
}
function opAddMod(a, W, fwd) { const out = new Uint8Array(a.length); for (let i=0;i<a.length;i++){ const f=(W.addBase+i*W.addStep)&255; out[i]=fwd?(a[i]+f)&255:(a[i]-f)&255; } return out; }
function opInterleave(a, W, fwd) {
  const d = a.length, half = d>>1, out = new Uint8Array(d);
  let b = 0;
  if (fwd) { for (let n=0;n<half;n++){ out[b++]=a[n]; out[b++]=a[half+n]; } }
  else { for (let n=0;n<half;n++){ out[n]=a[b++]; out[half+n]=a[b++]; } }
  if (d & 1) out[d-1] = a[d-1];
  return out;
}
function feistelRound(a, roundKey) {
  const out = new Uint8Array(a.length);
  for (let i=0;i<a.length;i++) out[i] = ((a[i]+roundKey[i%roundKey.length])&0xff) ^ roundKey[(i*3+1)%roundKey.length];
  return out;
}
function concat3(a, b, c) {
  const out = new Uint8Array((a?a.length:0)+(b?b.length:0)+(c?c.length:0));
  let off = 0;
  if (a) { out.set(a, off); off += a.length; }
  if (b) { out.set(b, off); off += b.length; }
  if (c) { out.set(c, off); off += c.length; }
  return out;
}
function opFeistel(a, W, fwd) {
  const d = a.length;
  if (d < 2) return a.slice();
  const half = d >> 1;
  const rest = a.subarray(half * 2);
  if (fwd) {
    const L=a.subarray(0,half), R=a.subarray(half,half*2);
    const f=feistelRound(R,W.round);
    const newL=new Uint8Array(half);
    for (let i=0;i<half;i++) newL[i]=L[i]^f[i];
    return concat3(R,newL,rest);
  } else {
    const R=a.subarray(0,half), newL=a.subarray(half,half*2);
    const f=feistelRound(R,W.round);
    const L=new Uint8Array(half);
    for (let i=0;i<half;i++) L[i]=newL[i]^f[i];
    return concat3(L,R,rest);
  }
}
function opBlockPerm(a, W, fwd) {
  const d = W.blockSize, out = new Uint8Array(a.length), full = a.length - (a.length % d);
  for (let b=0;b<full;b+=d) for (let n=0;n<d;n++) { if (fwd) out[b+W.blockPerm[n]]=a[b+n]; else out[b+n]=a[b+W.blockPerm[n]]; }
  for (let b=full;b<a.length;b++) out[b]=a[b];
  return out;
}
function opCbcChain(a, W, fwd) {
  const out = new Uint8Array(a.length);
  let prev = W.chainIV & 0xff;
  for (let i=0;i<a.length;i++) { out[i]=(a[i]^prev)&255; prev = fwd ? out[i] : a[i]; }
  return out;
}

const TRANSFORM_OPS = [opXor, opSbox, opReverse, opRotate, opNibbleMask, opAddMod, opInterleave, opFeistel, opBlockPerm, opCbcChain];

function applyOp(idx, data, params, forward) {
  return TRANSFORM_OPS[idx](data, params, forward);
}
function transformForward(data, stages) { let c = data; for (const s of stages) c = applyOp(s.op, c, s.params, true); return c; }
function transformReverse(data, stages) { let c = data; for (let i = stages.length - 1; i >= 0; i--) c = applyOp(stages[i].op, c, stages[i].params, false); return c; }

function generateStages(masterKey) {
  const seed = hkdf(masterKey, new Uint8Array(0), infoStr("pipeline"), 32);
  const drbg = new SeededDrbg(seed);
  const stages = [];
  for (let i = 0; i < 12; i++) {
    const op = drbg.int(10);
    const sbox = drbg.permutation(256);
    const blockSize = 4 + drbg.int(13);
    const blockPerm = drbg.permutation(blockSize);
    stages.push({
      op,
      params: {
        ks: drbg.bytes(64),
        sbox, sboxInv: invertSbox(sbox),
        rot: 1 + drbg.int(7),
        maskStep: 1 + drbg.int(255),
        addBase: drbg.int(256),
        addStep: 1 + drbg.int(255),
        round: drbg.bytes(32),
        blockSize, blockPerm,
        chainIV: drbg.int(256)
      }
    });
  }
  return stages;
}

function generateSchema(masterKey) {
  const raw = hkdf(masterKey, new Uint8Array(0), infoStr("schema"), 48);
  const hex = bytesToHex(raw);
  return {
    payload: "p_" + hex.slice(0, 8),
    nonce: "n_" + hex.slice(8, 16),
    seq: "s_" + hex.slice(16, 24),
    session: "i_" + hex.slice(24, 32),
    fragment: "f_" + hex.slice(32, 40),
    continuation: "c_" + hex.slice(40, 48),
    path: hex.slice(48, 64)
  };
}

async function performHandshake() {
  const cinejoyOrigin = await getCinejoyOrigin();
  const headers = buildHeaders(cinejoyOrigin);

  const priv = ecRandomPrivateKey(randomBytes);
  const pub = ecGetPublicKey(priv);
  const ephPubBytes = ecEncodePoint(pub);

  const serverStaticPub = ecDecodePoint(b64urlToBytes(SERVER_STATIC_PUB_B64URL));
  const sharedWithStatic = ecDeriveSharedSecret(priv, serverStaticPub);
  const kEs = hkdf(sharedWithStatic, ephPubBytes, infoStr("es"), 32);

  const helloPayload = utf8(JSON.stringify({ v: 1, t: Date.now(), fp: { headless: true }, r: bytesToB64url(randomBytes(16)) }));
  const iv = randomBytes(12);
  const encryptedHello = aes256GcmEncrypt(kEs, iv, helloPayload, infoStr("hello"));
  const wire = concatBytes(ephPubBytes, iv, encryptedHello);

  // Send a real ArrayBuffer, not a Uint8Array view - the app's fetch polyfill is
  // custom (see TROUBLESHOOTING.md's own note on this) and no other provider in
  // this repo sends a raw typed-array body, so this path was never exercised
  // before. A typed-array view can get mis-serialized by a polyfill that only
  // handles strings/ArrayBuffer/Blob bodies (e.g. falling through to a
  // JSON/toString path that turns the bytes into garbage), producing a
  // malformed request the server correctly rejects - confirmed via a live
  // webhook.site trace showing "handshake HTTP 404" in the real app while the
  // exact same code succeeds every time from plain Node.
  const wireBuffer = wire.buffer.slice(wire.byteOffset, wire.byteOffset + wire.byteLength);
  const resp = await fetch(GATE_ORIGIN + "/h", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/octet-stream" },
    body: wireBuffer,
    skipSizeCheck: true
  });
  if (!resp.ok) throw new Error("handshake HTTP " + resp.status);
  const respBytes = new Uint8Array(await resp.arrayBuffer());
  if (respBytes.length < 65 + 12 + 16) throw new Error("malformed handshake response");

  const serverEphPubBytes = respBytes.subarray(0, 65);
  const respIv = respBytes.subarray(65, 77);
  const respCiphertext = respBytes.subarray(77);

  const serverEphPub = ecDecodePoint(serverEphPubBytes);
  const sharedEE = ecDeriveSharedSecret(priv, serverEphPub);
  const ee = hkdf(sharedEE, serverEphPubBytes, infoStr("ee"), 32);

  const { plaintext: acceptPlain, tagMatch } = aes256GcmDecrypt(ee, respIv, respCiphertext, infoStr("accept"));
  if (!tagMatch) throw new Error("handshake response tag mismatch");
  const accept = JSON.parse(new TextDecoder().decode(acceptPlain));
  const sid = accept.sid;

  const master = hkdf(concatBytes(kEs, ee), b64urlToBytes(sid), infoStr("master"), 32);

  return {
    id: sid,
    master,
    stages: generateStages(master),
    schema: generateSchema(master),
    c2sKey: hkdf(master, new Uint8Array(0), infoStr("c2s"), 32),
    s2cKey: hkdf(master, new Uint8Array(0), infoStr("s2c"), 32),
    seq: 0,
    seenSeq: 0,
    cinejoyOrigin,
    headers
  };
}

async function gateCall(session, path, payload) {
  const seq = ++session.seq;
  const plain = utf8(JSON.stringify({ path, payload: payload ?? null }));
  const scrambled = transformForward(plain, session.stages);
  const iv = randomBytes(12);
  const aad = infoStr("c2s", session.id, String(seq));
  const encrypted = aes256GcmEncrypt(session.c2sKey, iv, scrambled, aad);
  const b = session.schema;
  const reqBody = {
    [b.session]: session.id,
    [b.seq]: seq,
    [b.nonce]: bytesToB64url(iv),
    [b.payload]: bytesToB64url(encrypted)
  };

  const resp = await fetch(GATE_ORIGIN + "/g/" + session.schema.path, {
    method: "POST",
    headers: { ...session.headers, "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
    skipSizeCheck: true
  });
  if (!resp.ok) throw new Error("gate call HTTP " + resp.status);
  const respJson = await resp.json();

  const e = session.schema;
  const respSeq = respJson[e.seq];
  if (typeof respSeq !== "number" || respSeq <= session.seenSeq) throw new Error("rejected: bad seq");
  session.seenSeq = respSeq;
  const respIv = b64urlToBytes(String(respJson[e.nonce]));
  const respCiphertext = b64urlToBytes(String(respJson[e.payload]));
  const respAad = infoStr("s2c", session.id, String(respSeq));
  const { plaintext, tagMatch } = aes256GcmDecrypt(session.s2cKey, respIv, respCiphertext, respAad);
  if (!tagMatch) throw new Error("response tag mismatch");
  const descrambled = transformReverse(plaintext, session.stages);
  return JSON.parse(new TextDecoder().decode(descrambled));
}

async function gateResolve(session, id) {
  const begin = await gateCall(session, "/resolve/begin", { id });
  const fragmentCount = begin.fragmentCount;
  if (typeof fragmentCount !== "number" || fragmentCount < 1 || fragmentCount > 16) {
    throw new Error("bad fragment plan");
  }
  const e = session.schema;
  const fragments = [];
  let cont = null;
  for (let idx = 0; idx < fragmentCount; idx++) {
    const r = await gateCall(session, "/resolve/fragment", { id, index: idx, cont });
    fragments.push(b64urlToBytes(r[e.fragment]));
    cont = r[e.continuation];
  }
  const combined = concatBytes(...fragments);
  const contentKey = hkdf(combined, session.master, infoStr("content"), 32);
  const finish = await gateCall(session, "/resolve/finish", { id, cont });
  const finishBytes = b64urlToBytes(finish[e.payload]);
  const finishIv = finishBytes.subarray(0, 12);
  const finishCiphertext = finishBytes.subarray(12);
  const { plaintext, tagMatch } = aes256GcmDecrypt(contentKey, finishIv, finishCiphertext, infoStr("content"));
  if (!tagMatch) throw new Error("resolve finish tag mismatch");
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function buildResolveId(server, mediaType, params) {
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const qs = sorted.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  const path = "/" + server + "/" + mediaType;
  return qs ? path + "?" + qs : path;
}

// ---------------------------------------------------------------------------
// Provider entry point
// ---------------------------------------------------------------------------

async function fetchMetadata(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT }, skipSizeCheck: true, redirect: "follow" });
  return resp.json();
}

function extractStreamsFromResolveResult(result, server, cinejoyOrigin) {
  const streams = [];
  const items = result && result.data && Array.isArray(result.data.stream) ? result.data.stream : [];
  for (const item of items) {
    const url = item.playlist || item.url;
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) continue;
    const isHls = item.type === "hls" || /\.m3u8(?:$|[?#])/i.test(url);
    const subtitles = Array.isArray(item.captions)
      ? item.captions
          .filter(c => c && c.url)
          .map((c, i) => ({
            url: c.url,
            name: c.label || c.language || `Subtitle ${i + 1}`,
            label: c.label || c.language || `Subtitle ${i + 1}`,
            language: (c.language || "und").toLowerCase(),
            lang: (c.language || "und").toLowerCase()
          }))
      : [];
    streams.push({
      name: `CineJoy - ${server}`,
      title: `CineJoy • ${server}`,
      url,
      quality: "Auto",
      type: isHls ? "hls" : "mp4",
      provider: "cinejoy",
      headers: { Referer: cinejoyOrigin + "/", "User-Agent": USER_AGENT },
      subtitles
    });
  }
  return streams;
}

async function resolveServer(server, tmdbId, mediaType, season, episode, info) {
  try {
    const params = new URLSearchParams({ tmdb: String(tmdbId) });
    if (mediaType === "tv") {
      params.set("season", String(season || 1));
      params.set("episode", String(episode || 1));
    }
    const imdb = info && (info.imdb_id || (info.external_ids && info.external_ids.imdb_id));
    const date = info && (info.release_date || info.first_air_date);
    const title = info && (info.title || info.name);
    if (imdb) params.set("imdb", imdb);
    if (date) params.set("year", String(date).slice(0, 4));
    if (title) params.set("title", title);

    const id = buildResolveId(server, mediaType === "tv" ? "series" : "movie", params);

    const session = await performHandshake();
    const result = await gateResolve(session, id);
    const streams = extractStreamsFromResolveResult(result, server, session.cinejoyOrigin);
    return streams;
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    let numericTmdbId = tmdbId;
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const findData = await (await fetch(findUrl, { skipSizeCheck: true, redirect: "follow" })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId) { return []; }
    }
    if (!numericTmdbId || (mediaType !== "movie" && mediaType !== "tv")) { return []; }
    if (mediaType === "tv" && (!season || !episode)) { return []; }

    const info = await fetchMetadata(numericTmdbId, mediaType);
    if (!info || (!info.title && !info.name)) { return []; }

    const resolved = await Promise.all(
      SUPPORTED_SERVERS.map(server => resolveServer(server, numericTmdbId, mediaType, season, episode, info))
    );

    const seen = new Set();
    const streams = [];
    for (const list of resolved) {
      for (const stream of list) {
        if (seen.has(stream.url)) continue;
        seen.add(stream.url);
        streams.push(stream);
      }
    }
    return streams;
  } catch (e) {
    console.error("[CineJoy]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
