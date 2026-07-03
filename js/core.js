// ===== Supabase client =====
const { createClient } = supabase;
const DB = createClient(SUPABASE_URL, SUPABASE_KEY);
window.DB = DB;

// ===== 유틸 =====
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}
// Supabase Storage 객체 키는 ASCII만 허용(한글·특수문자 포함 시 Invalid key 400).
// 스토리지 경로용으로만 사용 — 원본 파일명은 DB(file_name)에 그대로 보존해 화면 표시.
function safeKey(name) {
  return String(name == null ? '' : name).replace(/[^\w.\-]/g, '_');
}
// DELETE + INSERT (PATCH/upsert 금지)
async function saveRow(table, matchCol, matchVal, rowObj) {
  if (matchVal != null) {
    const { error: delErr } = await DB.from(table).delete().eq(matchCol, matchVal);
    if (delErr) { console.error('[saveRow.delete]', table, delErr); return false; }
  }
  const { error: insErr } = await DB.from(table).insert(rowObj);
  if (insErr) { console.error('[saveRow.insert]', table, insErr); return false; }
  return true;
}
// ===== 자동화 원본 정규화 헬퍼 (문항_DB.xlsx 흡수용) =====
// 발문·보기·해설 끝의 "\n---" 구분자·잉여 공백 제거
function stripMarkers(s) {
  s = String(s == null ? '' : s);
  s = s.replace(/\s*\n\s*-{2,}\s*$/g, '');   // 끝의 --- 라인
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
// 정답: "②\n\n---" / "2" / "② 유량제어..." → 1~4 (없으면 null)
const _CIRCLE_NUM = { '①': '1', '②': '2', '③': '3', '④': '4' };
function normAnswer(s) {
  s = stripMarkers(s);
  for (const k in _CIRCLE_NUM) s = s.split(k).join(_CIRCLE_NUM[k]);
  const m = s.match(/[1-4]/);
  return m ? Number(m[0]) : null;
}
// 유형: "객관식 4지택일\n\n---" → mcq / "주관식 서술"·"서술형" → essay
function normType(s) {
  s = String(s || '');
  if (s.indexOf('객관식') >= 0) return 'mcq';
  if (s.indexOf('주관식') >= 0 || s.indexOf('서술') >= 0 || s.indexOf('단답') >= 0) return 'essay';
  return (window.CONST && CONST.TYPE_FROM_LABEL[s.trim()]) || '';
}
// 급수: "심화"/"1급 심화" → "1급 심화", "1급"/"2급"/"3급" 매칭
function normGrade(s) {
  s = String(s || '').trim();
  if (s.indexOf('심화') >= 0) return '1급 심화';
  for (const g of ['1급', '2급', '3급']) if (s.indexOf(g) >= 0) return g;
  return s;
}
window.stripMarkers = stripMarkers; window.normAnswer = normAnswer;
window.normType = normType; window.normGrade = normGrade;
window.escHtml = escHtml; window.generateId = generateId; window.saveRow = saveRow; window.safeKey = safeKey;

// ===== UI: 로딩/토스트/모달/확인 =====
const UI = (() => {
  function showLoading(msg) {
    let el = document.getElementById('global-loading');
    if (!el) {
      el = document.createElement('div'); el.id = 'global-loading';
      el.innerHTML = '<div class="loading-backdrop"><div class="loading-box">' +
        '<div class="loading-spinner"></div><p class="loading-msg" id="loading-msg-text"></p></div></div>';
      document.body.appendChild(el);
    }
    document.getElementById('loading-msg-text').textContent = msg || '불러오는 중...';
    el.style.display = 'flex';
  }
  function hideLoading() {
    const el = document.getElementById('global-loading'); if (el) el.style.display = 'none';
  }
  function toast(msg, type, dur) {
    type = type || 'info'; dur = dur || 3000;
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
      '<span class="toast-msg">' + escHtml(msg) + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.classList.add('toast-hide'); setTimeout(() => t.remove(), 400); }, dur);
  }
  function modal(id, open) {
    const el = document.getElementById(id); if (!el) return;
    el.style.display = open ? 'flex' : 'none';
  }
  function confirm(msg) {
    return new Promise(resolve => {
      let el = document.getElementById('ui-confirm');
      if (!el) {
        el = document.createElement('div'); el.id = 'ui-confirm'; el.className = 'modal-backdrop';
        el.innerHTML = '<div class="modal" style="max-width:400px;"><div class="modal-header">' +
          '<h2 class="modal-title">⚠️ 확인</h2></div><div class="modal-body">' +
          '<p id="ui-confirm-msg" style="white-space:pre-line;font-size:15px;color:var(--text-secondary);"></p>' +
          '</div><div class="modal-footer"><button class="btn btn-secondary" data-c="cancel">취소</button>' +
          '<button class="btn btn-primary" data-c="ok">확인</button></div></div>';
        document.body.appendChild(el);
      }
      document.getElementById('ui-confirm-msg').textContent = msg;
      el.style.display = 'flex';
      el.onclick = (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        el.style.display = 'none'; resolve(b.dataset.c === 'ok');
      };
    });
  }
  return { showLoading, hideLoading, toast, modal, confirm };
})();
window.UI = UI;
