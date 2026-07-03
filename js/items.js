(function () {
  const s = Session.get();
  if (!s) { window.location.href = 'entry.html'; return; }
  Session.renderNav();

  const params = new URLSearchParams(location.search);
  const compId = params.get('comp_id');
  if (!compId) { UI.toast('역량 정보가 없습니다.', 'error'); window.location.href = 'entry.html'; return; }

  let comp = null, items = [];
  const ctx = { compId, comp: null, canEdit: false, session: s };
  window.itemsCtx = ctx;

  function computeCanEdit() {
    return s.role === 'sme' && comp && comp.team_id === s.team_id;
  }

  document.querySelector('.page-wrapper').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="back"]')) history.back();
  });

  function filtered() {
    const ft = document.getElementById('filter-type').value;
    const fd = document.getElementById('filter-diff').value;
    return items.filter(i => (!ft || i.item_type === ft) && (!fd || String(i.grade || '') === fd));
  }

  function itemCard(it, idx) {
    const typeLabel = CONST.TYPES[it.item_type];
    const body = it.item_type === 'mcq'
      ? '<ol class="opt-list">' + [1,2,3,4].map(n => {
          const v = it['option' + n] || '';
          return '<li class="' + (it.answer === n ? 'correct' : '') + '">' + escHtml(v) +
                 (it.answer === n ? ' <span class="ans-tag">정답</span>' : '') + '</li>';
        }).join('') + '</ol>'
      : '<div class="essay-model"><span class="field-label">모범답안</span>' + escHtml(it.model_answer || '-') + '</div>';
    const exp = it.explanation ? '<div class="item-exp"><span class="field-label">해설</span>' + escHtml(it.explanation) + '</div>' : '';
    const actions = ctx.canEdit
      ? '<div class="item-actions">' +
          '<button class="btn btn-secondary btn-sm" data-act="it-dl-one" data-id="' + escHtml(it.item_id) + '">⬇️ 다운로드</button>' +
          '<button class="btn btn-secondary btn-sm" data-act="edit-item" data-id="' + escHtml(it.item_id) + '">수정</button>' +
          '<button class="btn btn-danger btn-sm" data-act="del-item" data-id="' + escHtml(it.item_id) + '">삭제</button></div>'
      : '';
    return '<div class="item-card" data-id="' + escHtml(it.item_id) + '">' +
      '<div class="item-card-head"><div class="item-badges">' +
        '<span class="num">' + (idx + 1) + '</span>' +
        '<span class="type-badge type-' + it.item_type + '">' + typeLabel + '</span>' +
        '<span class="diff-badge">' + escHtml(it.grade || '-') + '</span>' +
      '</div>' + actions + '</div>' +
      '<div class="item-q">' + escHtml(it.question) + '</div>' + body + exp +
      '<div class="item-images-slot" data-id="' + escHtml(it.item_id) + '"></div>' +   // Task 10
      '<div class="item-comments-slot" data-id="' + escHtml(it.item_id) + '"></div>' +  // Task 13
      '</div>';
  }

  function renderNav() {
    const el = document.getElementById('items-nav'); if (!el) return;
    const target = comp && comp.target_count != null ? comp.target_count : 50;
    const count = items.length;
    const total = Math.max(count, target);
    const cmMap = window._cmMap || {};
    let reviewN = 0, todoN = 0, rows = '';
    for (let i = 1; i <= total; i++) {
      if (i <= count) {
        const it = items[i - 1];
        const unres = (cmMap[it.item_id] || []).some(c => !c.is_resolved);
        if (unres) reviewN++;
        rows += '<button class="nav-slot ' + (unres ? 'nav-review' : 'nav-done') +
          '" data-nav-item="' + escHtml(it.item_id) + '">' +
          '<span class="nav-slot-no">' + i + '</span>' +
          '<span class="nav-slot-st">' + (unres ? '재검토 필요' : '개발완료') + '</span></button>';
      } else {
        todoN++;
        rows += '<button class="nav-slot nav-todo" data-nav-slot="' + i + '">' +
          '<span class="nav-slot-no">' + i + '</span>' +
          '<span class="nav-slot-st">미개발</span></button>';
      }
    }
    el.innerHTML = '<div class="nav-summary">개발 ' + count + '/' + target +
      ' · <span class="nav-sum-review">재검토 ' + reviewN + '</span> · 미개발 ' + todoN + '</div>' +
      '<div class="nav-slots">' + rows + '</div>';
  }

  function render() {
    document.getElementById('comp-title').textContent = comp ? comp.comp_name : '역량';
    document.getElementById('comp-cat').textContent = comp && comp.category ? comp.category : '';
    const target = comp && comp.target_count != null ? comp.target_count : 50;
    const r = target ? Math.round(items.length / target * 100) : 0;
    document.getElementById('items-rate').textContent = r + '%' + (r > 100 ? ' 초과' : '');
    ctx.canEdit = computeCanEdit();
    document.getElementById('actionbar').style.display = ctx.canEdit ? 'flex' : 'none';
    document.getElementById('readonly-badge').style.display = ctx.canEdit ? 'none' : 'inline-flex';
    const list = filtered();
    document.getElementById('item-list').innerHTML = list.length
      ? list.map((it, i) => itemCard(it, i)).join('')
      : '<div class="empty-state">작성된 문항이 없습니다.' + (ctx.canEdit ? ' 위 버튼으로 추가하세요.' : '') + '</div>';
    if (window.renderItemImages) window.renderItemImages();   // Task 10
    if (window.renderItemComments) window.renderItemComments(); // Task 13
    renderNav();
  }

  async function reload() {
    UI.showLoading('문항 불러오는 중...');
    const comps = await API.getCompetencies();
    comp = comps.find(c => c.comp_id === compId) || null;
    ctx.comp = comp;
    items = await API.getItems({ comp_id: compId });
    const imgMap = await API.getImagesByItems(items.map(i => i.item_id));
    window._imgMap = imgMap;
    const cmMap = await API.getCommentsByItems(items.map(i => i.item_id));
    window._cmMap = cmMap;
    UI.hideLoading();
    render();
  }
  window.itemsReload = reload;
  window.itemsGetAll = () => items;

  // ===== 이미지: 리스트 표시 =====
  window.renderItemImages = function () {
    const map = window._imgMap || {};
    document.querySelectorAll('.item-images-slot').forEach(slot => {
      const list = map[slot.dataset.id] || [];
      slot.innerHTML = list.length ? '<div class="img-attach-list">' + list.map(im =>
        '<span class="img-chip">📎 ' + escHtml(im.file_name) + ' (' + escHtml(CONST.AREA_LABEL[im.area] || im.area) + ')' +
        ' <a href="' + escHtml(API.publicUrl(im.file_path)) + '" download target="_blank" rel="noopener">⬇️</a></span>'
      ).join('') + '</div>' : '';
    });
  };

  // ===== 코멘트: 리스트 표시 + 반영 완료 체크 =====
  window.renderItemComments = function () {
    const map = window._cmMap || {};
    document.querySelectorAll('.item-comments-slot').forEach(slot => {
      const list = map[slot.dataset.id] || [];
      if (!list.length) { slot.innerHTML = ''; return; }
      slot.innerHTML = '<div class="sme-cm-head">💬 코멘트 ' + list.length + '건</div>' +
        list.map(c => '<div class="sme-cm' + (c.is_resolved ? ' done' : '') + '">' +
          '<div class="sme-cm-top"><span class="sme-cm-author">' + escHtml(c.author_role) + '</span>' +
            '<label class="sme-cm-check"><input type="checkbox" data-act="cm-resolve" data-id="' +
              escHtml(c.comment_id) + '"' + (c.is_resolved ? ' checked' : '') + '> 반영 완료</label></div>' +
          '<div class="sme-cm-body">' + escHtml(c.content) + '</div></div>').join('');
    });
  };

  document.body.addEventListener('change', async (e) => {
    const chk = e.target.closest('[data-act="cm-resolve"]'); if (!chk) return;
    if (!ctx.canEdit) { chk.checked = !chk.checked; UI.toast('우리 조 문항만 반영 완료할 수 있습니다.', 'warning'); return; }
    UI.showLoading('반영 상태 저장 중...');
    const ok = await API.setCommentResolved(chk.dataset.id, chk.checked);
    UI.hideLoading();
    if (!ok) { chk.checked = !chk.checked; UI.toast('저장 실패', 'error'); return; }
    UI.toast(chk.checked ? '반영 완료 처리되었습니다.' : '반영 완료가 해제되었습니다.', 'success');
    // 메모리 맵 갱신(재로딩 없이)
    const arr = (window._cmMap || {})[chk.closest('.item-comments-slot') ?
      chk.closest('.item-comments-slot').dataset.id : ''] || [];
    const c = arr.find(x => x.comment_id === chk.dataset.id); if (c) c.is_resolved = chk.checked;
    chk.closest('.sme-cm').classList.toggle('done', chk.checked);
  });

  // ===== 이미지: 모달 첨부/삭제 =====
  let modalImgItemId = null;
  window.renderModalImages = async function (itemId) {
    modalImgItemId = itemId;
    const slot = document.getElementById('im-images-slot');
    if (!itemId) {
      slot.innerHTML = '<div class="img-note">💡 이미지는 <b>문항을 저장한 뒤</b> 수정 화면에서 첨부할 수 있습니다.</div>';
      return;
    }
    const imgs = await API.getImages(itemId);
    // 유형별 첨부 영역: 객관식=모범답안 제외 / 서술형=보기1~4 제외
    const isMcq = document.getElementById('im-type').value === 'mcq';
    const areas = CONST.AREAS.filter(a => isMcq ? a !== 'model_answer' : !/^option[1-4]$/.test(a));
    slot.innerHTML = '<div class="img-attach-box"><div class="img-attach-head">📎 이미지 첨부</div>' +
      '<div class="img-attach-row">' +
        '<select id="img-area" class="form-control form-select">' +
          areas.map(a => '<option value="' + a + '">' + CONST.AREA_LABEL[a] + '</option>').join('') + '</select>' +
        '<input type="file" id="img-file" accept="image/*">' +
        '<button class="btn btn-secondary btn-sm" data-act="img-upload">첨부</button>' +
      '</div>' +
      '<div class="img-attach-list">' + imgs.map(im =>
        '<span class="img-chip">📎 ' + escHtml(im.file_name) + ' (' + escHtml(CONST.AREA_LABEL[im.area]) + ')' +
        ' <button class="img-x" data-act="img-del" data-id="' + escHtml(im.image_id) + '">✕</button></span>'
      ).join('') + '</div></div>';
    window._modalImgs = imgs;
  };

  // 유형 토글
  function applyTypeToggle() {
    const isMcq = document.getElementById('im-type').value === 'mcq';
    document.getElementById('im-mcq').style.display = isMcq ? 'block' : 'none';
    document.getElementById('im-essay').style.display = isMcq ? 'none' : 'block';
    // 유형 변경 시 이미지 첨부 영역 드롭다운도 갱신(수정 모드에서만 첨부 UI 존재)
    if (modalImgItemId && window.renderModalImages) window.renderModalImages(modalImgItemId);
  }
  document.getElementById('im-type').addEventListener('change', applyTypeToggle);

  // ===== 샘플 차용 =====
  let borrowSamples = [];
  let borrowFiltered = [];
  window._borrowImages = null;

  function borrowCard(sp) {
    const typeLabel = CONST.TYPES[sp.item_type];
    const tag = sp.comp_id === compId ? '<span class="comp-tag">🔗 이 역량</span>' : '';
    const body = sp.item_type === 'mcq'
      ? '<ol class="opt-list">' + [1,2,3,4].map(n => '<li class="' + (sp.answer === n ? 'correct' : '') + '">' +
          escHtml(sp['option' + n] || '') + (sp.answer === n ? ' <span class="ans-tag">정답</span>' : '') + '</li>').join('') + '</ol>'
      : '<div class="essay-model"><span class="field-label">모범답안</span>' + escHtml(sp.model_answer || '-') + '</div>';
    return '<div class="item-card">' +
      '<div class="item-card-head"><div class="sp-badges">' +
        '<span class="type-badge type-' + sp.item_type + '">' + typeLabel + '</span>' +
        '<span class="grade-badge">' + escHtml(sp.qual_grade || '-') + '</span>' +
        '<span class="qual-badge">' + escHtml(sp.qual_name || '') + '</span>' + tag +
      '</div><div class="item-actions">' +
        '<button class="btn btn-secondary btn-sm" data-act="bw-dl-one" data-id="' + escHtml(sp.sample_id) + '">⬇️ 다운로드</button>' +
        '<button class="btn btn-primary btn-sm" data-act="borrow-pick" data-id="' + escHtml(sp.sample_id) + '">가져오기</button>' +
      '</div></div>' +
      '<div class="item-q">' + escHtml(sp.question) + '</div>' + body +
      '<div class="item-exp"><span class="field-label">해설</span>' + escHtml(sp.explanation || '') + '</div></div>';
  }

  function renderBorrowList() {
    const kw = document.getElementById('bw-f-kw').value.trim().toLowerCase();
    const ft = document.getElementById('bw-f-type').value;
    const fg = document.getElementById('bw-f-grade').value;
    let list = borrowSamples.filter(sp =>
      (!ft || sp.item_type === ft) && (!fg || sp.qual_grade === fg) &&
      (!kw || (String(sp.question || '') + ' ' + String(sp.qual_name || '')).toLowerCase().includes(kw)));
    // 이 역량 태그 우선 정렬
    list = list.slice().sort((a, b) => (b.comp_id === compId ? 1 : 0) - (a.comp_id === compId ? 1 : 0));
    borrowFiltered = list;
    document.getElementById('bw-list').innerHTML = list.length
      ? list.map(borrowCard).join('')
      : '<div class="empty-state">표시할 샘플이 없습니다.</div>';
  }

  async function openBorrowModal() {
    if (!ctx.canEdit) return;
    UI.showLoading('샘플 불러오는 중...');
    borrowSamples = await API.getSampleItems();
    UI.hideLoading();
    document.getElementById('bw-f-kw').value = '';
    document.getElementById('bw-f-type').value = '';
    document.getElementById('bw-f-grade').innerHTML = '<option value="">자격등급 전체</option>' +
      CONST.GRADES.map(g => '<option value="' + g + '">' + g + '</option>').join('');
    const relatedN = borrowSamples.filter(sp => sp.comp_id === compId).length;
    document.querySelector('#borrow-modal .modal-title').innerHTML =
      '🧩 샘플에서 가져오기' + (relatedN ? ' <span class="comp-tag">이 역량 관련 ' + relatedN + '개</span>' : '');
    renderBorrowList();
    UI.modal('borrow-modal', true);
  }

  async function pickBorrow(sampleId) {
    const sp = borrowSamples.find(x => x.sample_id === sampleId); if (!sp) return;
    UI.showLoading('샘플 이미지 확인 중...');
    const imgs = await API.getSampleImages(sampleId);
    UI.hideLoading();
    UI.modal('borrow-modal', false);
    // 폼을 신규(빈 item_id)로 열되 내용 채움
    openItemModal(null);
    document.getElementById('im-type').value = sp.item_type;
    document.getElementById('im-diff').value = CONST.GRADE_TO_ITEMGRADE[sp.qual_grade] || '3급';
    document.getElementById('im-question').value = sp.question || '';
    document.getElementById('im-o1').value = sp.option1 || '';
    document.getElementById('im-o2').value = sp.option2 || '';
    document.getElementById('im-o3').value = sp.option3 || '';
    document.getElementById('im-o4').value = sp.option4 || '';
    document.getElementById('im-answer').value = sp.answer ? String(sp.answer) : '1';
    document.getElementById('im-model').value = sp.model_answer || '';
    document.getElementById('im-exp').value = sp.explanation || '';
    document.getElementById('im-type').dispatchEvent(new Event('change')); // 유형 토글
    window._borrowImages = imgs;
    document.getElementById('im-borrow-note').innerHTML = imgs.length
      ? '<div class="img-note">🧩 차용: 저장 시 이미지 ' + imgs.length + '개(' +
        imgs.map(im => escHtml(CONST.AREA_LABEL[im.area] || im.area)).join(', ') + ')가 함께 복사됩니다.</div>'
      : '<div class="img-note">🧩 샘플에서 가져온 내용입니다. 수정 후 저장하세요.</div>';
  }

  function openItemModal(it) {
    modalImgItemId = null; // 열 때 stale 첨부영역 렌더 방지(아래 renderModalImages가 정확히 다시 그림)
    window._borrowImages = null;
    const bnote = document.getElementById('im-borrow-note'); if (bnote) bnote.innerHTML = '';
    document.getElementById('item-modal-id').value = it ? it.item_id : '';
    document.getElementById('im-type').value = it ? it.item_type : 'mcq';
    document.getElementById('im-diff').value = it && it.grade ? it.grade : '3급';
    document.getElementById('im-question').value = it ? it.question : '';
    document.getElementById('im-o1').value = it ? (it.option1 || '') : '';
    document.getElementById('im-o2').value = it ? (it.option2 || '') : '';
    document.getElementById('im-o3').value = it ? (it.option3 || '') : '';
    document.getElementById('im-o4').value = it ? (it.option4 || '') : '';
    document.getElementById('im-answer').value = it && it.answer ? String(it.answer) : '1';
    document.getElementById('im-model').value = it ? (it.model_answer || '') : '';
    document.getElementById('im-exp').value = it ? (it.explanation || '') : '';
    document.getElementById('item-modal-title').textContent = it ? '문항 수정' : '문항 추가';
    applyTypeToggle();
    if (window.renderModalImages) window.renderModalImages(it ? it.item_id : null); // Task 10
    UI.modal('item-modal', true);
  }

  // ===== 엑셀 일괄 업로드 =====
  let validatedRows = [];
  function renderUploadPreview(results) {
    const okN = results.filter(r => r.ok).length, ngN = results.length - okN;
    const rowsHtml = results.map((r, i) =>
      '<tr class="' + (r.ok ? '' : 'row-err') + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escHtml(r.raw.문항유형) + '</td>' +
      '<td>' + escHtml(r.raw.급수) + '</td>' +
      '<td class="cell-q">' + escHtml(r.raw.문항) + '</td>' +
      '<td>' + (r.ok ? '✅' : '❌ ' + escHtml(r.error)) + '</td></tr>').join('');
    document.getElementById('upload-preview').innerHTML =
      '<div class="upload-summary">검증: <b>' + okN + '</b>건 저장 가능 / <b class="ng">' + ngN + '</b>건 제외</div>' +
      '<div class="upload-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>#</th><th>유형</th><th>급수</th><th>문항</th><th>검증</th></tr></thead><tbody>' +
      rowsHtml + '</tbody></table></div>';
    document.getElementById('upload-save-btn').disabled = okN === 0;
  }

  document.getElementById('upload-file') &&
  document.getElementById('upload-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    UI.showLoading('파일 분석 중...');
    try {
      const raw = await XlsxTool.parseFile(f);
      validatedRows = XlsxTool.validateRows(raw);
      renderUploadPreview(validatedRows);
    } catch (err) { console.error(err); UI.toast('파일을 읽을 수 없습니다.', 'error'); }
    finally { UI.hideLoading(); }
  });

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'add-item') { if (!ctx.canEdit) return; openItemModal(null); }
    if (act === 'it-dl-one') {
      if (!ctx.canEdit) return;
      const it = items.find(x => x.item_id === b.dataset.id);
      if (!it) return;
      const tail = String(it.item_id).slice(-4);
      const cname = (comp && comp.comp_name ? comp.comp_name : '역량').replace(/[\\/:*?"<>|]/g, '');
      XlsxTool.downloadItemRows([it], 'xlsx', '문항_' + cname + '_' + tail);
    }
    if (act === 'it-dl-all') {
      if (!ctx.canEdit) return;
      const list = filtered();
      if (!list.length) { UI.toast('다운로드할 문항이 없습니다.', 'warning'); return; }
      document.getElementById('it-dlall-count').textContent = list.length;
      UI.modal('it-dlall-modal', true);
    }
    if (act === 'it-dlall-close') { UI.modal('it-dlall-modal', false); }
    if (act === 'it-dlall-xlsx' || act === 'it-dlall-csv') {
      if (!ctx.canEdit) { UI.modal('it-dlall-modal', false); return; }
      const list = filtered();
      if (!list.length) { UI.toast('다운로드할 문항이 없습니다.', 'warning'); UI.modal('it-dlall-modal', false); return; }
      const fmt = act === 'it-dlall-csv' ? 'csv' : 'xlsx';
      const cname = (comp && comp.comp_name ? comp.comp_name : '역량').replace(/[\\/:*?"<>|]/g, '');
      XlsxTool.downloadItemRows(list, fmt, '문항_' + cname + '_' + list.length + '건');
      UI.modal('it-dlall-modal', false);
    }
    if (act === 'open-borrow') openBorrowModal();
    if (act === 'borrow-close') UI.modal('borrow-modal', false);
    if (act === 'borrow-pick') pickBorrow(b.dataset.id);
    if (act === 'bw-dl-one') {
      const sp = borrowSamples.find(x => x.sample_id === b.dataset.id);
      if (!sp) return;
      const tail = String(sp.sample_id).slice(-4);
      const label = (sp.qual_name || sp.category || CONST.TYPES[sp.item_type] || '샘플').replace(/[\\/:*?"<>|]/g, '');
      XlsxTool.downloadSampleRows([sp], 'xlsx', '샘플_' + label + '_' + tail);
    }
    if (act === 'bw-dl-all') {
      if (!borrowFiltered.length) { UI.toast('다운로드할 샘플이 없습니다.', 'warning'); return; }
      XlsxTool.downloadSampleRows(borrowFiltered, 'xlsx', '샘플문항_' + borrowFiltered.length + '건');
    }
    if (act === 'item-close') UI.modal('item-modal', false);
    if (act === 'edit-item') openItemModal(items.find(i => i.item_id === b.dataset.id));
    if (act === 'del-item') {
      if (!(await UI.confirm('이 문항을 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteItem(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); reload(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'item-save') {
      const type = document.getElementById('im-type').value;
      const body = {
        item_id: document.getElementById('item-modal-id').value || undefined,
        comp_id: compId, team_id: (comp ? comp.team_id : s.team_id), item_type: type,
        grade: document.getElementById('im-diff').value,
        question: document.getElementById('im-question').value.trim(),
        option1: document.getElementById('im-o1').value.trim(),
        option2: document.getElementById('im-o2').value.trim(),
        option3: document.getElementById('im-o3').value.trim(),
        option4: document.getElementById('im-o4').value.trim(),
        answer: Number(document.getElementById('im-answer').value),
        model_answer: document.getElementById('im-model').value.trim(),
        explanation: document.getElementById('im-exp').value.trim()
      };
      if (!body.question) { UI.toast('문항을 입력해주세요.', 'warning'); return; }
      if (type === 'mcq' && [body.option1,body.option2,body.option3,body.option4].some(v => !v)) {
        UI.toast('객관식은 보기 4개를 모두 입력해주세요.', 'warning'); return;
      }
      if (type === 'essay' && !body.model_answer) { UI.toast('모범답안을 입력해주세요.', 'warning'); return; }
      if (!body.explanation) { UI.toast('해설을 입력해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...'); const r = await API.saveItem(body); UI.hideLoading();
      if (!r) { UI.toast('저장 실패', 'error'); return; }
      // 차용 이미지 복제(신규 저장 + 가져온 이미지가 있을 때만)
      const bimgs = window._borrowImages || [];
      if (bimgs.length && r && r.item_id) {
        let imgFail = 0;
        for (let i = 0; i < bimgs.length; i++) {
          UI.showLoading('이미지 복사 중... (' + (i + 1) + '/' + bimgs.length + ')');
          const ok2 = await API.copySampleImageToItem(r.item_id, compId, bimgs[i]);
          if (!ok2) imgFail++;
        }
        UI.hideLoading();
        if (imgFail) UI.toast(imgFail + '개 이미지 복사 실패(문항은 저장됨)', 'warning');
      }
      window._borrowImages = null;
      UI.toast('저장되었습니다.', 'success'); UI.modal('item-modal', false); reload();
    }
    if (act === 'img-upload') {
      const f = document.getElementById('img-file').files[0];
      if (!f) { UI.toast('파일을 선택해주세요.', 'warning'); return; }
      const area = document.getElementById('img-area').value;
      UI.showLoading('이미지 업로드 중...');
      const r = await API.uploadImage(modalImgItemId, ctx.compId, area, f);
      UI.hideLoading();
      if (r) { UI.toast('첨부되었습니다.', 'success'); window.renderModalImages(modalImgItemId); reload(); }
      else UI.toast('업로드 실패: ' + (API.uploadErrorMessage() || '알 수 없는 오류'), 'error');
    }
    if (act === 'img-del') {
      const im = (window._modalImgs || []).find(x => x.image_id === b.dataset.id);
      if (!im || !(await UI.confirm('이 이미지를 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteImage(im); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); window.renderModalImages(modalImgItemId); reload(); }
      else UI.toast('삭제 실패', 'error');
    }
    if (act === 'dl-template') UI.modal('tpl-modal', true);
    if (act === 'tpl-close') UI.modal('tpl-modal', false);
    if (act === 'tpl-xlsx') { XlsxTool.downloadTemplate('xlsx'); UI.modal('tpl-modal', false); }
    if (act === 'tpl-csv')  { XlsxTool.downloadTemplate('csv');  UI.modal('tpl-modal', false); }
    if (act === 'open-upload') { if (!ctx.canEdit) return;
      validatedRows = []; document.getElementById('upload-preview').innerHTML = '';
      document.getElementById('upload-file').value = ''; document.getElementById('upload-save-btn').disabled = true;
      UI.modal('upload-modal', true); }
    if (act === 'upload-close') UI.modal('upload-modal', false);
    if (act === 'upload-save') {
      const ok = validatedRows.filter(r => r.ok);
      if (!ok.length) { UI.toast('저장할 유효 행이 없습니다.', 'warning'); return; }
      let done = 0, fail = 0;
      for (let i = 0; i < ok.length; i++) {
        UI.showLoading('저장 중... (' + (i + 1) + '/' + ok.length + ')');
        const body = Object.assign({ comp_id: ctx.compId, team_id: (comp ? comp.team_id : s.team_id) }, ok[i].data);
        const r = await API.saveItem(body); r ? done++ : fail++;
      }
      UI.hideLoading();
      UI.toast(done + '건 저장 완료' + (fail ? (' / ' + fail + '건 실패') : ''), fail ? 'warning' : 'success');
      UI.modal('upload-modal', false); reload();
    }
  });

  ['filter-type','filter-diff'].forEach(id =>
    document.getElementById(id).addEventListener('change', render));

  ['bw-f-kw','bw-f-type','bw-f-grade'].forEach(id => {
    const el = document.getElementById(id); if (el) el.addEventListener('input', renderBorrowList);
  });

  function jumpToItem(itemId) {
    const ft = document.getElementById('filter-type');
    const fd = document.getElementById('filter-diff');
    if (ft.value || fd.value) { ft.value = ''; fd.value = ''; render(); } // 숨겨졌으면 필터 해제
    const card = document.querySelector('.item-card[data-id="' + CSS.escape(itemId) + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('item-flash');
    setTimeout(() => card.classList.remove('item-flash'), 1200);
  }

  document.getElementById('items-nav').addEventListener('click', (e) => {
    const jump = e.target.closest('[data-nav-item]');
    if (jump) { jumpToItem(jump.dataset.navItem); return; }
    const slot = e.target.closest('[data-nav-slot]');
    if (slot && ctx.canEdit) openItemModal(null);
  });

  reload();
})();
