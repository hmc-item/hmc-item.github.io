// 이론서 조립 순수함수 (브라우저 window.TheoryCore / Node module.exports 양쪽)
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.TheoryCore = api;
})(this, function () {

  const GRADE_ORDER = ['3급', '2급', '1급', '1급 심화']; // 쉬운→어려운
  const clean = v => String(v == null ? '' : v).replace(/\s*---\s*/g, ' ').replace(/\s+/g, ' ').trim();

  // ── 문체 정규화 (표층만, 개조식 보존) — v7 부록 A ──
  const ADJ = ['적합','적절','정확','명확','타당','유효','안전','가능','충분','중요','필요','동일','유사','일정','안정','용이','적당','우수','부족','유리','불리','곤란','미흡','상이','바람직','확실','분명','정밀','정교','엄격','청결','불결','위험','건전','견고','완전','불완전','원활','순조','양호','불량','정상','비정상','적정','과도','과다','과소','적량','충실','성실','근면','나태','치밀','조밀','섬세','예민','민감','둔감','예리','무디','거대','방대','광범','협소','막대','미미','미세','경미','심각','심대','현저','급격','완만','점진','급속','신속','완속','급박','긴급','시급','우량','열등','탁월','비범','평범','특출','월등','출중','독특','특수','특별','고유','보편','일반','전형','표준','규격','이상','완벽','정연','명료','간명','간결','복잡','단순','난해','평이','심오','심원','광대','협착','포괄','전반','부분','국부','전체','개별','독립','종속','신중','경솔','진지','성급','침착','차분','냉정','냉철','과감','대담','소심','섬약','유약','강건','건강','허약','병약','왕성','활발','활동','신선','진부','최신','구식','현대','고전','전통','참신','혁신','선진','후진','조속','지속','영속','항구','일시','임시','잠정','항상','불변','풍부','희소','빈번','드물','다양','단조','균등','불균등','균일','불균일','평등','공평','불공평','정당','부당','합당','온당','마땅','적법','위법','견실','확고','공고','치명','결정','핵심','기본','근본','본질','실질','형식','구체','추상','실제','가상','현실','실용','경제','효율','투명','불투명'];
  const _isBullet = line => /^\s*([①-⑳]|[0-9]+[.)]|[가-힣][.)]|[-•·※])/.test(line.trim());
  function normalizeStyle(text) {
    if (!text) return '';
    let t = String(text)
      .replace(/（/g, '(').replace(/）/g, ')')
      .replace(/㎫/g, 'MPa').replace(/℃/g, '°C').replace(/㎜/g, 'mm').replace(/㎏/g, 'kg')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s*정답\s*근거\s*[:：]\s*/g, '')
      .replace(/\s*오답별[^:：]*[:：]\s*/g, '')
      .trim();
    const adjAlt = ADJ.join('|');
    const unify = s => s
      .replace(/시킴(?=[\s.。]|$)/g, '시킨다')
      .replace(new RegExp('(' + adjAlt + ')함(?=[\\s.。]|$)', 'g'), '$1하다')
      .replace(/함(?=[\s.。]|$)/g, '한다')
      .replace(/됨(?=[\s.。]|$)/g, '된다')
      .replace(/임(?=[\s.。]|$)/g, '이다')
      .replace(/인\s*것이다/g, '이다').replace(/하는\s*것이다/g, '한다');
    return t.split(/\n/).map(l => _isBullet(l) ? l : unify(l)).join('\n');
  }

  function splitExplain(explain) {
    const ex = String(explain || '').replace(/\s*---\s*/g, ' ');
    const grab = re => { const m = ex.match(re); return m ? m[1].trim() : ''; };
    const basis  = grab(/정답\s*근거\s*[:：]?\s*([\s\S]+?)(?=오답별|관련\s*이론|$)/);
    const wrong  = grab(/오답별[^:：]*[:：]?\s*([\s\S]+?)(?=관련\s*이론|$)/);
    let   theory = grab(/관련\s*이론\s*[:：]?\s*([\s\S]+)/);
    // 마커(정답 근거/오답별/관련 이론)가 전혀 없는 평문 해설이면 해설 전체를 핵심이론으로 사용
    if (!theory && !basis && !wrong) theory = ex.trim();
    return { basis, wrong, theory };
  }

  function extractTerms(theory) {
    const out = [], seen = new Set();
    const re = /([가-힣A-Za-z0-9·]{2,20})\s*[(（]([A-Za-z][A-Za-z0-9\s/·\-]{1,30})[)）]/g;
    let m;
    while ((m = re.exec(theory))) {
      const en = m[2].trim(), k = en.toLowerCase();
      if (seen.has(k)) continue; seen.add(k);
      out.push(m[1].trim() ? m[1].trim() + '(' + en + ')' : en);
      if (out.length >= 8) break;
    }
    return out;
  }

  function frequencyStars(count, maxOverall) {
    const r = maxOverall ? count / maxOverall : 0;
    return r >= 0.8 ? '★★★' : r >= 0.4 ? '★★☆' : '★☆☆';
  }
  function buildObjective(compName) {
    return String(compName || '') + '의 개념과 원리를 이해하고, 현장 상황에 적용·판단할 수 있다.';
  }

  const gradeRank = g => { const i = GRADE_ORDER.indexOf(g); return i < 0 ? 99 : i; };
  const sortGrades = arr => [...new Set((arr || []).filter(Boolean))].sort((a, b) => gradeRank(a) - gradeRank(b));
  function sectionGradeRange(arr) {
    const u = sortGrades(arr);
    if (u.length <= 1) return u[0] || '';
    return u[0] + '~' + u[u.length - 1];
  }

  // items = 한 역량(절) 문항 배열, opts = {maxOverall, subject, sectionTitle, sectionKey, certName}
  function buildSection(items, opts) {
    if (!items || !items.length) return null;
    opts = opts || {};
    const sectionTitle = clean(opts.sectionTitle) || '(역량명 미지정)';

    // 정렬: 연계 급수 순(3급→1급 심화) = 쉬운→어려운
    const ordered = items.slice().sort((a, b) => gradeRank(clean(a.grade)) - gradeRank(clean(b.grade)));

    const glossary = new Set();
    const coreTheory = [], commonMistakes = [], fieldCases = [];
    const bloomTags = [], allGrades = [], linkedItems = [];
    const gradeCount = {};

    ordered.forEach((it, i) => {
      const { wrong, theory } = splitExplain(it.explanation); // 정답근거는 문항 자산이라 미사용
      const sid = clean(it.item_id);
      const g = clean(it.grade);
      if (g) { allGrades.push(g); gradeCount[g] = (gradeCount[g] || 0) + 1; }
      const bt = clean(it.bloom); if (bt) bloomTags.push(bt);
      if (sid) linkedItems.push({ itemId: sid, grade: g });

      extractTerms(theory).forEach(t => glossary.add(t));

      if (theory) coreTheory.push({
        id: 'th_' + (i + 1), text: normalizeStyle(theory), _raw: theory,
        sourceItemId: sid, linkedGrades: g ? [g] : [], edited: false,
      });
      if (wrong) commonMistakes.push({
        id: 'mis_' + (i + 1), text: normalizeStyle(wrong), _raw: wrong,
        sourceItemId: sid, linkedGrades: g ? [g] : [], edited: false,
      });
      const ctx = clean(it.context); // items 테이블엔 없음 → 항상 빈값(__SME_INPUT__)
      fieldCases.push(ctx
        ? { id: 'fc_' + (i + 1), text: ctx, sourceItemId: sid, linkedGrades: g ? [g] : [], status: 'ok', edited: false }
        : { id: 'fc_' + (i + 1), text: '', sourceItemId: sid, linkedGrades: g ? [g] : [], status: '__SME_INPUT__', edited: false });
    });

    const certName = clean(opts.certName);
    return {
      sectionKey: opts.sectionKey || sectionTitle,
      subject: clean(opts.subject),
      sectionTitle,
      gradeRange: sectionGradeRange(allGrades),
      examBasis: certName ? { value: certName, status: 'ok' } : { value: '', status: '__SME_INPUT__' },
      objectives: [{ id: 'obj_1', text: buildObjective(sectionTitle), edited: false }],
      frequency: frequencyStars(items.length, opts.maxOverall),
      gradeDistribution: gradeCount,
      stats: { unitCount: items.length, termCount: glossary.size },
      coreTheory,
      glossary: [...glossary],
      commonMistakes,
      fieldCases,
      linkedItems,
      meta: { bloomTags },
    };
  }

  return {
    clean, normalizeStyle, splitExplain, extractTerms,
    frequencyStars, buildObjective,
    gradeRank, sortGrades, sectionGradeRange, GRADE_ORDER,
    buildSection,
  };
});
