/**
 * cinejoy - Built from src/providers/cinejoy.js
 * Generated: 2026-08-14T09:47:31.330Z
 */
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const CINEJOY_ORIGIN = "https://cinejoy.to";
const GATE_ORIGIN = "https://api.shegu.st";
const INFO_PREFIX = "lumen-gate-v1";
const SERVER_STATIC_PUB_B64URL = "BDneWBpzICIVPCtCd8JbpLNxmJiqhCWJaEHar4kp7Yivrp3ZpGS6Rv1rCvDuFrmhnWxUviPpnJhcUJPE-P9Simk";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Origin": CINEJOY_ORIGIN,
  "Referer": CINEJOY_ORIGIN + "/"
};
const SUPPORTED_SERVERS = ["Lisbon", "Solara"];
const SHA256_K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function rotr(x, n) {
  return x >>> n | x << 32 - n;
}
function sha256(bytes) {
  const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const msgLenBits = bytes.length * 8;
  const withOne = new Uint8Array(bytes.length + 1);
  withOne.set(bytes);
  withOne[bytes.length] = 128;
  let totalLen = withOne.length;
  while (totalLen % 64 !== 56)
    totalLen++;
  const padded = new Uint8Array(totalLen + 8);
  padded.set(withOne);
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(msgLenBits / 4294967296), false);
  dv.setUint32(padded.length - 4, msgLenBits >>> 0, false);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (padded[offset + i * 4] << 24 | padded[offset + i * 4 + 1] << 16 | padded[offset + i * 4 + 2] << 8 | padded[offset + i * 4 + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const temp1 = hh + S1 + ch + SHA256_K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++)
    outDv.setUint32(i * 4, h[i], false);
  return out;
}
function concatBytes(...arrs) {
  let len = 0;
  for (const a of arrs)
    len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}
