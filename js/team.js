(function () {
  if (!Session.requireRole('sme')) return;
  Session.renderNav();
  const s = Session.get();
  document.getElementById('team-title').textContent = s.team_name || '우리 조';

  function rate(count, target) {
    const t = Number(target) || 0; if (!t) return 0;
    return Math.round((Number(count) || 0) / t * 100);
  }
  function card(c, cnt, target, unresolved, mine) {
    const r = rate(cnt, target);
    const over = r > 100;
    const unres = unresolved[c.comp_id] || 0;
    return '<div class="comp-card" data-comp="' + escHtml(c.comp_id) + '" data-mine="' + (mine ? 1 : 0) + '">' +
      '<div class="comp-card-top"><span class="comp-name">' + escHtml(c.comp_name) + '</span>' +
        (unres ? '<span class="comp-unres">💬 ' + unres + '</span>' : '') + '</div>' +
      (c.category ? '<span class="comp-cat">' + escHtml(c.category) + '</span>' : '') +
      '<div class="comp-progress"><div class="comp-progress-head">' +
        '<span>' + cnt + ' / ' + target + '</span>' +
        '<span class="comp-rate' + (over ? ' over' : '') + '">' + r + '%' + (over ? ' 초과 ✅' : '') + '</span></div>' +
        '<div class="comp-bar"><div class="comp-bar-fill" style="width:' + Math.min(r, 100) + '%"></div></div></div>' +
      '<div class="comp-go">' + (mine ? '✏️ 문항 작성 →' : '👁 읽기 전용 →') + '</div>' +
      (mine ? (function () { const done = isDevDone(c, s.team_id); return '<button class="btn ' + (done ? 'btn-primary' : 'btn-secondary') +
        ' btn-sm th-open" data-comp="' + escHtml(c.comp_id) + '" data-done="' + (done ? 1 : 0) +
        '" style="margin-top:8px;width:100%;">📘 이론서 개발</button>'; })() : '') +
      '</div>';
  }

  // 다른 조 역량: 진척 표(각 행=역량, 헤더 클릭 정렬, 클릭 시 items 읽기전용 이동)
  const otherState = { list: [], counts: {}, teamMap: {} };
  const otherSort = { key: null, dir: 1 };
  const OTHER_COLS = {
    name    : { type: 'str', get: c => c.comp_name },
    category: { type: 'str', get: c => c.category || '' },
    team    : { type: 'str', get: c => compTeamIds(c).map(id => otherState.teamMap[id] || '').join(', ') },
    count   : { type: 'num', get: c => otherState.counts[c.comp_id] || 0 },
    rate    : { type: 'num', get: c => rate(otherState.counts[c.comp_id] || 0, compTotalTarget(c)) },
  };
  function sortOther(list) {
    const st = otherSort; if (!st.key) return list.slice();
    const col = OTHER_COLS[st.key]; if (!col) return list.slice();
    return list.slice().sort((a, b) => {
      const va = col.get(a), vb = col.get(b);
      if (col.type === 'num') return ((Number(va) || 0) - (Number(vb) || 0)) * st.dir;
      return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'ko') * st.dir;
    });
  }
  function thCell(key, label) {
    const cls = 'sortable' + (otherSort.key === key ? (otherSort.dir === 1 ? ' sorted-asc' : ' sorted-desc') : '');
    return '<th class="' + cls + '" data-sort-key="' + key + '">' + label + '</th>';
  }
  function otherTable(list) {
    const rows = sortOther(list).map(c => {
      const cnt = otherState.counts[c.comp_id] || 0;
      const tgt = compTotalTarget(c);
      const r = rate(cnt, tgt);
      const over = r > 100;
      const teams = compTeamIds(c).map(id => otherState.teamMap[id] || '-').join(', ');
      return '<tr class="comp-row" data-comp="' + escHtml(c.comp_id) + '" data-mine="0">' +
        '<td class="ot-name">' + escHtml(c.comp_name) + '</td>' +
        '<td class="ot-cat">' + escHtml(c.category || '-') + '</td>' +
        '<td class="ot-team">' + escHtml(teams || '-') + '</td>' +
        '<td class="ot-cnt">' + cnt + ' / ' + tgt + '</td>' +
        '<td class="ot-rate' + (over ? ' over' : '') + '">' + r + '%' + (over ? ' 초과 ✅' : '') + '</td>' +
        '</tr>';
    }).join('');
    return '<table class="other-table"><thead><tr>' +
      thCell('name', '역량명') + thCell('category', '카테고리') + thCell('team', '담당조') +
      thCell('count', '문항수/목표') + thCell('rate', '달성률') +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function renderOther() {
    document.getElementById('other-grid').innerHTML = otherState.list.length
      ? otherTable(otherState.list)
      : '<div class="empty-state">다른 조 역량이 없습니다.</div>';
  }

  async function load() {
    UI.showLoading('역량 불러오는 중...');
    const [comps, myCounts, allCounts, teams] = await Promise.all([
      API.getCompetencies(), API.getItemCounts(s.team_id), API.getItemCounts(), API.getTeams()
    ]);
    const unresolved = (API.getUnresolvedCounts ? await API.getUnresolvedCounts() : {});
    const teamMap = {}; teams.forEach(t => { teamMap[t.team_id] = t.team_name; });
    UI.hideLoading();

    const mine = comps.filter(c => compTeamIds(c).indexOf(s.team_id) >= 0);
    const others = comps.filter(c => compTeamIds(c).indexOf(s.team_id) < 0);

    // 전체 달성률(우리 조): 내 조 문항수 / 내 조 배정 목표 합
    const totCnt = mine.reduce((a, c) => a + (myCounts[c.comp_id] || 0), 0);
    const totTgt = mine.reduce((a, c) => { const asg = assignmentFor(c, s.team_id); return a + (asg ? Number(asg.target_count) || 0 : 0); }, 0);
    document.getElementById('team-rate').textContent = rate(totCnt, totTgt) + '%';

    document.getElementById('comp-grid').innerHTML = mine.length
      ? mine.map(c => { const asg = assignmentFor(c, s.team_id); return card(c, myCounts[c.comp_id] || 0, asg ? asg.target_count : 0, unresolved, true); }).join('')
      : '<div class="empty-state">할당된 역량이 없습니다. 관리자에게 문의하세요.</div>';
    otherState.list = others;
    otherState.counts = allCounts;
    otherState.teamMap = teamMap;
    renderOther();
  }

  async function loadNotices() {
    const box = document.getElementById('notice-box');
    if (!box) return;
    const list = await API.getNoticesForTeam(s.team_id);
    if (!list.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = '<div class="notice-head">📢 공지사항</div>' +
      '<div class="notice-list">' + list.map(n =>
        '<div class="notice-card' + (n.is_pinned ? ' pinned' : ' collapsed') + '">' +
          '<div class="notice-top">' +
            (n.is_pinned ? '<span class="notice-pin">📌</span>' : '') +
            '<span class="notice-badge ' + (n.is_common ? 'common' : 'team') + '">' +
              (n.is_common ? '공통' : '우리 조') + '</span>' +
            '<span class="notice-title">' + escHtml(n.title) + '</span>' +
            '<span class="notice-toggle">▾</span>' +
          '</div>' +
          '<div class="notice-content">' + escHtml(n.content) + '</div>' +
        '</div>').join('') + '</div>';
  }
  // 공지 카드 펼침/접힘(아코디언): 고정은 펼침, 나머지는 제목 클릭 시 토글
  (function () {
    const box = document.getElementById('notice-box');
    if (box) box.addEventListener('click', (e) => {
      const top = e.target.closest('.notice-top'); if (!top) return;
      top.parentElement.classList.toggle('collapsed');
    });
  })();

  document.querySelector('.page-wrapper').addEventListener('click', (e) => {
    const sortTh = e.target.closest('.other-table th[data-sort-key]');
    if (sortTh) {
      const key = sortTh.dataset.sortKey;
      if (otherSort.key === key) otherSort.dir = -otherSort.dir; else { otherSort.key = key; otherSort.dir = 1; }
      renderOther();
      return;
    }
    const th = e.target.closest('.th-open');
    if (th) {
      e.stopPropagation();
      if (th.dataset.done === '1') {
        window.location.href = 'theory.html?comp=' + encodeURIComponent(th.dataset.comp) + '&team=' + encodeURIComponent(s.team_id);
      } else {
        UI.toast('문항 개발 완료 필요 — items 화면에서 "문항개발 완료"를 체크하세요.', 'warning');
      }
      return;
    }
    const card = e.target.closest('.comp-card, .comp-row'); if (!card) return;
    const mine = card.dataset.mine === '1';
    window.location.href = 'items.html?comp_id=' + encodeURIComponent(card.dataset.comp) + (mine ? '&mine=1' : '');
  });

  // 페이지가 표시될 때마다(최초 로드 + 뒤로가기 bfcache 복원) 진도율 최신화
  // → 문항 작성 후 돌아오면 카운트가 항상 반영됨
  window.addEventListener('pageshow', () => { load(); loadNotices(); });
})();
