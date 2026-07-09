(function () {
  const grid = document.querySelector('.role-grid');
  const classPick = document.getElementById('class-pick');
  const teamPick = document.getElementById('team-pick');
  const teamSelect = document.getElementById('team-select');
  let allTeams = [];

  const ROLE_KEY = { sme: 'SME', coach: '교수', admin: '관리자' };

  grid.addEventListener('click', async (e) => {
    const b = e.target.closest('.role-btn'); if (!b) return;
    const role = b.dataset.role;

    const ok = await AuthGate.require(ROLE_KEY[role]);
    if (!ok) return;   // 취소·인증 실패 시 역할 선택 화면 유지

    if (role === 'coach') { Session.set({ role: 'coach' }); window.location.href = 'review.html'; return; }
    if (role === 'admin') { Session.set({ role: 'admin' }); window.location.href = 'admin.html'; return; }
    // SME → 분반 선택 노출
    classPick.style.display = 'block';
    teamPick.style.display = 'none';
    UI.showLoading('조 목록 불러오는 중...');
    const { data, error } = await DB.from('teams').select('*').order('team_name');
    UI.hideLoading();
    if (error) { UI.toast('조 목록 불러오기 실패', 'error'); return; }
    allTeams = data || [];
  });

  classPick.addEventListener('click', (e) => {
    const b = e.target.closest('.class-btn'); if (!b) return;
    classPick.querySelectorAll('.class-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const cls = Number(b.dataset.class);
    const teams = allTeams.filter(t => Number(t.class_no) === cls);
    teamSelect.innerHTML = teams.length
      ? '<option value="">조를 선택하세요</option>' + teams.map(t =>
          '<option value="' + escHtml(t.team_id) + '" data-name="' + escHtml(t.team_name) +
          '" data-class="' + cls + '">' + escHtml(t.team_name) + '</option>').join('')
      : '<option value="">이 분반에 배정된 조가 없습니다</option>';
    teamPick.style.display = 'block';
  });

  document.getElementById('team-enter').addEventListener('click', () => {
    const opt = teamSelect.options[teamSelect.selectedIndex];
    if (!teamSelect.value) { UI.toast('조를 선택해주세요.', 'warning'); return; }
    Session.set({ role: 'sme', class_no: Number(opt.dataset.class),
      team_id: teamSelect.value, team_name: opt.dataset.name });
    window.location.href = 'team.html';
  });
})();
