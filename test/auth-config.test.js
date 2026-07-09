const assert = require('assert');
const { ROLE_AUTH } = require('../js/auth-config.js');

for (const k of ['SME', '교수', '관리자']) {
  assert.ok(ROLE_AUTH[k], k + ' 키 존재');
  assert.match(ROLE_AUTH[k].hash, /^[0-9a-f]{64}$/, k + ' 해시는 64자 16진');
}
console.log('auth-config.test.js PASS');
