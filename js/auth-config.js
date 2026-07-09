// auth-config.js
// 역할별 진입 비밀번호 (SHA-256 해시 저장 — 평문은 커밋하지 않음)
// 해시 재생성: 브라우저 콘솔에서 아래 sha256() 실행 후 값 교체
//   async function sha256(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

const ROLE_AUTH = {
  "SME":    { hash: "8a37507d1a25cefb8125cb193ad6170aaa7c15c19a2b63769b63df4b64dde9c1" },
  "교수":   { hash: "e725458e803ce5bbf51659c40fc7b01f749e9e1303039017c2d51123d686f456" },
  "관리자": { hash: "ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270" },
};

if (typeof window !== 'undefined') window.ROLE_AUTH = ROLE_AUTH;
if (typeof module !== 'undefined' && module.exports) module.exports = { ROLE_AUTH };
