const T = require('../js/theory-core.js');
let pass = 0, fail = 0;
function ok(name, cond) { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); }

const items = [
  { item_id: 'it_2', grade: '1급', bloom: '', question: '발문2',
    explanation: '- 정답 근거: 근거2.\n- 오답별 왜 틀렸는지:\n② 오답 차단됨\n- 관련 이론: 제어(Control) 이론이 적절함.' },
  { item_id: 'it_1', grade: '3급', bloom: 'Apply', question: '발문1',
    explanation: '- 정답 근거: 근거1.\n- 관련 이론: 필터(Input Filter) 원리임.' },
  { item_id: 'it_3', grade: '', bloom: '', question: '발문3', explanation: '3구획 없는 평문.' },
];
const d = T.buildSection(items, { maxOverall: 6, subject: '기계보전', sectionTitle: 'PLC 제어', sectionKey: 'c_x', certName: '' });

ok('sectionTitle', d.sectionTitle === 'PLC 제어');
ok('subject', d.subject === '기계보전');
// 정렬: 3급(it_1) 먼저
ok('정렬 급수순', d.coreTheory[0].sourceItemId === 'it_1');
// ④ 핵심이론: 관련이론만, 문체 정규화(원리임→원리이다)
ok('핵심이론 정규화', d.coreTheory.some(c => c.text.indexOf('원리이다') >= 0));
ok('핵심이론 _raw보존', d.coreTheory.some(c => c._raw.indexOf('원리임') >= 0));
// ⑦ 흔한실수: 오답별에서, 개조식 보존
ok('흔한실수 개조식보존', d.commonMistakes.some(m => m.text.indexOf('② 오답 차단됨') >= 0));
// ⑤ 용어: 한글(English) 추출
ok('용어추출', d.glossary.indexOf('필터(Input Filter)') >= 0 && d.glossary.indexOf('제어(Control)') >= 0);
// ① certName 없음 → __SME_INPUT__
ok('examBasis 빈값', d.examBasis.status === '__SME_INPUT__');
// ⑨ context 없음 → 전부 __SME_INPUT__
ok('fieldCases 빈값', d.fieldCases.length === 3 && d.fieldCases.every(f => f.status === '__SME_INPUT__'));
// ③ 급수분포 + 범위
ok('gradeDistribution', d.gradeDistribution['1급'] === 1 && d.gradeDistribution['3급'] === 1);
ok('gradeRange', d.gradeRange === '3급~1급');
// ② 학습목표
ok('objective', d.objectives[0].text.indexOf('PLC 제어의 개념') === 0);
// Bloom 참고보관, 미사용
ok('bloomTags', d.meta.bloomTags.indexOf('Apply') >= 0);
// 연계 문항ID
ok('linkedItems', d.linkedItems.length === 3);
// ★ 빈 배열 방어
ok('empty', T.buildSection([], {}) === null);
// ★ Bloom 전면결측·급수 전면결측으로도 예외 없이 완료
const d2 = T.buildSection([{ item_id: 'a', question: 'q', explanation: '- 관련 이론: 내용임.' }], { maxOverall: 1 });
ok('null-safe 생성', !!d2 && d2.coreTheory.length === 1 && d2.gradeRange === '');

console.log(`\n[theory-build] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
