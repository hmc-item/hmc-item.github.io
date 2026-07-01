(function () {
  if (!Session.requireRole('admin')) return;
  Session.renderNav();

  let teams = [];

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
  });

  // ---- 조 관리 ----
  async function loadTeams() {
    teams = await API.getTeams();
    window._adminTeams = teams; // 다른 탭 공유
    const tb = document.getElementById('teams-tbody');
    tb.innerHTML = teams.length ? teams.map(t =>
      '<tr><td><strong>' + escHtml(t.team_name) + '</strong></td>' +
      '<td class="td-center">' + escHtml(String(t.created_at || '').slice(0,10)) + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn btn-secondary btn-sm" data-act="edit-team" data-id="' + escHtml(t.team_id) + '">수정</button>' +
        '<button class="btn btn-danger btn-sm" data-act="del-team" data-id="' + escHtml(t.team_id) + '">삭제</button>' +
      '</td></tr>').join('')
      : '<tr><td colspan="3" class="table-empty">등록된 조가 없습니다.</td></tr>';
  }
  window.adminReloadTeams = loadTeams;

  function openTeamModal(team) {
    document.getElementById('team-modal-id').value = team ? team.team_id : '';
    document.getElementById('team-modal-name').value = team ? team.team_name : '';
    document.getElementById('team-modal-title').textContent = team ? '조 수정' : '조 추가';
    UI.modal('team-modal', true);
  }

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
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
      if (!name) { UI.toast('직무명을 입력해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...');
      const ok = id ? await API.updateTeam(id, name) : !!(await API.addTeam(name));
      UI.hideLoading();
      if (ok) { UI.toast('저장되었습니다.', 'success'); UI.modal('team-modal', false); loadTeams(); }
      else UI.toast('저장 실패', 'error');
    }
  });

  loadTeams();
})();
