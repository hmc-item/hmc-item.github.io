// 순수 JS SHA-256 (의존성 0, https·file:// 양쪽 동작). 입력은 UTF-8 바이트로 해싱.
function sha256Hex(str) {
  // UTF-8 바이트열(각 char 0~255)로 변환 — TextEncoder().encode()와 동일 바이트
  const bytes = unescape(encodeURIComponent(String(str == null ? '' : str)));
  function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words = [];
  const bitLen = bytes.length * 8;

  let hash = sha256Hex._h;
  let k = sha256Hex._k;
  if (!hash) {
    hash = sha256Hex._h = [];
    k = sha256Hex._k = [];
    let n = 0, cand = 2;
    const composite = {};
    for (; n < 64; cand++) {
      if (!composite[cand]) {
        for (let i = 0; i < 313; i += cand) composite[i] = cand;
        hash[n] = (Math.pow(cand, 0.5) * maxWord) | 0;
        k[n++] = (Math.pow(cand, 1 / 3) * maxWord) | 0;
      }
    }
  }

  let ascii = bytes + '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;

  hash = hash.slice(0);   // 초기 8개 해시값 복사(재호출 안전)
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const t1 = hash[7]
        + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? (w[i] | 0) : (
            (w[i - 16]
              + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0));
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

if (typeof window !== 'undefined') window.sha256Hex = sha256Hex;
if (typeof module !== 'undefined' && module.exports) module.exports = { sha256Hex };
