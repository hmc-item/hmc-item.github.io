(function () {
  const s = Session.get();
  if (!s || (s.role !== 'coach' && s.role !== 'admin')) { window.location.href = 'entry.html'; return; }
  Session.renderNav();
  const authorRole = CONST.ROLE_LABEL[s.role]; // 교수 | 관리자

  let comps = [], teams = [], items = [], commentMap = {};

  function compName(id) { const c = comps.find(x => x.comp_id === id); return c ? c.comp_name : '-'; }

  function commentBlock(it) {
    const list = commentMap[it.item_id] || [];
    const existing = list.map(c =>
      '<div class="cm-row' + (c.is_resolved ? ' resolved' : '') + '">' +
        '<div class="cm-meta"><span class="cm-author">' + escHtml(c.author_role) + '</span>' +
          '<span class="cm-time">' + escHtml(String(c.created_at || '').slice(0,16).replace('T',' ')) + '</span>' +
          (c.is_resolved ? '<span class="cm-resolved">반영완료</span>' : '') + '</div>' +
        '<div class="cm-content">' + escHtml(c.content) + '</div>' +
        '<div class="cm-actions">' +
          '<button class="cm-link" data-act="cm-edit" data-id="' + escHtml(c.comment_id) + '">수정</button>' +
          '<button class="cm-link danger" data-act="cm-del" data-id="' + escHtml(c.comment_id) + '">삭제</button>' +
        '</div></div>').join('');
    return '<div class="cm-box"><div class="cm-list">' + (existing || '<span class="empty-text">코멘트 없음</span>') + '</div>' +
      '<div class="cm-write"><textarea class="cm-input" data-item="' + escHtml(it.item_id) +
        '" data-comp="' + escHtml(it.comp_id) + '" rows="2" placeholder="코멘트 입력 (' + escHtml(authorRole) + ')"></textarea>' +
      '<button class="btn btn-primary btn-sm" data-act="cm-add" data-id="' + escHtml(it.item_id) +
        '" data-comp="' + escHtml(it.comp_id) + '">작성</button></div></div>';
  }

  function itemCard(it, idx) {
    const body = it.item_type === 'mcq'
      ? '<ol class="opt-list">' + [1,2,3,4].map(n => '<li class="' + (it.answer === n ? 'correct' : '') + '">' +
          escHtml(it['option' + n] || '') + (it.answer === n ? ' <span class="ans-tag">정답</span>' : '') + '</li>').join('') + '</ol>'
      : '<div class="essay-model"><span class="field-label">모범답안</span>' + escHtml(it.model_answer || '-') + '</div>';
    return '<div class="item-card">' +
      '<div class="item-card-head"><div class="item-badges">' +
        '<span class="num">' + (idx + 1) + '</span>' +
        '<span class="type-badge type-' + it.item_type + '">' + CONST.TYPES[it.item_type] + '</span>' +
        '<span class="diff-badge">' + escHtml(it.grade || '-') + '</span>' +
        '<span class="rev-comp">' + escHtml(compName(it.comp_id)) + '</span>' +
      '</div>' +
      (s.role === 'admin' ? '<button class="btn btn-secondary btn-sm" data-act="mv-bank" data-id="' + escHtml(it.item_id) + '">🏦 은행으로</button>' : '') +
      '</div>' +
      '<div class="item-q">' + escHtml(it.question) + '</div>' + body +
      (it.explanation ? '<div class="item-exp"><span class="field-label">해설</span>' + escHtml(it.explanation) + '</div>' : '') +
      commentBlock(it) + '</div>';
  }

  function applyFilters() {
    const fc = document.getElementById('rf-comp').value;
    const ft = document.getElementById('rf-team').value;
    const fy = document.getElementById('rf-type').value;
    const fd = document.getElementById('rf-diff').value;
    const unres = document.getElementById('rf-unres').checked;
    let list = items.filter(i =>
      (!fc || i.comp_id === fc) && (!ft || i.team_id === ft) &&
      (!fy || i.item_type === fy) && (!fd || String(i.grade || '') === fd));
    if (unres) list = list.filter(i => (commentMap[i.item_id] || []).some(c => !c.is_resolved));
    document.getElementById('review-list').innerHTML = list.length
      ? list.map((it, i) => itemCard(it, i)).join('')
      : '<div class="empty-state">조건에 맞는 문항이 없습니다.</div>';
  }

  async function loadItemsAndComments() {
    UI.showLoading('문항 불러오는 중...');
    items = await API.getItems({});                 // 전체
    commentMap = await API.getCommentsByItems(items.map(i => i.item_id));
    UI.hideLoading();
    applyFilters();
  }

  async function openTheoryTeams(compId) {
    const comp = comps.find(c => c.comp_id === compId);
    if (!comp) { UI.toast('역량을 찾을 수 없습니다.', 'error'); return; }
    UI.showLoading('조 목록 불러오는 중...');
    const counts = await API.getItemCountsForComp(compId);
    UI.hideLoading();
    const asg = compAssignments(comp);
    document.getElementById('th-teams-title').textContent = comp.comp_name + ' — 조 선택';
    document.getElementById('th-teams-list').innerHTML = asg.length
      ? asg.map(a => {
          const t = teams.find(x => x.team_id === a.team_id);
          const name = t ? t.team_name : a.team_id;
          const cnt = counts[a.team_id] || 0;
          const done = isDevDone(comp, a.team_id);
          return '<div class="th-team-row">' +
            '<span class="th-team-name">' + escHtml(name) + '</span>' +
            '<span class="th-team-stat">' + cnt + ' / ' + (a.target_count || 0) + (done ? ' · ✅완료' : ' · ○') + '</span>' +
            '<button class="btn btn-primary btn-sm" data-act="th-team-open" data-comp="' + escHtml(compId) + '" data-team="' + escHtml(a.team_id) + '">📘 열기</button>' +
            '</div>';
        }).join('')
      : '<div class="empty-state">배정된 조가 없습니다.</div>';
    document.getElementById('th-teams-modal').style.display = 'flex';
  }

  async function init() {
    [comps, teams] = await Promise.all([API.getCompetencies(), API.getTeams()]);
    document.getElementById('rf-comp').innerHTML = '<option value="">역량 전체</option>' +
      comps.map(c => '<option value="' + escHtml(c.comp_id) + '">' + escHtml(c.comp_name) + '</option>').join('');
    document.getElementById('rf-team').innerHTML = '<option value="">조 전체</option>' +
      teams.map(t => '<option value="' + escHtml(t.team_id) + '">' + escHtml(t.team_name) + '</option>').join('');
    ['rf-comp','rf-team','rf-type','rf-diff'].forEach(id =>
      document.getElementById(id).addEventListener('change', applyFilters));
    document.getElementById('rf-unres').addEventListener('change', applyFilters);
    document.getElementById('rf-theory').addEventListener('click', async () => {
      const fc = document.getElementById('rf-comp').value;
      if (!fc) { UI.toast('역량을 먼저 선택하세요.', 'warning'); return; }
      await openTheoryTeams(fc);
    });
    await loadItemsAndComments();
  }

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'th-teams-close') { document.getElementById('th-teams-modal').style.display = 'none'; return; }
    if (act === 'th-team-open') { window.location.href = 'theory.html?comp=' + encodeURIComponent(b.dataset.comp) + '&team=' + encodeURIComponent(b.dataset.team); return; }
    if (act === 'cm-add') {
      const ta = document.querySelector('.cm-input[data-item="' + CSS.escape(b.dataset.id) + '"]');
      const content = ta ? ta.value.trim() : '';
      if (!content) { UI.toast('코멘트를 입력해주세요.', 'warning'); return; }
      UI.showLoading('작성 중...');
      const r = await API.addComment({ item_id: b.dataset.id, comp_id: b.dataset.comp, author_role: authorRole, content });
      UI.hideLoading();
      if (r) { UI.toast('코멘트가 작성되었습니다.', 'success'); await loadItemsAndComments(); }
      else UI.toast('작성 실패', 'error');
    }
    if (act === 'cm-edit') {
      const cur = findComment(b.dataset.id); if (!cur) return;
      const next = prompt('코멘트 수정:', cur.content); if (next == null) return;
      UI.showLoading('수정 중...'); const ok = await API.updateComment(b.dataset.id, next.trim()); UI.hideLoading();
      if (ok) { UI.toast('수정되었습니다.', 'success'); await loadItemsAndComments(); } else UI.toast('수정 실패', 'error');
    }
    if (act === 'cm-del') {
      if (!(await UI.confirm('코멘트를 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteComment(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); await loadItemsAndComments(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'mv-bank') {
      if (s.role !== 'admin') return;
      if (!(await UI.confirm('이 문항을 문제은행으로 보낼까요? (역량·조 연결 해제)'))) return;
      UI.showLoading('이동 중...');
      const ok = await API.moveItemToBank(b.dataset.id);
      UI.hideLoading();
      if (ok) { UI.toast('문제은행으로 이동했습니다.', 'success'); await loadItemsAndComments(); }
      else UI.toast('이동 실패', 'error');
    }
  });
  function findComment(id) {
    for (const k in commentMap) { const f = commentMap[k].find(c => c.comment_id === id); if (f) return f; }
    return null;
  }

  init();
})();
