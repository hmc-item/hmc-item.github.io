const T = require('../js/theory-core.js');
let pass = 0, fail = 0;
function eq(name, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, '\n    got:', g, '\n    exp:', e); }
}
function ok(name, cond) { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); }

// --- splitExplain: 실데이터 라벨(선행 "- " 포함) ---
const ex = '- 정답 근거: 가나다 근거문.\n- 오답별 왜 틀렸는지:\n① 오답1 설명\n③ 오답3 설명\n- 관련 이론: PLC 입력 필터(Input Filter)는 노이즈를 차단함.';
const sp = T.splitExplain(ex);
ok('splitExplain.basis', sp.basis.indexOf('근거문') >= 0);
ok('splitExplain.wrong', sp.wrong.indexOf('오답1') >= 0 && sp.wrong.indexOf('관련 이론') < 0);
ok('splitExplain.theory', sp.theory.indexOf('입력 필터') >= 0);

// --- splitExplain: 3구획 없는 문항 방어 ---
const sp2 = T.splitExplain('그냥 평문 해설입니다.');
eq('splitExplain.none', [sp2.basis, sp2.wrong, sp2.theory], ['', '', '']);

// --- extractTerms: "한글(English)" 추출·중복제거 ---
eq('extractTerms', T.extractTerms('필터(Input Filter)와 필터(Input Filter) 그리고 제어(Control)'),
   ['필터(Input Filter)', '제어(Control)']);
eq('extractTerms.empty', T.extractTerms(''), []);

// --- normalizeStyle: 서술문 어미 통일 ---
eq('norm.됨', T.normalizeStyle('신호가 차단됨.'), '신호가 차단된다.');
eq('norm.함동사', T.normalizeStyle('노이즈를 차단함.'), '노이즈를 차단한다.');
eq('norm.함형용사', T.normalizeStyle('구성이 적절함.'), '구성이 적절하다.');
eq('norm.임', T.normalizeStyle('원인은 노이즈임.'), '원인은 노이즈이다.');
// --- normalizeStyle: 개조식 줄 원문 보존 ---
ok('norm.bullet보존', T.normalizeStyle('① 항목이 차단됨') === '① 항목이 차단됨');
// --- normalizeStyle: 표기 정규화 ---
eq('norm.표기', T.normalizeStyle('온도 ℃ 와 （괄호）'), '온도 °C 와 (괄호)');

// --- frequencyStars ---
eq('freq.high', T.frequencyStars(8, 10), '★★★');
eq('freq.mid', T.frequencyStars(5, 10), '★★☆');
eq('freq.low', T.frequencyStars(1, 10), '★☆☆');
eq('freq.zeroMax', T.frequencyStars(3, 0), '★☆☆');

// --- buildObjective ---
ok('objective', T.buildObjective('PLC 제어').indexOf('PLC 제어의 개념과 원리') === 0);

// --- grade helpers ---
eq('gradeRange', T.sectionGradeRange(['1급', '3급', '2급']), '3급~1급');
eq('gradeRange.single', T.sectionGradeRange(['2급', '2급']), '2급');
eq('sortGrades', T.sortGrades(['1급 심화', '3급', '1급']), ['3급', '1급', '1급 심화']);

console.log(`\n[theory-core] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
