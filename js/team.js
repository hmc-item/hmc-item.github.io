(function () {
  if (!Session.requireRole('sme')) return;
  Session.renderNav();
  const s = Session.get();
  document.getElementById('team-title').textContent = s.team_name || '우리 조';

  function rate(count, target) {
    const t = Number(target) || 0; if (!t) return 0;
    return Math.round((Number(count) || 0) / t * 100);
  }
  function card(c, counts, unresolved, mine) {
    const cnt = counts[c.comp_id] || 0;
    const target = c.target_count != null ? c.target_count : 50;
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
      (mine ? '<button class="btn ' + (c.dev_done ? 'btn-primary' : 'btn-secondary') +
        ' btn-sm th-open" data-comp="' + escHtml(c.comp_id) + '" data-done="' + (c.dev_done ? 1 : 0) +
        '" style="margin-top:8px;width:100%;">📘 이론서 개발' + (c.dev_done ? '' : ' 🔒') + '</button>' : '') +
      '</div>';
  }

  async function load() {
    UI.showLoading('역량 불러오는 중...');
    const [comps, counts] = await Promise.all([API.getCompetencies(), API.getItemCounts()]);
    const unresolved = (API.getUnresolvedCounts ? await API.getUnresolvedCounts() : {}); // Task 13에서 연결
    UI.hideLoading();

    const mine = comps.filter(c => c.team_id === s.team_id);
    const others = comps.filter(c => c.team_id !== s.team_id);

    // 전체 달성률(우리 조)
    const totCnt = mine.reduce((a, c) => a + (counts[c.comp_id] || 0), 0);
    const totTgt = mine.reduce((a, c) => a + (Number(c.target_count) || 0), 0);
    document.getElementById('team-rate').textContent = rate(totCnt, totTgt) + '%';

    document.getElementById('comp-grid').innerHTML = mine.length
      ? mine.map(c => card(c, counts, unresolved, true)).join('')
      : '<div class="empty-state">할당된 역량이 없습니다. 관리자에게 문의하세요.</div>';
    document.getElementById('other-grid').innerHTML = others.length
      ? others.map(c => card(c, counts, unresolved, false)).join('')
      : '<div class="empty-state">다른 조 역량이 없습니다.</div>';
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
    const th = e.target.closest('.th-open');
    if (th) {
      e.stopPropagation();
      if (th.dataset.done === '1') {
        window.location.href = 'theory.html?comp=' + encodeURIComponent(th.dataset.comp);
      } else {
        UI.toast('문항 개발 완료 필요 — items 화면에서 "문항개발 완료"를 체크하세요.', 'warning');
      }
      return;
    }
    const card = e.target.closest('.comp-card'); if (!card) return;
    const mine = card.dataset.mine === '1';
    window.location.href = 'items.html?comp_id=' + encodeURIComponent(card.dataset.comp) + (mine ? '&mine=1' : '');
  });

  // 페이지가 표시될 때마다(최초 로드 + 뒤로가기 bfcache 복원) 진도율 최신화
  // → 문항 작성 후 돌아오면 카운트가 항상 반영됨
  window.addEventListener('pageshow', () => { load(); loadNotices(); });
})();
