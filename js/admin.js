(function () {
  if (!Session.requireRole('admin')) return;
  Session.renderNav();

  let teams = [];

  // ---- 헤더 클릭 정렬 (클라이언트 메모리, 탭 재진입 시 초기화) ----
  const sortState = { teams: { key: null, dir: 1 }, comps: { key: null, dir: 1 } };
  const SORT_COLS = {
    teams: {
      team_name : { type: 'str', get: t => t.team_name },
      class_no  : { type: 'num', get: t => t.class_no },
      created_at: { type: 'str', get: t => String(t.created_at || '').slice(0, 10) },
    },
    comps: {
      comp_name   : { type: 'str', get: c => c.comp_name },
      category    : { type: 'str', get: c => c.category || '' },
      team        : { type: 'str', get: c => teamName(c.team_id) },
      target_count: { type: 'num', get: c => (c.target_count != null ? c.target_count : 50) },
    },
  };
  function sortRows(arr, table) {
    const st = sortState[table]; if (!st.key) return arr.slice();
    const col = SORT_COLS[table][st.key]; if (!col) return arr.slice();
    const dir = st.dir;
    return arr.slice().sort((a, b) => {
      const va = col.get(a), vb = col.get(b);
      if (col.type === 'num') {
        const na = (va == null || va === '') ? null : Number(va);
        const nb = (vb == null || vb === '') ? null : Number(vb);
        if (na == null && nb == null) return 0;
        if (na == null) return 1;      // 빈값은 항상 뒤로
        if (nb == null) return -1;
        return (na - nb) * dir;
      }
      return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'ko') * dir;
    });
  }
  function applySortIndicators(table) {
    const thead = document.querySelector('thead[data-sort-table="' + table + '"]');
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sortKey === sortState[table].key) {
        th.classList.add(sortState[table].dir === 1 ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }
  document.body.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort-key]'); if (!th) return;
    const thead = th.closest('thead[data-sort-table]'); if (!thead) return;
    const table = thead.dataset.sortTable;
    const key = th.dataset.sortKey, st = sortState[table];
    if (st.key === key) st.dir = -st.dir; else { st.key = key; st.dir = 1; }
    if (table === 'teams') renderTeamsBody(); else renderCompsBody();
  });

  // ---- 탭 전환 ----
  document.querySelector('.admin-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.admin-tab'); if (!t) return;
    document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'comps') window.renderCompsTab && window.renderCompsTab();
    if (t.dataset.tab === 'dash')  window.renderDashTab  && window.renderDashTab();
    if (t.dataset.tab === 'review') window.renderReviewTab && window.renderReviewTab();
    if (t.dataset.tab === 'notices') window.renderNotices && window.renderNotices();
    if (t.dataset.tab === 'help') window.renderHelpTab && window.renderHelpTab();
    if (t.dataset.tab === 'import') window.renderImportTab && window.renderImportTab();
  });

  // ---- 조 관리 ----
  async function loadTeams() {
    teams = await API.getTeams();
    window._adminTeams = teams; // 다른 탭 공유
    renderTeamsBody();
  }
  window.adminReloadTeams = loadTeams;

  function renderTeamsBody() {
    const tb = document.getElementById('teams-tbody');
    const rows = sortRows(teams, 'teams');
    tb.innerHTML = rows.length ? rows.map((t, i) =>
      '<tr><td class="td-center td-no">' + (i + 1) + '</td>' +
      '<td><strong>' + escHtml(t.team_name) + '</strong></td>' +
      '<td class="td-center">' + (t.class_no ? escHtml(CONST.CLASS_LABEL[t.class_no] || t.class_no) : '-') + '</td>' +
      '<td class="td-center">' + escHtml(String(t.created_at || '').slice(0,10)) + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn btn-secondary btn-sm" data-act="edit-team" data-id="' + escHtml(t.team_id) + '">수정</button>' +
        '<button class="btn btn-danger btn-sm" data-act="del-team" data-id="' + escHtml(t.team_id) + '">삭제</button>' +
      '</td></tr>').join('')
      : '<tr><td colspan="5" class="table-empty">등록된 조가 없습니다.</td></tr>';
    applySortIndicators('teams');
  }

  function openTeamModal(team) {
    document.getElementById('team-modal-id').value = team ? team.team_id : '';
    document.getElementById('team-modal-name').value = team ? team.team_name : '';
    document.getElementById('team-modal-class').value = team && team.class_no != null ? String(team.class_no) : '';
    document.getElementById('team-modal-title').textContent = team ? '조 수정' : '조 추가';
    UI.modal('team-modal', true);
  }

  // ---- 역량 관리 ----
  let comps = [];
  function teamName(id) { const t = (window._adminTeams || []).find(x => x.team_id === id); return t ? t.team_name : '-'; }

  async function renderCompsTab() {
    if (!window._adminTeams) await loadTeams();
    comps = await API.getCompetencies();
    renderCompsBody();
  }
  window.renderCompsTab = renderCompsTab;

  function renderCompsBody() {
    const tb = document.getElementById('comps-tbody');
    const rows = sortRows(comps, 'comps');
    tb.innerHTML = rows.length ? rows.map((c, i) =>
      '<tr><td class="td-center td-no">' + (i + 1) + '</td>' +
      '<td><strong>' + escHtml(c.comp_name) + '</strong></td>' +
      '<td>' + escHtml(c.category || '-') + '</td>' +
      '<td>' + escHtml(teamName(c.team_id)) + '</td>' +
      '<td class="td-center">' + (c.target_count != null ? c.target_count : 50) + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn btn-secondary btn-sm" data-act="th-open" data-id="' + escHtml(c.comp_id) + '">📘 이론서</button>' +
        '<button class="btn ' + (c.dev_done ? 'btn-primary' : 'btn-secondary') + ' btn-sm" data-act="th-toggle" data-id="' + escHtml(c.comp_id) + '" data-v="' + (c.dev_done ? 0 : 1) + '">' + (c.dev_done ? '✅ 완료' : '○ 미완료') + '</button>' +
        '<button class="btn btn-secondary btn-sm" data-act="edit-comp" data-id="' + escHtml(c.comp_id) + '">수정</button>' +
        '<button class="btn btn-danger btn-sm" data-act="del-comp" data-id="' + escHtml(c.comp_id) + '">삭제</button>' +
      '</td></tr>').join('')
      : '<tr><td colspan="6" class="table-empty">등록된 역량이 없습니다.</td></tr>';
    applySortIndicators('comps');
  }

  function openCompModal(c) {
    const sel = document.getElementById('comp-modal-team');
    sel.innerHTML = '<option value="">조 선택</option>' +
      (window._adminTeams || []).map(t => '<option value="' + escHtml(t.team_id) + '">' +
        escHtml(t.team_name) + '</option>').join('');
    document.getElementById('comp-modal-id').value     = c ? c.comp_id : '';
    document.getElementById('comp-modal-name').value   = c ? c.comp_name : '';
    document.getElementById('comp-modal-cat').value    = c ? (c.category || '') : '';
    document.getElementById('comp-modal-team').value   = c ? (c.team_id || '') : '';
    document.getElementById('comp-modal-target').value = c ? (c.target_count != null ? c.target_count : 50) : 50;
    document.getElementById('comp-modal-order').value  = c ? (c.order_index || 0) : 0;
    document.getElementById('comp-modal-desc').value   = c ? (c.description || '') : '';
    document.getElementById('comp-modal-title').textContent = c ? '역량 수정' : '역량 추가';
    UI.modal('comp-modal', true);
  }

  // ---- 진척 대시보드 ----
  function rateOf(cnt, target) { const t = Number(target) || 0; return t ? Math.round((cnt||0)/t*100) : 0; }

  async function renderDashTab() {
    UI.showLoading('현황 집계 중...');
    const [cs, ts, counts, unres, allItems, sampleCnt] =
      await Promise.all([API.getCompetencies(), API.getTeams(), API.getItemCounts(),
                         API.getUnresolvedCounts(), API.getItems({}), API.getSampleCount()]);
    window._dashItems = allItems;
    window._dashComps = cs;
    window._dashTeams = ts;
    UI.hideLoading();
    const tname = (id) => { const t = ts.find(x => x.team_id === id); return t ? t.team_name : '-'; };

    // 역량별
    document.getElementById('dash-comp').innerHTML = cs.length ? cs.map(c => {
      const cnt = counts[c.comp_id] || 0, target = c.target_count != null ? c.target_count : 50;
      const r = rateOf(cnt, target), over = r > 100, under = r < 100;
      const byType = allItems.filter(i => i.comp_id === c.comp_id);
      const mcq = byType.filter(i => i.item_type === 'mcq').length;
      const essay = byType.length - mcq;
      const u = unres[c.comp_id] || 0;
      return '<div class="dash-card"><div class="dash-card-top"><span class="dash-name">' + escHtml(c.comp_name) + '</span>' +
        '<span class="dash-rate ' + (over ? 'over' : (under ? 'under' : 'ok')) + '">' + r + '%</span></div>' +
        '<div class="dash-meta">' + escHtml(tname(c.team_id)) + '</div>' +
        '<div class="dash-bar"><div class="dash-bar-fill" style="width:' + Math.min(r,100) + '%"></div></div>' +
        '<div class="dash-foot"><span>' + cnt + '/' + target + '</span>' +
          '<span>객 ' + mcq + ' · 서 ' + essay + '</span>' +
          (u ? '<span class="dash-unres">💬 ' + u + '</span>' : '') + '</div></div>';
    }).join('') : '<p class="table-empty">역량이 없습니다.</p>';

    // 조별
    const teamAgg = ts.map(t => {
      const tc = cs.filter(c => c.team_id === t.team_id);
      const cnt = tc.reduce((a, c) => a + (counts[c.comp_id] || 0), 0);
      const tgt = tc.reduce((a, c) => a + (Number(c.target_count) || 0), 0);
      return { name: t.team_name, cnt, tgt, r: rateOf(cnt, tgt), n: tc.length };
    });
    document.getElementById('dash-team').innerHTML = teamAgg.length ? teamAgg.map(t =>
      '<div class="dash-card"><div class="dash-card-top"><span class="dash-name">' + escHtml(t.name) + '</span>' +
      '<span class="dash-rate ' + (t.r > 100 ? 'over' : (t.r < 100 ? 'under' : 'ok')) + '">' + t.r + '%</span></div>' +
      '<div class="dash-meta">역량 ' + t.n + '개</div>' +
      '<div class="dash-bar"><div class="dash-bar-fill" style="width:' + Math.min(t.r,100) + '%"></div></div>' +
      '<div class="dash-foot"><span>' + t.cnt + '/' + t.tgt + '</span></div></div>').join('')
      : '<p class="table-empty">조가 없습니다.</p>';

    // 전체 요약: 객/서 · 급수
    const totalN = allItems.length;
    const mcqTot = allItems.filter(i => i.item_type === 'mcq').length;
    const essayTot = totalN - mcqTot;
    const gCount = (g) => allItems.filter(i => (i.grade || '') === g).length;
    const pct = (n) => totalN ? Math.round(n / totalN * 100) : 0;
    document.getElementById('dash-summary').innerHTML =
      '<div class="dash-stat"><div class="dash-stat-h">유형 총 현황</div>' +
        '<div class="dash-stat-row"><span>객관식 <b>' + mcqTot + '</b> (' + pct(mcqTot) + '%)</span>' +
        '<span>서술형 <b>' + essayTot + '</b> (' + pct(essayTot) + '%)</span></div></div>' +
      '<div class="dash-stat"><div class="dash-stat-h">급수 총 현황</div>' +
        '<div class="dash-stat-row">' +
        CONST.ITEM_GRADES.map(g => '<span>' + escHtml(g) + ' <b>' + gCount(g) + '</b> (' + pct(gCount(g)) + '%)</span>').join('') +
        '</div>' +
        '<div class="dash-stat-sub">전체 ' + totalN + '문항</div></div>' +
      '<div class="dash-stat"><div class="dash-stat-h">샘플 문항 뱅크</div>' +
        '<div class="dash-stat-row"><span>등록 <b>' + sampleCnt + '</b> 개</span>' +
        '<span><a href="samples.html">관리 →</a></span></div></div>';

    // 분반별
    const groupCard = (name, teamIds) => {
      const gcomps = cs.filter(c => teamIds.includes(c.team_id));
      const cnt = gcomps.reduce((a, c) => a + (counts[c.comp_id] || 0), 0);
      const tgt = gcomps.reduce((a, c) => a + (Number(c.target_count) || 0), 0);
      const r = rateOf(cnt, tgt);
      return '<div class="dash-card"><div class="dash-card-top"><span class="dash-name">' + escHtml(name) + '</span>' +
        '<span class="dash-rate ' + (r > 100 ? 'over' : (r < 100 ? 'under' : 'ok')) + '">' + r + '%</span></div>' +
        '<div class="dash-meta">조 ' + teamIds.length + '개</div>' +
        '<div class="dash-bar"><div class="dash-bar-fill" style="width:' + Math.min(r,100) + '%"></div></div>' +
        '<div class="dash-foot"><span>' + cnt + '/' + tgt + '</span></div></div>';
    };
    let classHtml = [1,2,3].map(cls =>
      groupCard(CONST.CLASS_LABEL[cls], ts.filter(t => Number(t.class_no) === cls).map(t => t.team_id))).join('');
    const unassigned = ts.filter(t => t.class_no == null).map(t => t.team_id);
    if (unassigned.length) classHtml += groupCard('미지정', unassigned);
    document.getElementById('dash-class').innerHTML = classHtml;
  }
  window.renderDashTab = renderDashTab;

  function renderReviewTab() {
    const f = document.getElementById('review-frame');
    if (f && !f.src) f.src = 'review.html';
  }
  window.renderReviewTab = renderReviewTab;

  // ---- 공지 관리 ----
  let notices = [];
  async function renderNotices() {
    if (!window._adminTeams) await loadTeams();
    notices = await API.getNotices();
    const tb = document.getElementById('notices-tbody');
    tb.innerHTML = notices.length ? notices.map(n => {
      const target = n.is_common
        ? '<span class="notice-badge common">공통</span>'
        : (Array.isArray(n.team_ids) && n.team_ids.length
            ? n.team_ids.map(id => '<span class="notice-badge team">' + escHtml(teamName(id)) + '</span>').join(' ')
            : '<span class="notice-badge team">-</span>');
      return '<tr><td>' + target + '</td>' +
        '<td><strong>' + escHtml(n.title) + '</strong></td>' +
        '<td class="td-center">' + (n.is_pinned ? '📌' : '-') + '</td>' +
        '<td class="td-center">' + escHtml(String(n.created_at || '').slice(0,10)) + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn btn-secondary btn-sm" data-act="edit-notice" data-id="' + escHtml(n.notice_id) + '">수정</button>' +
          '<button class="btn btn-danger btn-sm" data-act="del-notice" data-id="' + escHtml(n.notice_id) + '">삭제</button>' +
        '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="table-empty">등록된 공지가 없습니다.</td></tr>';
  }
  window.renderNotices = renderNotices;

  // ---- 사용법 관리 ----
  async function loadHelpForRole(role) {
    let body = null;
    try { body = await API.getHelpText(role); } catch (e) { console.error(e); }
    if (body == null) body = (window.DEFAULT_HELP && window.DEFAULT_HELP[role]) || '';
    document.getElementById('help-body-edit').value = body;
    updateHelpPreview();
  }
  function updateHelpPreview() {
    const role = document.getElementById('help-role').value || 'sme';
    document.getElementById('help-preview').innerHTML =
      window.renderHelpBody(role, document.getElementById('help-body-edit').value);
  }
  function renderHelpTab() {
    loadHelpForRole(document.getElementById('help-role').value || 'sme');
  }
  window.renderHelpTab = renderHelpTab;
  document.getElementById('help-role').addEventListener('change', (e) => loadHelpForRole(e.target.value));
  document.getElementById('help-body-edit').addEventListener('input', updateHelpPreview);

  function renderNoticeTeams(selected) {
    const sel = selected || [];
    document.getElementById('notice-teams-box').innerHTML =
      (window._adminTeams || []).length
        ? (window._adminTeams).map(t =>
            '<label class="notice-team-chk"><input type="checkbox" value="' + escHtml(t.team_id) + '"' +
              (sel.includes(t.team_id) ? ' checked' : '') + '> ' + escHtml(t.team_name) + '</label>').join('')
        : '<span class="table-empty">먼저 조를 등록하세요.</span>';
  }
  function openNoticeModal(n) {
    document.getElementById('notice-modal-id').value = n ? n.notice_id : '';
    document.getElementById('notice-modal-title-in').value = n ? n.title : '';
    document.getElementById('notice-modal-content').value = n ? n.content : '';
    const isCommon = n ? !!n.is_common : true;
    document.querySelector('input[name="notice-scope"][value="common"]').checked = isCommon;
    document.querySelector('input[name="notice-scope"][value="teams"]').checked = !isCommon;
    document.getElementById('notice-teams-group').style.display = isCommon ? 'none' : 'block';
    renderNoticeTeams(n && !isCommon ? (n.team_ids || []) : []);
    document.getElementById('notice-modal-pin').checked = n ? !!n.is_pinned : false;
    document.getElementById('notice-modal-title').textContent = n ? '공지 수정' : '공지 추가';
    UI.modal('notice-modal', true);
  }

  function exportCsv() {
    const items = window._dashItems || [];
    if (!items.length) { UI.toast('내보낼 문항이 없습니다.', 'warning'); return; }
    const cs = window._dashComps || [], ts = window._dashTeams || [];
    const compName = (id) => { const c = cs.find(x => x.comp_id === id); return c ? c.comp_name : id; };
    const teamName = (id) => { const t = ts.find(x => x.team_id === id); return t ? t.team_name : id; };
    const head = ['역량','담당조','유형','급수','문항','보기1','보기2','보기3','보기4','정답','모범답안','해설'];
    const rows = items.map(i => [compName(i.comp_id), teamName(i.team_id), CONST.TYPES[i.item_type], i.grade,
      i.question, i.option1||'', i.option2||'', i.option3||'', i.option4||'',
      i.answer||'', i.model_answer||'', i.explanation||'']);
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '전체문항_' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
  }

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'th-open') { window.location.href = 'theory.html?comp=' + encodeURIComponent(b.dataset.id); return; }
    if (act === 'th-toggle') {
      UI.showLoading('저장 중...');
      const ok = await API.setDevDone(b.dataset.id, b.dataset.v === '1');
      UI.hideLoading();
      if (ok) { UI.toast('완료 상태를 변경했습니다.', 'success'); window.renderCompsTab && window.renderCompsTab(); }
      else UI.toast('저장 실패', 'error');
      return;
    }
    if (act === 'add-team') openTeamModal(null);
    if (act === 'team-close') UI.modal('team-modal', false);
    if (act === 'edit-team') openTeamModal(teams.find(t => t.team_id === b.dataset.id));
    if (act === 'del-team') {
      if (!(await UI.confirm('이 조를 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteTeam(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); loadTeams(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'team-save') {
      const id = document.getElementById('team-modal-id').value;
      const name = document.getElementById('team-modal-name').value.trim();
      const classVal = document.getElementById('team-modal-class').value;
      const classNo = classVal ? Number(classVal) : null;
      if (!name) { UI.toast('직무명을 입력해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...');
      const ok = id ? await API.updateTeam(id, name, classNo) : !!(await API.addTeam(name, classNo));
      UI.hideLoading();
      if (ok) { UI.toast('저장되었습니다.', 'success'); UI.modal('team-modal', false); loadTeams(); }
      else UI.toast('저장 실패', 'error');
    }
    if (act === 'add-comp') openCompModal(null);
    if (act === 'comp-close') UI.modal('comp-modal', false);
    if (act === 'edit-comp') openCompModal(comps.find(c => c.comp_id === b.dataset.id));
    if (act === 'del-comp') {
      if (!(await UI.confirm('이 역량을 삭제하시겠습니까?\n연결된 문항은 남아 있을 수 있습니다.'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteCompetency(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); renderCompsTab(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'comp-save') {
      const id = document.getElementById('comp-modal-id').value;
      const body = {
        comp_name: document.getElementById('comp-modal-name').value.trim(),
        category : document.getElementById('comp-modal-cat').value.trim() || null,
        team_id  : document.getElementById('comp-modal-team').value,
        target_count: Number(document.getElementById('comp-modal-target').value) || 0,
        order_index : Number(document.getElementById('comp-modal-order').value) || 0,
        description : document.getElementById('comp-modal-desc').value.trim() || null
      };
      if (!body.comp_name) { UI.toast('역량명을 입력해주세요.', 'warning'); return; }
      if (!body.team_id)   { UI.toast('담당 조를 선택해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...');
      const ok = id ? await API.updateCompetency(Object.assign({ comp_id: id }, body))
                    : !!(await API.addCompetency(body));
      UI.hideLoading();
      if (ok) { UI.toast('저장되었습니다.', 'success'); UI.modal('comp-modal', false); renderCompsTab(); }
      else UI.toast('저장 실패', 'error');
    }
    if (act === 'dash-refresh') renderDashTab();
    if (act === 'dash-csv') exportCsv();
    if (act === 'del-notice') {
      if (!(await UI.confirm('이 공지를 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteNotice(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); renderNotices(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'add-notice') openNoticeModal(null);
    if (act === 'notice-close') UI.modal('notice-modal', false);
    if (act === 'edit-notice') openNoticeModal(notices.find(n => n.notice_id === b.dataset.id));
    if (act === 'notice-save') {
      const id = document.getElementById('notice-modal-id').value;
      const title = document.getElementById('notice-modal-title-in').value.trim();
      const content = document.getElementById('notice-modal-content').value.trim();
      const isCommon = document.querySelector('input[name="notice-scope"]:checked').value === 'common';
      const team_ids = Array.from(document.querySelectorAll('#notice-teams-box input:checked')).map(x => x.value);
      if (!title)   { UI.toast('제목을 입력해주세요.', 'warning'); return; }
      if (!content) { UI.toast('내용을 입력해주세요.', 'warning'); return; }
      if (!isCommon && !team_ids.length) { UI.toast('대상 조를 1개 이상 선택해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...');
      const ok = !!(await API.saveNotice({
        notice_id: id || undefined, title, content,
        is_common: isCommon, team_ids,
        is_pinned: document.getElementById('notice-modal-pin').checked
      }));
      UI.hideLoading();
      if (ok) { UI.toast('저장되었습니다.', 'success'); UI.modal('notice-modal', false); renderNotices(); }
      else UI.toast('저장 실패', 'error');
    }
    if (act === 'help-default') {
      const role = document.getElementById('help-role').value || 'sme';
      document.getElementById('help-body-edit').value = (window.DEFAULT_HELP && window.DEFAULT_HELP[role]) || '';
      updateHelpPreview();
    }
    if (act === 'help-save') {
      const role = document.getElementById('help-role').value || 'sme';
      const body = document.getElementById('help-body-edit').value.trim();
      if (!body) { UI.toast('내용을 입력해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...');
      const ok = await API.saveHelpText(role, body);
      UI.hideLoading();
      UI.toast(ok ? '저장되었습니다.' : '저장 실패', ok ? 'success' : 'error');
    }
  });

  document.body.addEventListener('change', (e) => {
    if (e.target.name === 'notice-scope') {
      document.getElementById('notice-teams-group').style.display =
        e.target.value === 'teams' ? 'block' : 'none';
    }
  });

  // ---- 🔗 자동화 문항 가져오기 ----
  let _impValidated = [];   // validateAutomationRows 결과
  let _impGroups = [];      // [{job, area, rows:[idx...], compSelId}]

  function renderImportTab() {
    document.getElementById('imp-summary').textContent = '문항_DB.xlsx 파일을 선택하세요.';
    document.getElementById('imp-map').innerHTML = '';
    document.getElementById('imp-result').innerHTML = '';
    document.getElementById('imp-run').disabled = true;
  }
  window.renderImportTab = renderImportTab;

  async function _impOnFile(file) {
    if (!window._adminTeams) await loadTeams();
    const comps = await API.getCompetencies();
    window._impComps = comps;
    UI.showLoading('원본 파싱 중...');
    let rows;
    try { rows = await XlsxTool.parseAutomationFile(file); }
    catch (e) { UI.hideLoading(); UI.toast('파일 파싱 실패: ' + e.message, 'error'); return; }
    _impValidated = XlsxTool.validateAutomationRows(rows);
    UI.hideLoading();

    const okN = _impValidated.filter(v => v.ok).length;
    const ngN = _impValidated.length - okN;
    document.getElementById('imp-summary').innerHTML =
      '총 <b>' + _impValidated.length + '</b>행 · 유효 <b>' + okN + '</b> · 오류 <b>' + ngN + '</b>' +
      (ngN ? ' <span style="color:var(--danger,#c0392b);">(오류행은 저장에서 제외)</span>' : '');

    // (직무·역량명) 그룹화 — 유효행만. 파일에 역량코드가 있으면 프리필 후보로 보관.
    const gmap = {};
    _impValidated.forEach((v, i) => {
      if (!v.ok) return;
      const key = v.data._job + ' ▸ ' + v.data._area;
      if (!gmap[key]) gmap[key] = { job: v.data._job, area: v.data._area, rows: [], compId: v.data._compId || '' };
      gmap[key].rows.push(i);
    });
    _impGroups = Object.keys(gmap).map((k, gi) => ({
      job: gmap[k].job, area: gmap[k].area, rows: gmap[k].rows,
      compId: gmap[k].compId, compSelId: 'imp-comp-' + gi
    }));

    const compOpts = '<option value="">— 역량 선택 —</option>' +
      comps.map(c => '<option value="' + escHtml(c.comp_id) + '">' +
        escHtml(c.comp_name) + ' (' + escHtml(teamName(c.team_id)) + ')</option>').join('');

    document.getElementById('imp-map').innerHTML = _impGroups.length ?
      '<table class="admin-table"><thead><tr><th>원본 (직무 ▸ 역량명)</th><th>문항수</th><th>→ item-dev 역량</th></tr></thead><tbody>' +
      _impGroups.map(g =>
        '<tr><td>' + escHtml(g.job) + ' ▸ ' + escHtml(g.area || '(역량명 없음)') + '</td>' +
        '<td class="td-center">' + g.rows.length + '</td>' +
        '<td><select class="form-control form-select" id="' + g.compSelId + '">' + compOpts + '</select></td></tr>'
      ).join('') + '</tbody></table>'
      : '<p class="table-empty">유효한 문항이 없습니다.</p>';

    // 파일에 역량코드가 채워져 있고 해당 comp가 존재하면 드롭다운 자동 선택
    _impGroups.forEach(g => {
      if (g.compId && comps.some(c => c.comp_id === g.compId)) {
        const sel = document.getElementById(g.compSelId); if (sel) sel.value = g.compId;
      }
    });

    document.getElementById('imp-run').disabled = !_impGroups.length;
  }

  async function _impRun() {
    const jobs = [];
    for (const g of _impGroups) {
      const compId = document.getElementById(g.compSelId).value;
      if (!compId) { UI.toast('모든 그룹에 역량을 지정하세요: ' + g.job + ' ▸ ' + g.area, 'warning'); return; }
      const comp = (window._impComps || []).find(c => c.comp_id === compId);
      if (!comp) { UI.toast('역량을 찾을 수 없습니다.', 'error'); return; }
      jobs.push({ g, compId, teamId: comp.team_id });
    }
    const ok = await UI.confirm('선택한 그룹의 문항을 저장합니다. 계속할까요?');
    if (!ok) return;

    UI.showLoading('저장 중...');
    let saved = 0, failed = 0;
    for (const j of jobs) {
      for (const idx of j.g.rows) {
        const d = _impValidated[idx].data;
        const res = await API.saveItem({
          comp_id: j.compId, team_id: j.teamId,
          item_type: d.item_type, grade: d.grade, bloom: d.bloom,
          question: d.question, option1: d.option1, option2: d.option2,
          option3: d.option3, option4: d.option4, answer: d.answer,
          model_answer: d.model_answer, explanation: d.explanation
        });
        if (res) saved++; else failed++;
      }
    }
    UI.hideLoading();
    document.getElementById('imp-result').innerHTML =
      '<div class="dash-stat"><b>저장 완료</b> — 성공 ' + saved + ' · 실패 ' + failed + '</div>';
    UI.toast('저장: 성공 ' + saved + ' / 실패 ' + failed, failed ? 'warning' : 'success');
  }

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'imp-file' && e.target.files[0]) _impOnFile(e.target.files[0]);
  });
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'imp-run') _impRun();
  });

  loadTeams();
})();
