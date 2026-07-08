// item-dev/js/comp-core.js — 역량 조 배정 순수 헬퍼 (window + module.exports 이중 노출)
(function () {
  var DEFAULT = (typeof CONST !== 'undefined' && CONST.DEFAULT_TARGET) || 50;

  function compAssignments(comp) {
    if (!comp) return [];
    var a = comp.assignments;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
    if (Array.isArray(a) && a.length) {
      var out = [];
      for (var i = 0; i < a.length; i++) {
        var x = a[i];
        if (x && x.team_id) {
          out.push({ team_id: x.team_id, target_count: (x.target_count != null ? Number(x.target_count) : DEFAULT) });
        }
      }
      return out;
    }
    if (comp.team_id) {  // 구 데이터 폴백
      return [{ team_id: comp.team_id, target_count: (comp.target_count != null ? Number(comp.target_count) : DEFAULT) }];
    }
    return [];
  }
  function assignmentFor(comp, teamId) {
    var list = compAssignments(comp);
    for (var i = 0; i < list.length; i++) if (list[i].team_id === teamId) return list[i];
    return null;
  }
  function compTeamIds(comp) {
    return compAssignments(comp).map(function (x) { return x.team_id; });
  }
  function compTotalTarget(comp) {
    return compAssignments(comp).reduce(function (a, x) { return a + (Number(x.target_count) || 0); }, 0);
  }

  var api = { compAssignments: compAssignments, assignmentFor: assignmentFor, compTeamIds: compTeamIds, compTotalTarget: compTotalTarget };
  if (typeof window !== 'undefined') for (var k in api) window[k] = api[k];
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