function hmacSha256(key, msg) {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize)
    k = sha256(k);
  if (k.length < blockSize) {
    const p = new Uint8Array(blockSize);
    p.set(k);
    k = p;
  }
  const opad = new Uint8Array(blockSize), ipad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    opad[i] = k[i] ^ 92;
    ipad[i] = k[i] ^ 54;
  }
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
const EC_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const EC_A = EC_P - 3n;
const EC_B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const EC_Gx = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
const EC_Gy = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;
const EC_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
function ecMod(a, m) {
  const r = a % m;
  return r >= 0n ? r : r + m;
}
function ecModInverse(a, m) {
  a = ecMod(a, m);
  let [oldR, r] = [a, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ecMod(oldS, m);
}
function ecPointDouble(pt) {
  if (pt === null)
    return null;
  const { x, y } = pt;
  if (y === 0n)
    return null;
  const lam = ecMod((3n * x * x + EC_A) * ecModInverse(2n * y, EC_P), EC_P);
  const x3 = ecMod(lam * lam - 2n * x, EC_P);
  const y3 = ecMod(lam * (x - x3) - y, EC_P);
  return { x: x3, y: y3 };
}
function ecPointAdd(p1, p2) {
  if (p1 === null)
    return p2;
  if (p2 === null)
    return p1;
  if (p1.x === p2.x) {
    if (ecMod(p1.y + p2.y, EC_P) === 0n)
      return null;
    return ecPointDouble(p1);
  }
  const lam = ecMod((p2.y - p1.y) * ecModInverse(p2.x - p1.x, EC_P), EC_P);
  const x3 = ecMod(lam * lam - p1.x - p2.x, EC_P);
  const y3 = ecMod(lam * (p1.x - x3) - p1.y, EC_P);
  return { x: x3, y: y3 };
}
function ecScalarMult(k, pt) {
  let result = null, addend = pt, n = k;
  while (n > 0n) {
    if (n & 1n)
      result = ecPointAdd(result, addend);
    addend = ecPointDouble(addend);
    n >>= 1n;
  }
  return result;
}
function ecBytesToBigInt(bytes) {
  let result = 0n;
  for (const b of bytes)
    result = result << 8n | BigInt(b);
  return result;
}
function ecBigIntToBytes(n, len) {
  const bytes = new Uint8Array(len);
  let v = n;
  for (let i = len - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}
function ecRandomPrivateKey(randomBytesFn) {
  let k;
  do {
    k = ecMod(ecBytesToBigInt(randomBytesFn(32)), EC_N);
  } while (k === 0n);
  return k;
}
function ecGetPublicKey(privateKey) {
  return ecScalarMult(privateKey, { x: EC_Gx, y: EC_Gy });
}
function ecEncodePoint(pt) {
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(ecBigIntToBytes(pt.x, 32), 1);
  out.set(ecBigIntToBytes(pt.y, 32), 33);
  return out;
}
function ecDecodePoint(bytes) {
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error("invalid P-256 point encoding");
  return { x: ecBytesToBigInt(bytes.slice(1, 33)), y: ecBytesToBigInt(bytes.slice(33, 65)) };
}
function ecDeriveSharedSecret(privateKey, publicPoint) {
  return ecBigIntToBytes(ecScalarMult(privateKey, publicPoint).x, 32);
}
const AES_SBOX = new Uint8Array([
  99,
  124,
  119,
  123,
  242,
  107,
  111,
  197,
  48,
  1,
  103,
  43,
  254,
  215,
  171,
  118,
  202,
  130,
  201,
  125,
  250,
  89,
  71,
  240,
  173,
  212,
  162,
  175,
  156,
  164,
  114,
  192,
  183,
  253,
  147,
  38,
  54,
  63,
  247,
  204,
  52,
  165,
  229,
  241,
  113,
  216,
  49,
  21,
  4,
  199,
  35,
  195,
  24,
  150,
  5,
  154,
  7,
  18,
  128,
  226,
  235,
  39,
  178,
  117,
  9,
  131,
  44,
  26,
  27,
  110,
  90,
  160,
  82,
  59,
  214,
  179,
  41,
  227,
  47,
  132,
  83,
  209,
  0,
  237,
  32,
  252,
  177,
  91,
  106,
  203,
  190,
  57,
  74,
  76,
  88,
  207,
  208,
  239,
  170,
  251,
  67,
  77,
  51,
  133,
  69,
  249,
  2,
  127,
  80,
  60,
  159,
  168,
  81,
  163,
  64,
  143,
  146,
  157,
  56,
  245,
  188,
  182,
  218,
  33,
  16,
  255,
  243,
  210,
  205,
  12,
  19,
  236,
  95,
  151,
  68,
  23,
  196,
  167,
  126,
  61,
  100,
  93,
  25,
  115,
  96,
  129,
  79,
  220,
  34,
  42,
  144,
  136,
  70,
  238,
  184,
  20,
  222,
  94,
  11,
  219,
  224,
  50,
  58,
  10,
  73,
  6,
  36,
  92,
  194,
  211,
  172,
  98,
  145,
  149,
  228,
  121,
  231,
  200,
  55,
  109,
  141,
  213,
  78,
  169,
  108,
  86,
  244,
  234,
  101,
  122,
  174,
  8,
  186,
  120,
  37,
  46,
  28,
  166,
  180,
  198,
  232,
  221,
  116,
  31,
  75,
  189,
  139,
  138,
  112,
  62,
  181,
  102,
  72,
  3,
  246,
  14,
  97,
  53,
  87,
  185,
  134,
  193,
  29,
  158,
  225,
  248,
  152,
  17,
  105,
  217,
  142,
  148,
  155,
  30,
  135,
  233,
  206,
  85,
  40,
  223,
  140,
  161,
  137,
  13,
  191,
  230,
  66,
  104,
  65,
  153,
  45,
  15,
  176,
  84,
  187,
  22
]);
const AES_RCON = new Uint8Array([1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77]);
function aesGmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1)
      p ^= a;
    const hi = a & 128;
    a = a << 1 & 255;
    if (hi)
      a ^= 27;
    b >>= 1;
  }
  return p & 255;
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
      const t0 = temp[0];
      temp[0] = temp[1];
      temp[1] = temp[2];
      temp[2] = temp[3];
      temp[3] = t0;
      for (let i = 0; i < 4; i++)
        temp[i] = AES_SBOX[temp[i]];
      temp[0] ^= AES_RCON[rconIdx++];
    } else if (bytesGenerated % 32 === 16) {
      for (let i = 0; i < 4; i++)
        temp[i] = AES_SBOX[temp[i]];
    }
    for (let i = 0; i < 4; i++)
      w[bytesGenerated + i] = w[bytesGenerated - 32 + i] ^ temp[i];
    bytesGenerated += 4;
  }
  return w;
}
function aesAddRoundKey(state, w, round) {
  for (let i = 0; i < 16; i++)
    state[i] ^= w[round * 16 + i];
}
function aesSubBytes(state) {
  for (let i = 0; i < 16; i++)
    state[i] = AES_SBOX[state[i]];
}
function aesShiftRows(state) {
  const t = state.slice();
  for (let row = 1; row < 4; row++)
    for (let col = 0; col < 4; col++)
      state[col * 4 + row] = t[(col + row) % 4 * 4 + row];
}
function aesMixColumns(state) {
  for (let c = 0; c < 4; c++) {
    const a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
    state[c * 4] = aesGmul(a0, 2) ^ aesGmul(a1, 3) ^ a2 ^ a3;
    state[c * 4 + 1] = a0 ^ aesGmul(a1, 2) ^ aesGmul(a2, 3) ^ a3;
    state[c * 4 + 2] = a0 ^ a1 ^ aesGmul(a2, 2) ^ aesGmul(a3, 3);
    state[c * 4 + 3] = aesGmul(a0, 3) ^ a1 ^ a2 ^ aesGmul(a3, 2);
  }
}
function aes256EncryptBlock(block16, roundKeys) {
  const state = block16.slice();
  aesAddRoundKey(state, roundKeys, 0);
  for (let round = 1; round <= 13; round++) {
    aesSubBytes(state);
    aesShiftRows(state);
    aesMixColumns(state);
    aesAddRoundKey(state, roundKeys, round);
  }
  aesSubBytes(state);
  aesShiftRows(state);
  aesAddRoundKey(state, roundKeys, 14);
  return state;
}
function ghashMul(x, y) {
  let z = new Uint8Array(16), v = y.slice();
  for (let i = 0; i < 128; i++) {
    const byteIdx = i >> 3, bitIdx = 7 - (i & 7);
    if (x[byteIdx] & 1 << bitIdx)
      for (let j = 0; j < 16; j++)
        z[j] ^= v[j];
    const lsb = v[15] & 1;
    for (let j = 15; j > 0; j--)
      v[j] = (v[j] >> 1 | (v[j - 1] & 1) << 7) & 255;
    v[0] = v[0] >> 1;
    if (lsb)
      v[0] ^= 225;
  }
  return z;
}
function ghash(H, aad, ciphertext) {
  const blocks = [];
  for (let i = 0; i < aad.length; i += 16) {
    const b = new Uint8Array(16);
    b.set(aad.subarray(i, Math.min(i + 16, aad.length)));
    blocks.push(b);
  }
  for (let i = 0; i < ciphertext.length; i += 16) {
    const b = new Uint8Array(16);
    b.set(ciphertext.subarray(i, Math.min(i + 16, ciphertext.length)));
    blocks.push(b);
  }
  const lenBlock = new Uint8Array(16);
  const dv = new DataView(lenBlock.buffer);
  const aadBits = BigInt(aad.length) * 8n, ctBits = BigInt(ciphertext.length) * 8n;
  dv.setUint32(0, Number(aadBits >> 32n), false);
  dv.setUint32(4, Number(aadBits & 0xffffffffn), false);
  dv.setUint32(8, Number(ctBits >> 32n), false);
  dv.setUint32(12, Number(ctBits & 0xffffffffn), false);
  blocks.push(lenBlock);
  let y = new Uint8Array(16);
  for (const block of blocks) {
    const xored = new Uint8Array(16);
    for (let i = 0; i < 16; i++)
      xored[i] = y[i] ^ block[i];
    y = ghashMul(xored, H);
  }
  return y;
}
function gcmIncrementCounter(counterBlock) {
  const out = counterBlock.slice();
  for (let i = 15; i >= 12; i--) {
    out[i] = out[i] + 1 & 255;
    if (out[i] !== 0)
      break;
  }
  return out;
}
function gcmGctr(roundKeys, icb, data) {
  const out = new Uint8Array(data.length);
  let counter = icb.slice();
  for (let offset = 0; offset < data.length; offset += 16) {
    const keystream = aes256EncryptBlock(counter, roundKeys);
    const chunkLen = Math.min(16, data.length - offset);
    for (let i = 0; i < chunkLen; i++)
      out[offset + i] = data[offset + i] ^ keystream[i];
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
  for (let i = 0; i < 16; i++)
    if (expectedTag[i] !== receivedTag[i])
      tagMatch = false;
  const plaintext = gcmGctr(roundKeys, gcmIncrementCounter(J0), ciphertext);
  return { plaintext, tagMatch };
}
function utf8(s) {
  return new TextEncoder().encode(s);
}
function infoStr(...parts) {
  return utf8(INFO_PREFIX + "|" + parts.join("|"));
}
function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes)
    bin += String.fromCharCode(b);
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesToHex(bytes) {
  let s = "";
  for (const b of bytes)
    s += b.toString(16).padStart(2, "0");
  return s;
}
function randomBytes(n) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++)
    out[i] = Math.floor(Math.random() * 256);
  return out;
}
class SeededDrbg {
  constructor(seed) {
    this.seed = seed;
    this.buf = new Uint8Array(0);
    this.pos = 0;
    this.counter = 0;
  }
  refill() {
    const ctrBytes = new Uint8Array(4);
    new DataView(ctrBytes.buffer).setUint32(0, this.counter++, false);
    this.buf = hkdf(this.seed, ctrBytes, infoStr("drbg"), 256);
    this.pos = 0;
  }
  bytes(n) {
    const out = new Uint8Array(n);
    let filled = 0;
    while (filled < n) {
      if (this.pos >= this.buf.length)
        this.refill();
      const take = Math.min(n - filled, this.buf.length - this.pos);
      out.set(this.buf.subarray(this.pos, this.pos + take), filled);
      this.pos += take;
      filled += take;
    }
    return out;
  }
  int(max) {
    if (max <= 1)
      return 0;
    const limit = Math.floor(256 / max) * max;
    for (; ; ) {
      const b = this.bytes(1)[0];
      if (b < limit)
        return b % max;
    }
  }
  permutation(n) {
    const arr = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      arr[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }
}
function invertSbox(sbox) {
  const inv = new Uint8Array(sbox.length);
  for (let i = 0; i < sbox.length; i++)
    inv[sbox[i]] = i;
  return inv;
}
function opXor(a, W) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = a[i] ^ W.ks[i % W.ks.length];
  return out;
}
function opSbox(a, W, fwd) {
  const t = fwd ? W.sbox : W.sboxInv;
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = t[a[i]];
  return out;
}
function opReverse(a) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = a[a.length - 1 - i];
  return out;
}
function opRotate(a, W, fwd) {
  const rot = fwd ? W.rot : 8 - W.rot;
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = (a[i] << rot | a[i] >>> 8 - rot) & 255;
  return out;
}
function opNibbleMask(a, W, fwd) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const t = i * W.maskStep & 255;
    if (fwd) {
      const sw = (a[i] << 4 | a[i] >>> 4) & 255;
      out[i] = sw ^ t;
    } else {
      const x = a[i] ^ t;
      out[i] = (x << 4 | x >>> 4) & 255;
    }
  }
  return out;
}
function opAddMod(a, W, fwd) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const f = W.addBase + i * W.addStep & 255;
    out[i] = fwd ? a[i] + f & 255 : a[i] - f & 255;
  }
  return out;
}
function opInterleave(a, W, fwd) {
  const d = a.length, half = d >> 1, out = new Uint8Array(d);
  let b = 0;
  if (fwd) {
    for (let n = 0; n < half; n++) {
      out[b++] = a[n];
      out[b++] = a[half + n];
    }
  } else {
    for (let n = 0; n < half; n++) {
      out[n] = a[b++];
      out[half + n] = a[b++];
    }
  }
  if (d & 1)
    out[d - 1] = a[d - 1];
  return out;
}
function feistelRound(a, roundKey) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++)
    out[i] = a[i] + roundKey[i % roundKey.length] & 255 ^ roundKey[(i * 3 + 1) % roundKey.length];
  return out;
}
function concat3(a, b, c) {
  const out = new Uint8Array((a ? a.length : 0) + (b ? b.length : 0) + (c ? c.length : 0));
  let off = 0;
  if (a) {
    out.set(a, off);
    off += a.length;
  }
  if (b) {
    out.set(b, off);
    off += b.length;
  }
  if (c) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
function opFeistel(a, W, fwd) {
  const d = a.length;
  if (d < 2)
    return a.slice();
  const half = d >> 1;
  const rest = a.subarray(half * 2);
  if (fwd) {
    const L = a.subarray(0, half), R = a.subarray(half, half * 2);
    const f = feistelRound(R, W.round);
    const newL = new Uint8Array(half);
    for (let i = 0; i < half; i++)
      newL[i] = L[i] ^ f[i];
    return concat3(R, newL, rest);
  } else {
    const R = a.subarray(0, half), newL = a.subarray(half, half * 2);
    const f = feistelRound(R, W.round);
    const L = new Uint8Array(half);
    for (let i = 0; i < half; i++)
      L[i] = newL[i] ^ f[i];
    return concat3(L, R, rest);
  }
}
function opBlockPerm(a, W, fwd) {
  const d = W.blockSize, out = new Uint8Array(a.length), full = a.length - a.length % d;
  for (let b = 0; b < full; b += d)
    for (let n = 0; n < d; n++) {
      if (fwd)
        out[b + W.blockPerm[n]] = a[b + n];
      else
        out[b + n] = a[b + W.blockPerm[n]];
    }
  for (let b = full; b < a.length; b++)
    out[b] = a[b];
  return out;
}
function opCbcChain(a, W, fwd) {
  const out = new Uint8Array(a.length);
  let prev = W.chainIV & 255;
  for (let i = 0; i < a.length; i++) {
    out[i] = (a[i] ^ prev) & 255;
    prev = fwd ? out[i] : a[i];
  }
  return out;
}
const TRANSFORM_OPS = [opXor, opSbox, opReverse, opRotate, opNibbleMask, opAddMod, opInterleave, opFeistel, opBlockPerm, opCbcChain];
function applyOp(idx, data, params, forward) {
  return TRANSFORM_OPS[idx](data, params, forward);
}
function transformForward(data, stages) {
  let c = data;
  for (const s of stages)
    c = applyOp(s.op, c, s.params, true);
  return c;
}
function transformReverse(data, stages) {
  let c = data;
  for (let i = stages.length - 1; i >= 0; i--)
    c = applyOp(stages[i].op, c, stages[i].params, false);
  return c;
}
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
        sbox,
        sboxInv: invertSbox(sbox),
        rot: 1 + drbg.int(7),
        maskStep: 1 + drbg.int(255),
        addBase: drbg.int(256),
        addStep: 1 + drbg.int(255),
        round: drbg.bytes(32),
        blockSize,
        blockPerm,
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
  const resp = await fetch(GATE_ORIGIN + "/h", {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/octet-stream" },
    body: wire,
    skipSizeCheck: true
  });
  if (!resp.ok)
    throw new Error("handshake HTTP " + resp.status);
  const respBytes = new Uint8Array(await resp.arrayBuffer());
  if (respBytes.length < 65 + 12 + 16)
    throw new Error("malformed handshake response");
  const serverEphPubBytes = respBytes.subarray(0, 65);
  const respIv = respBytes.subarray(65, 77);
  const respCiphertext = respBytes.subarray(77);
  const serverEphPub = ecDecodePoint(serverEphPubBytes);
  const sharedEE = ecDeriveSharedSecret(priv, serverEphPub);
  const ee = hkdf(sharedEE, serverEphPubBytes, infoStr("ee"), 32);
  const { plaintext: acceptPlain, tagMatch } = aes256GcmDecrypt(ee, respIv, respCiphertext, infoStr("accept"));
  if (!tagMatch)
    throw new Error("handshake response tag mismatch");
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
    seenSeq: 0
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
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
    skipSizeCheck: true
  });
  if (!resp.ok)
    throw new Error("gate call HTTP " + resp.status);
  const respJson = await resp.json();
  const e = session.schema;
  const respSeq = respJson[e.seq];
  if (typeof respSeq !== "number" || respSeq <= session.seenSeq)
    throw new Error("rejected: bad seq");
  session.seenSeq = respSeq;
  const respIv = b64urlToBytes(String(respJson[e.nonce]));
  const respCiphertext = b64urlToBytes(String(respJson[e.payload]));
  const respAad = infoStr("s2c", session.id, String(respSeq));
  const { plaintext, tagMatch } = aes256GcmDecrypt(session.s2cKey, respIv, respCiphertext, respAad);
  if (!tagMatch)
    throw new Error("response tag mismatch");
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
  if (!tagMatch)
    throw new Error("resolve finish tag mismatch");
  return JSON.parse(new TextDecoder().decode(plaintext));
}
function buildResolveId(server, mediaType, params) {
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const qs = sorted.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  const path = "/" + server + "/" + mediaType;
  return qs ? path + "?" + qs : path;
}
async function fetchMetadata(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  const resp = await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
  return resp.json();
}
function extractStreamsFromResolveResult(result, server) {
  const streams = [];
  const items = result && result.data && Array.isArray(result.data.stream) ? result.data.stream : [];
  for (const item of items) {
    const url = item.playlist || item.url;
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url))
      continue;
    const isHls = item.type === "hls" || /\.m3u8(?:$|[?#])/i.test(url);
    const subtitles = Array.isArray(item.captions) ? item.captions.filter((c) => c && c.url).map((c, i) => ({
      url: c.url,
      name: c.label || c.language || `Subtitle ${i + 1}`,
      label: c.label || c.language || `Subtitle ${i + 1}`,
      language: (c.language || "und").toLowerCase(),
      lang: (c.language || "und").toLowerCase()
    })) : [];
    streams.push({
      name: `CineJoy - ${server}`,
      title: `CineJoy \u2022 ${server}`,
      url,
      quality: "Auto",
      type: isHls ? "hls" : "mp4",
      provider: "cinejoy",
      headers: { Referer: CINEJOY_ORIGIN + "/", "User-Agent": HEADERS["User-Agent"] },
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
    const imdb = info && (info.imdb_id || info.external_ids && info.external_ids.imdb_id);
    const date = info && (info.release_date || info.first_air_date);
    const title = info && (info.title || info.name);
    if (imdb)
      params.set("imdb", imdb);
    if (date)
      params.set("year", String(date).slice(0, 4));
    if (title)
      params.set("title", title);
    const id = buildResolveId(server, mediaType === "tv" ? "series" : "movie", params);
    const session = await performHandshake();
    const result = await gateResolve(session, id);
    return extractStreamsFromResolveResult(result, server);
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
      if (!numericTmdbId)
        return [];
    }
    if (!numericTmdbId || mediaType !== "movie" && mediaType !== "tv")
      return [];
    if (mediaType === "tv" && (!season || !episode))
      return [];
    const info = await fetchMetadata(numericTmdbId, mediaType);
    if (!info || !info.title && !info.name)
      return [];
    const resolved = await Promise.all(
      SUPPORTED_SERVERS.map((server) => resolveServer(server, numericTmdbId, mediaType, season, episode, info))
    );
    const seen = /* @__PURE__ */ new Set();
    const streams = [];
    for (const list of resolved) {
      for (const stream of list) {
        if (seen.has(stream.url))
          continue;
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
