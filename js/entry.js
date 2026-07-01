(function () {
  const grid = document.querySelector('.role-grid');
  const teamPick = document.getElementById('team-pick');
  const teamSelect = document.getElementById('team-select');

  grid.addEventListener('click', async (e) => {
    const b = e.target.closest('.role-btn'); if (!b) return;
    const role = b.dataset.role;
    if (role === 'coach') { Session.set({ role: 'coach' }); window.location.href = 'review.html'; return; }
    if (role === 'admin') { Session.set({ role: 'admin' }); window.location.href = 'admin.html'; return; }
    // SME → 조 선택 노출
    teamPick.style.display = 'block';
    UI.showLoading('조 목록 불러오는 중...');
    const { data, error } = await DB.from('teams').select('*').order('team_name');
    UI.hideLoading();
    if (error) { UI.toast('조 목록 불러오기 실패', 'error'); return; }
    teamSelect.innerHTML = '<option value="">조를 선택하세요</option>' +
      (data || []).map(t => '<option value="' + escHtml(t.team_id) + '" data-name="' +
        escHtml(t.team_name) + '">' + escHtml(t.team_name) + '</option>').join('');
  });

  document.getElementById('team-enter').addEventListener('click', () => {
    const opt = teamSelect.options[teamSelect.selectedIndex];
    if (!teamSelect.value) { UI.toast('조를 선택해주세요.', 'warning'); return; }
    Session.set({ role: 'sme', team_id: teamSelect.value, team_name: opt.dataset.name });
    window.location.href = 'team.html';
  });
})();
