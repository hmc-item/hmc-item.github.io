const assert = require('assert');
const { filterBankItems, isBankItem } = require('../js/bank-core.js');

const comps = [{ comp_id: 'c_live1' }, { comp_id: 'c_live2' }];
const items = [
  { item_id: 'i1', comp_id: 'c_live1', created_at: '2026-01-02' }, // 현존 → 제외
  { item_id: 'i2', comp_id: 'c_dead',  created_at: '2026-01-01' }, // 고아 → 포함
  { item_id: 'i3', comp_id: '',        created_at: '2026-01-03' }, // 미배정 → 포함
  { item_id: 'i4', comp_id: null,      created_at: '2026-01-04' }, // 미배정 → 포함
];

const set = new Set(comps.map(c => c.comp_id));
assert.strictEqual(isBankItem(items[0], set), false, 'live comp는 은행 아님');
assert.strictEqual(isBankItem(items[1], set), true,  '고아는 은행');
assert.strictEqual(isBankItem(items[2], set), true,  '빈 comp_id는 은행');
assert.strictEqual(isBankItem(items[3], set), true,  'null comp_id는 은행');

const bank = filterBankItems(items, comps);
assert.deepStrictEqual(bank.map(i => i.item_id), ['i2', 'i3', 'i4'], '은행 3건, created_at 오름차순');

console.log('bank-core.test PASS');
