const assert = require('assert');
const crypto = require('crypto');
const { sha256Hex } = require('../js/auth-gate.js');

// 1) 알려진 벡터
assert.strictEqual(sha256Hex('abc'),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.strictEqual(sha256Hex(''),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

// 2) Node crypto와 교차검증(UTF-8) — 한글·특수문자·빈문자 포함
const cases = ['password', '관리자비번', '① ℃±㎛² "쉼표,따옴표"', 'a b c\n줄바꿈', '1234!@#$'];
for (const s of cases) {
  const expected = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  assert.strictEqual(sha256Hex(s), expected, 'UTF-8 불일치: ' + JSON.stringify(s));
}
console.log('auth-gate.test.js PASS (' + (cases.length + 2) + ' assertions)');
