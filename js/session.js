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
  const HELP_TITLE = { sme: 'SME 사용법 — 워크샵 진행 순서', coach: '교수(코치) 사용법', admin: '관리자 사용법' };
  const DEFAULT_HELP = {
    sme: [
      '진입 — 역할에서 SME를 선택하고 담당 조(직무명)·분반을 고릅니다. 비밀번호는 없습니다.',
      '공지 확인 — 화면 상단 공지사항(공통 + 우리 조)을 확인합니다. 고정 공지를 먼저 봅니다.',
      '역량 선택 — 우리 조에 할당된 역량 카드를 클릭해 문항 개발 화면으로 들어갑니다.',
      '문항 개발(생성형 AI) — A) 샘플 문항 뱅크에서 관련 샘플을 다운로드해 AI로 우리 직무에 맞게 변형·확장  B) 본인 지식·내부 자료를 AI에 전달해 신규 문항 생성. (AI 프롬프트 문구는 워크샵에서 안내)',
      '문항 등록 — AI 결과를 검토·수정한 뒤 폼 입력 또는 엑셀 일괄 업로드. 급수(3급~1급 심화)·해설은 모든 문항 필수, 객관식은 보기 4개·정답 필수.',
      '이미지 첨부 — 필요 시 영역(문항/보기/해설/모범답안)별로 이미지를 첨부·다운로드합니다.',
      '코칭 반영 — 교수·관리자 코멘트를 확인·수정한 뒤 [반영 완료]를 체크합니다.'
    ].join('\n'),
    coach: [
      '역량 필터 — 상단 역량 필터로 담당 역량의 문항만 모아 봅니다.',
      '코멘트 작성 — 문항을 검토하고 코멘트를 작성합니다(작성자는 "교수"로 기록).',
      '수정·삭제 — 본인이 단 코멘트는 수정·삭제할 수 있습니다.'
    ].join('\n'),
    admin: [
      '조·역량 관리 — 조/역량을 등록하고 담당조·목표수량을 지정합니다.',
      '진척 대시보드 — 역량별/조별 달성률을 확인합니다.',
      '코멘트 — 교수와 동일하게 코멘트를 작성할 수 있습니다.',
      '공지·사용법 관리 — 공지 관리 탭에서 공지를, 사용법 관리 탭에서 역할별 사용법을 편집합니다.'
    ].join('\n')
  };
  function renderHelpBody(role, body) {
    const title = HELP_TITLE[role] || '사용법';
    const items = String(body == null ? '' : body).split('\n')
      .map(l => l.trim()).filter(l => l)
      .map(l => {
        const e = escHtml(l);
        const i = e.indexOf('—');   // em dash
        return i > 0
          ? '<li><b>' + e.slice(0, i).trim() + '</b> — ' + e.slice(i + 1).trim() + '</li>'
          : '<li>' + e + '</li>';
      }).join('');
    return '<h3>' + escHtml(title) + '</h3><ol class="help-steps">' + items + '</ol>';
  }
  async function openHelp() {
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
    const bodyEl = document.getElementById('help-body');
    bodyEl.innerHTML = '<p style="color:#888;">불러오는 중…</p>';
    el.style.display = 'flex';
    let body = null;
    try { if (window.API && API.getHelpText) body = await API.getHelpText(role); } catch (e) { console.error(e); }
    if (!body) body = DEFAULT_HELP[role] || DEFAULT_HELP.sme;
    bodyEl.innerHTML = renderHelpBody(role, body);
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
  return { set, get, clear, requireRole, renderNav, openHelp, renderHelpBody, DEFAULT_HELP };
})();
window.Session = Session;
window.renderHelpBody = Session.renderHelpBody;
window.DEFAULT_HELP = Session.DEFAULT_HELP;
