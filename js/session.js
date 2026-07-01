const Session = (() => {
  const KEY = 'itemdev_session';
  function set(o) { sessionStorage.setItem(KEY, JSON.stringify(o)); }
  function get() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } }
  function clear() { sessionStorage.removeItem(KEY); }
  function requireRole(role) {
    const s = get();
    if (!s || s.role !== role) { window.location.href = 'entry.html'; return false; }
    return true;
  }
  const helpContent = {
    sme: '<h3>SME 사용법</h3><ol>' +
      '<li>우리 조에 할당된 <b>역량 카드</b>를 클릭합니다.</li>' +
      '<li><b>+ 문항 추가</b>로 객관식/서술형 문항을 작성하거나, <b>엑셀 일괄 업로드</b>로 한 번에 올립니다.</li>' +
      '<li>이미지는 문항 작성 창에서 <b>영역(문항/보기/해설)</b>을 골라 첨부합니다.</li>' +
      '<li>교수·관리자 <b>코멘트</b>를 확인하고 수정한 뒤 <b>[반영 완료]</b>를 체크합니다.</li></ol>',
    coach: '<h3>교수(코치) 사용법</h3><ol>' +
      '<li>상단 <b>역량 필터</b>로 담당 역량의 문항만 모아 봅니다.</li>' +
      '<li>문항을 검토하고 <b>코멘트</b>를 작성합니다(작성자는 "교수"로 기록).</li>' +
      '<li>본인이 단 코멘트는 수정·삭제할 수 있습니다.</li></ol>',
    admin: '<h3>관리자 사용법</h3><ol>' +
      '<li><b>조 관리</b>·<b>역량 관리</b>에서 조/역량을 등록하고 담당조·목표수량을 지정합니다.</li>' +
      '<li><b>진척 대시보드</b>에서 역량별/조별 달성률을 확인합니다.</li>' +
      '<li><b>코멘트</b> 화면은 교수와 동일하게 사용할 수 있습니다.</li></ol>'
  };
  function openHelp() {
    const s = get(); const role = s ? s.role : 'sme';
    let el = document.getElementById('help-modal');
    if (!el) {
      el = document.createElement('div'); el.id = 'help-modal'; el.className = 'modal-backdrop';
      el.innerHTML = '<div class="modal"><div class="modal-header"><h2 class="modal-title">❓ 사용법</h2>' +
        '<button class="modal-close" data-h="close">✕</button></div>' +
        '<div class="modal-body" id="help-body"></div></div>';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-h="close"]') || e.target === el) el.style.display = 'none';
      });
    }
    document.getElementById('help-body').innerHTML = helpContent[role] || helpContent.sme;
    el.style.display = 'flex';
  }
  function renderNav() {
    const nav = document.getElementById('navbar'); if (!nav) return;
    const s = get();
    const label = !s ? '' : (s.role === 'sme'
      ? '<span class="nav-job">' + escHtml(s.team_name || '조') + '</span>'
      : '<span class="nav-badge-admin">' + (CONST.ROLE_LABEL[s.role] || '') + '</span>');
    nav.innerHTML = '<div class="nav-inner">' +
      '<a href="' + homeFor(s) + '" class="nav-logo">' +
        '<img src="assets/hyundai-logo.png" class="nav-logo-img" alt="Hyundai">' +
        '<span class="nav-title">핵심기술직무 문항개발 워크샵</span></a>' +
      '<div class="nav-menu">' + label +
        '<button class="btn-logout" data-nav="help">❓ 사용법</button>' +
        '<button class="btn-logout" data-nav="exit">나가기</button>' +
      '</div></div>';
    nav.onclick = (e) => {
      const b = e.target.closest('[data-nav]'); if (!b) return;
      if (b.dataset.nav === 'help') openHelp();
      if (b.dataset.nav === 'exit') { clear(); window.location.href = 'entry.html'; }
    };
  }
  function homeFor(s) {
    if (!s) return 'entry.html';
    return s.role === 'sme' ? 'team.html' : (s.role === 'coach' ? 'review.html' : 'admin.html');
  }
  return { set, get, clear, requireRole, renderNav, openHelp, helpContent };
})();
window.Session = Session;
