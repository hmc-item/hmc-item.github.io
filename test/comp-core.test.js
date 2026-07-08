const assert = require('assert');
const { compAssignments, assignmentFor, compTeamIds, compTotalTarget } = require('../js/comp-core.js');
let n = 0, pass = 0;
function t(name, fn) { n++; try { fn(); pass++; } catch (e) { console.error('FAIL: ' + name + ' — ' + e.message); } }

// 신형 assignments 배열
const c1 = { comp_id: 'c1', assignments: [{ team_id: 'T1', target_count: 50 }, { team_id: 'T2', target_count: 30 }] };
t('compTeamIds 다중', () => assert.deepStrictEqual(compTeamIds(c1), ['T1', 'T2']));
t('assignmentFor 존재', () => assert.strictEqual(assignmentFor(c1, 'T2').target_count, 30));
t('assignmentFor 없음', () => assert.strictEqual(assignmentFor(c1, 'T9'), null));
t('compTotalTarget 합계', () => assert.strictEqual(compTotalTarget(c1), 80));

// 구형 단일 team_id 폴백
const c2 = { comp_id: 'c2', team_id: 'T5', target_count: 40 };
t('구형 폴백 team', () => assert.deepStrictEqual(compTeamIds(c2), ['T5']));
t('구형 폴백 target', () => assert.strictEqual(assignmentFor(c2, 'T5').target_count, 40));

// 빈/방어
t('빈 역량', () => assert.deepStrictEqual(compAssignments({}), []));
t('null', () => assert.deepStrictEqual(compAssignments(null), []));
t('문자열 jsonb', () => assert.strictEqual(compTotalTarget({ assignments: '[{"team_id":"T1","target_count":10}]' }), 10));
t('target 누락 → DEFAULT', () => assert.strictEqual(assignmentFor({ assignments: [{ team_id: 'T1' }] }, 'T1').target_count, 50));
t('빈 배열은 team_id 폴백', () => assert.deepStrictEqual(compAssignments({ assignments: [], team_id: 'T7' }), [{ team_id: 'T7', target_count: 50 }]));

console.log(pass + '/' + n + ' PASS');
process.exit(pass === n ? 0 : 1);
