(function () {
  const s = Session.get();
  if (!s) { window.location.href = 'entry.html'; return; }
  Session.renderNav();

  const params = new URLSearchParams(location.search);
  const compId = params.get('comp');
  const ctx = { comp: null, teamName: '', canEdit: false };
  let draft = null;

  function computeCanEdit(comp) {
    if (!comp) return false;
    if (s.role === 'admin' || s.role === 'coach') return true;
    return s.role === 'sme' && compTeamIds(comp).indexOf(s.team_id) >= 0;
  }

  function statusWrap(status, html, label) {
    if (status === '__SME_INPUT__') return '<div class="th-input">⚠ ' + escHtml(label || '입력 필요') + '</div>';
    if (status === '__SME_RECOMMENDED__') return '<div class="th-recommend">입력 권장</div>';
    return html;
  }
  function badge(grades) {
    const g = TheoryCore.sortGrades(grades || []);
    return g.length ? '<span class="th-badge grade">연계: ' + escHtml(g.join('·')) + '</span>' : '';
  }
  function sec(title, inner) {
    return '<section class="th-sec"><div class="th-sec-title">' + title + '</div>' + inner + '</section>';
  }
  function itemCtrl(kind, id, hasRaw) {
    if (!ctx.canEdit) return '';
    return '<div class="th-itemctrl">' +
      '<button class="btn btn-secondary" data-act="up" data-kind="' + kind + '" data-id="' + escHtml(id) + '">▲</button>' +
      '<button class="btn btn-secondary" data-act="down" data-kind="' + kind + '" data-id="' + escHtml(id) + '">▼</button>' +
      '<input class="th-num" type="number" min="1" data-kind="' + kind + '" data-id="' + escHtml(id) + '" placeholder="#">' +
      '<button class="btn btn-secondary" data-act="edit" data-kind="' + kind + '" data-id="' + escHtml(id) + '">✎</button>' +
      (hasRaw ? '<button class="btn btn-secondary" data-act="raw" data-kind="' + kind + '" data-id="' + escHtml(id) + '">원문</button>' : '') +
      '<button class="btn btn-danger" data-act="del" data-kind="' + kind + '" data-id="' + escHtml(id) + '">🗑</button>' +
      '</div>';
  }

  function render() {
    document.getElementById('th-crumb').textContent = (draft.subject || '직무') + ' › ' + draft.sectionTitle;
    document.getElementById('th-title').textContent = draft.sectionTitle;
    document.getElementById('th-range').textContent = draft.gradeRange || '';
    document.getElementById('th-ro').style.display = ctx.canEdit ? 'none' : 'inline-flex';
    document.getElementById('th-actions').style.display = ctx.canEdit ? 'flex' : 'none';

    const parts = [];
    // ① 출제기준 연계
    parts.push(sec('① 출제기준 연계',
      statusWrap(draft.examBasis.status, '<div>' + escHtml(draft.examBasis.value) + '</div>', '국가기술자격명 입력 필요') +
      (ctx.canEdit ? '<div class="th-itemctrl"><button class="btn btn-secondary" data-act="edit-exam">✎ 편집</button></div>' : '')));
    // ② 학습목표
    parts.push(sec('② 학습목표' + (ctx.canEdit ? ' <button class="btn btn-secondary" data-act="add" data-kind="obj">＋</button>' : ''),
      draft.objectives.map(o => '<div class="th-item" data-obj="' + escHtml(o.id) + '">' +
        (o.edited ? '<span class="th-badge edited">수정됨</span>' : '') +
        '<div>' + escHtml(o.text) + '</div>' + itemCtrl('obj', o.id, false) + '</div>').join('')));
    // ③ 출제빈도·급수분포
    const dist = Object.keys(draft.gradeDistribution).map(g => escHtml(g) + ' ' + draft.gradeDistribution[g]).join(' · ');
    parts.push(sec('③ 출제빈도 · 급수분포',
      '<div><span class="th-freq">' + draft.frequency + '</span> &nbsp; 문항 ' + draft.stats.unitCount + '개' +
      (dist ? ' &nbsp;|&nbsp; ' + dist : '') + '</div>'));
    // ④ 핵심이론
    parts.push(sec('④ 핵심이론 본문',
      draft.coreTheory.map(c => '<div class="th-item" data-core="' + escHtml(c.id) + '">' +
        badge(c.linkedGrades) + (c.edited ? '<span class="th-badge edited">수정됨</span>' : '') +
        '<div>' + escHtml(c.text).replace(/\n/g, '<br>') + '</div>' +
        '<div class="th-src">출처: ' + escHtml(c.sourceItemId) + '</div>' +
        itemCtrl('core', c.id, true) + '</div>').join('') ||
      '<div class="empty-state">추출된 핵심이론이 없습니다.</div>'));
    // ⑤ 용어정리
    parts.push(sec('⑤ 핵심 용어·공식 정리',
      (draft.glossary.map((t, i) => '<span class="th-chip">' + escHtml(t) +
        (ctx.canEdit ? '<button data-act="del-term" data-i="' + i + '">✕</button>' : '') + '</span>').join('') ||
        '<span class="empty-text">추출된 용어가 없습니다.</span>') +
      (ctx.canEdit ? '<div style="margin-top:8px"><input id="th-newterm" placeholder="용어(English)"> <button class="btn btn-secondary" data-act="add-term">추가</button></div>' : '')));
    // ⑦ 흔한실수
    parts.push(sec('⑦ 흔한 실수·주의사항',
      draft.commonMistakes.map(m => '<div class="th-item" data-mis="' + escHtml(m.id) + '">' +
        badge(m.linkedGrades) + (m.edited ? '<span class="th-badge edited">수정됨</span>' : '') +
        '<div>' + escHtml(m.text).replace(/\n/g, '<br>') + '</div>' +
        itemCtrl('mis', m.id, true) + '</div>').join('') ||
      '<div class="empty-state">추출된 항목이 없습니다.</div>'));
    // ⑨ 현장적용사례
    parts.push(sec('⑨ 현장 적용 사례',
      draft.fieldCases.map(f => '<div class="th-item" data-fc="' + escHtml(f.id) + '">' + badge(f.linkedGrades) +
        (f.edited ? '<span class="th-badge edited">수정됨</span>' : '') +
        statusWrap(f.status, '<div>' + escHtml(f.text).replace(/\n/g, '<br>') + '</div>', '현장 사례 입력 필요') +
        itemCtrl('fc', f.id, false) + '</div>').join('')));

    document.getElementById('th-body').innerHTML = parts.join('');
  }

  // ── 편집 조작 ──
  const KIND2ARR = { core: 'coreTheory', mis: 'commonMistakes', fc: 'fieldCases', obj: 'objectives' };
  function arrOf(kind) { return draft[KIND2ARR[kind]]; }
  function findIdx(kind, id) { return arrOf(kind).findIndex(x => x.id === id); }
  function move(kind, id, toIdx) {
    const arr = arrOf(kind); const from = arr.findIndex(x => x.id === id);
    if (from < 0) return;
    toIdx = Math.max(0, Math.min(arr.length - 1, toIdx));
    const [it] = arr.splice(from, 1); arr.splice(toIdx, 0, it);
    render();
  }

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, kind = b.dataset.kind, id = b.dataset.id;
    if (act === 'back') { history.back(); return; }
    if (!ctx.canEdit && act !== 'noop') return;

    if (act === 'up') move(kind, id, findIdx(kind, id) - 1);
    if (act === 'down') move(kind, id, findIdx(kind, id) + 1);
    if (act === 'edit') {
      const it = arrOf(kind)[findIdx(kind, id)]; if (!it) return;
      const next = prompt('내용 편집:', it.text); if (next == null) return;
      it.text = next; it.edited = true;
      if (it.status === '__SME_INPUT__' && next.trim()) it.status = 'ok';
      render();
    }
    if (act === 'edit-exam') {
      const next = prompt('국가기술자격명(출제기준 연계):', draft.examBasis.value); if (next == null) return;
      draft.examBasis.value = next.trim();
      draft.examBasis.status = next.trim() ? 'ok' : '__SME_INPUT__';
      render();
    }
    if (act === 'raw') {
      const it = arrOf(kind)[findIdx(kind, id)];
      if (it && it._raw != null) { it.text = it._raw; it.edited = false; render(); UI.toast('원문으로 되돌렸습니다.', 'info'); }
    }
    if (act === 'del') {
      const arr = arrOf(kind); const i = findIdx(kind, id); if (i >= 0) { arr.splice(i, 1); render(); }
    }
    if (act === 'add' && kind === 'obj') {
      const next = prompt('학습목표 추가:', ''); if (next == null) return;
      draft.objectives.push({ id: 'obj_' + Date.now(), text: next.trim(), edited: true }); render();
    }
    if (act === 'add-term') {
      const el = document.getElementById('th-newterm'); const v = el ? el.value.trim() : '';
      if (v) { draft.glossary.push(v); render(); }
    }
    if (act === 'del-term') { draft.glossary.splice(Number(b.dataset.i), 1); render(); }

    if (act === 'save') {
      draft.subject = ctx.teamName; draft.sectionTitle = ctx.comp.comp_name; draft.sectionKey = compId;
      UI.showLoading('저장 중...');
      const r = await API.saveTheorySection(draft);
      UI.hideLoading();
      UI.toast(r ? '저장되었습니다.' : '저장 실패', r ? 'success' : 'error');
    }
    if (act === 'regen') {
      const hasEdit = ['coreTheory', 'commonMistakes', 'fieldCases', 'objectives']
        .some(k => (draft[k] || []).some(x => x.edited));
      if (hasEdit && !(await UI.confirm('편집한 내용이 모두 사라지고 문항에서 다시 생성합니다. 계속할까요?'))) return;
      UI.showLoading('재생성 중...');
      const [items, comps, counts] = await Promise.all([API.getItems({ comp_id: compId }), API.getCompetencies(), API.getItemCounts()]);
      const ctxTids = compTeamIds(ctx.comp);
      const sameTeam = comps.filter(c => compTeamIds(c).some(id => ctxTids.indexOf(id) >= 0));
      const maxOverall = Math.max(1, ...sameTeam.map(c => counts[c.comp_id] || 0));
      const nd = TheoryCore.buildSection(items, {
        maxOverall, subject: ctx.teamName, sectionTitle: ctx.comp.comp_name,
        sectionKey: compId, certName: draft.examBasis.value || '',
      });
      UI.hideLoading();
      if (nd) { draft = nd; render(); UI.toast('재생성되었습니다.', 'success'); }
      else UI.toast('문항이 없어 재생성할 수 없습니다.', 'warning');
    }
  });

  // 번호 직접입력(재정렬)
  document.body.addEventListener('change', (e) => {
    const el = e.target.closest('.th-num'); if (!el || !ctx.canEdit) return;
    const n = Number(el.value); if (n >= 1) move(el.dataset.kind, el.dataset.id, n - 1);
  });

  async function load() {
    UI.showLoading('이론서 불러오는 중...');
    const [comps, teams, counts] = await Promise.all([API.getCompetencies(), API.getTeams(), API.getItemCounts()]);
    const comp = comps.find(c => c.comp_id === compId) || null;
    ctx.comp = comp;
    ctx.canEdit = computeCanEdit(comp);
    if (!comp) {
      UI.hideLoading();
      document.getElementById('th-body').innerHTML = '<div class="empty-state">역량을 찾을 수 없습니다.</div>';
      return;
    }
    const myTid = (s.role === 'sme') ? s.team_id : (compTeamIds(comp)[0] || null);
    const team = teams.find(t => t.team_id === myTid);
    ctx.teamName = team ? team.team_name : '';

    const saved = await API.getTheorySection(compId);
    if (saved && saved.content) {
      draft = saved.content;
    } else {
      const items = await API.getItems({ comp_id: compId });
      const compTids = compTeamIds(comp);
      const sameTeam = comps.filter(c => compTeamIds(c).some(id => compTids.indexOf(id) >= 0));
      const maxOverall = Math.max(1, ...sameTeam.map(c => counts[c.comp_id] || 0));
      draft = TheoryCore.buildSection(items, {
        maxOverall, subject: ctx.teamName, sectionTitle: comp.comp_name,
        sectionKey: compId, certName: '',
      });
      if (!draft) {
        UI.hideLoading();
        document.getElementById('th-body').innerHTML = '<div class="empty-state">이 역량에는 문항이 없습니다. 문항을 먼저 개발하세요.</div>';
        return;
      }
    }
    UI.hideLoading();
    render();
  }

  window.TheoryPage = { getDraft: () => draft, rerender: render, ctx };
  load();
})();
