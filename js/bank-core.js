// item-dev/js/bank-core.js — 문제은행 판정 순수 헬퍼 (window + module.exports 이중 노출)
(function () {
  function isBankItem(item, compIdSet) {
    if (!item) return false;
    if (!item.comp_id) return true;               // 빈/null comp_id = 미배정
    return !compIdSet.has(item.comp_id);          // 현존 역량에 없으면 고아
  }
  function filterBankItems(items, comps) {
    var set = new Set((comps || []).map(function (c) { return c.comp_id; }));
    return (items || [])
      .filter(function (it) { return isBankItem(it, set); })
      .sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
  }
  var api = { isBankItem: isBankItem, filterBankItems: filterBankItems };
  if (typeof window !== 'undefined') for (var k in api) window[k] = api[k];
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
