(function () {
  const s = Session.get();
  if (!s) { window.location.href = 'entry.html'; return; }
  Session.renderNav();

  const canEdit = (s.role === 'admin' || s.role === 'coach');
  let samples = [], comps = [];

  function compName(id) { const c = comps.find(x => x.comp_id === id); return c ? c.comp_name : ''; }

  function gradeOptions(sel) {
    return CONST.GRADES.map(g => '<option value="' + g + '"' + (g === sel ? ' selected' : '') + '>' + g + '</option>').join('');
  }

  function sampleCard(sp, idx) {
    const typeLabel = CONST.TYPES[sp.item_type];
    const body = sp.item_type === 'mcq'
      ? '<ol class="opt-list">' + [1,2,3,4].map(n => {
          const v = sp['option' + n] || '';
          return '<li class="' + (sp.answer === n ? 'correct' : '') + '">' + escHtml(v) +
                 (sp.answer === n ? ' <span class="ans-tag">정답</span>' : '') + '</li>';
        }).join('') + '</ol>'
      : '<div class="essay-model"><span class="field-label">모범답안</span>' + escHtml(sp.model_answer || '-') + '</div>';
    const exp = '<div class="item-exp"><span class="field-label">해설</span>' + escHtml(sp.explanation || '') + '</div>';
    const tag = sp.comp_id ? '<span class="comp-tag">🔗 ' + escHtml(compName(sp.comp_id) || sp.comp_id) + '</span>' : '';
    const cat = sp.category ? '<span class="cat-tag">#' + escHtml(sp.category) + '</span>' : '';
    const actions = canEdit
      ? '<div class="item-actions">' +
          '<button class="btn btn-secondary btn-sm" data-act="sp-edit" data-id="' + escHtml(sp.sample_id) + '">수정</button>' +
          '<button class="btn btn-danger btn-sm" data-act="sp-del" data-id="' + escHtml(sp.sample_id) + '">삭제</button></div>'
      : '';
    const dlBtn = '<button class="btn btn-secondary btn-sm sp-dl-one-btn" data-act="sp-dl-one" data-id="' +
      escHtml(sp.sample_id) + '">⬇️ 다운로드</button>';
    return '<div class="item-card" data-id="' + escHtml(sp.sample_id) + '">' +
      '<div class="item-card-head"><div class="sp-badges">' +
        '<span class="num">' + (idx + 1) + '</span>' +
        '<span class="type-badge type-' + sp.item_type + '">' + typeLabel + '</span>' +
        '<span class="grade-badge">' + escHtml(sp.qual_grade || '-') + '</span>' +
        '<span class="qual-badge">' + escHtml(sp.qual_name || '') + '</span>' + tag + cat +
      '</div><div class="sp-head-actions">' + dlBtn + actions + '</div></div>' +
      '<div class="item-q">' + escHtml(sp.question) + '</div>' + body + exp +
      '<div class="sp-images-list" data-id="' + escHtml(sp.sample_id) + '"></div>' +
      '</div>';
  }

  function filtered() {
    const kw = document.getElementById('sp-f-kw').value.trim().toLowerCase();
    const ft = document.getElementById('sp-f-type').value;
    const fg = document.getElementById('sp-f-grade').value;
    const fc = document.getElementById('sp-f-comp').value;
    return samples.filter(sp =>
      (!ft || sp.item_type === ft) &&
      (!fg || sp.qual_grade === fg) &&
      (!fc || sp.comp_id === fc) &&
      (!kw || (String(sp.question || '') + ' ' + String(sp.qual_name || '')).toLowerCase().includes(kw)));
  }

  function render() {
    document.getElementById('sp-count').textContent = samples.length;
    document.getElementById('sp-actionbar').style.display = canEdit ? 'flex' : 'none';
    document.getElementById('sp-ro-badge').style.display = canEdit ? 'none' : 'inline-flex';
    const list = filtered();
    document.getElementById('sp-list').innerHTML = list.length
      ? list.map((sp, i) => sampleCard(sp, i)).join('')
      : '<div class="empty-state">표시할 샘플이 없습니다.</div>';
    renderCardImages();
  }

  async function renderCardImages() {
    const ids = samples.map(sp => sp.sample_id);
    const map = await API.getSampleImagesByIds(ids);
    document.querySelectorAll('.sp-images-list').forEach(slot => {
      const arr = map[slot.dataset.id] || [];
      slot.innerHTML = arr.length ? '<div class="img-attach-list">' + arr.map(im =>
        '<span class="img-chip">📎 ' + escHtml(im.file_name) + ' (' + escHtml(CONST.AREA_LABEL[im.area] || im.area) + ')' +
        ' <a href="' + escHtml(API.publicUrl(im.file_path)) + '" download target="_blank" rel="noopener">⬇️</a></span>'
      ).join('') + '</div>' : '';
    });
  }

  async function reload() {
    UI.showLoading('샘플 불러오는 중...');
    comps = await API.getCompetencies();
    samples = await API.getSampleItems();
    UI.hideLoading();
    document.getElementById('sp-f-grade').innerHTML = '<option value="">자격등급 전체</option>' +
      CONST.GRADES.map(g => '<option value="' + g + '">' + g + '</option>').join('');
    document.getElementById('sp-f-comp').innerHTML = '<option value="">역량태그 전체</option>' +
      comps.map(c => '<option value="' + escHtml(c.comp_id) + '">' + escHtml(c.comp_name) + '</option>').join('');
    render();
  }

  // ===== 유형 토글 =====
  function applyTypeToggle() {
    const isMcq = document.getElementById('sp-type').value === 'mcq';
    document.getElementById('sp-mcq').style.display = isMcq ? 'block' : 'none';
    document.getElementById('sp-essay').style.display = isMcq ? 'none' : 'block';
    if (modalImgSampleId && window.spRenderModalImages) window.spRenderModalImages(modalImgSampleId);
  }
  document.getElementById('sp-type').addEventListener('change', applyTypeToggle);

  // ===== 모달 이미지 첨부 =====
  let modalImgSampleId = null;
  window.spRenderModalImages = async function (sampleId) {
    modalImgSampleId = sampleId;
    const slot = document.getElementById('sp-images-slot');
    if (!sampleId) {
      slot.innerHTML = '<div class="img-note">💡 이미지는 <b>샘플을 저장한 뒤</b> 수정 화면에서 첨부할 수 있습니다.</div>';
      return;
    }
    const imgs = await API.getSampleImages(sampleId);
    const isMcq = document.getElementById('sp-type').value === 'mcq';
    const areas = CONST.AREAS.filter(a => isMcq ? a !== 'model_answer' : !/^option[1-4]$/.test(a));
    slot.innerHTML = '<div class="img-attach-box"><div class="img-attach-head">📎 이미지 첨부</div>' +
      '<div class="img-attach-row">' +
        '<select id="sp-img-area" class="form-control form-select">' +
          areas.map(a => '<option value="' + a + '">' + CONST.AREA_LABEL[a] + '</option>').join('') + '</select>' +
        '<input type="file" id="sp-img-file" accept="image/*">' +
        '<button class="btn btn-secondary btn-sm" data-act="sp-img-upload">첨부</button>' +
      '</div>' +
      '<div class="img-attach-list">' + imgs.map(im =>
        '<span class="img-chip">📎 ' + escHtml(im.file_name) + ' (' + escHtml(CONST.AREA_LABEL[im.area]) + ')' +
        ' <button class="img-x" data-act="sp-img-del" data-id="' + escHtml(im.image_id) + '">✕</button></span>'
      ).join('') + '</div></div>';
    window._spModalImgs = imgs;
  };

  function openModal(sp) {
    modalImgSampleId = null;
    document.getElementById('sp-modal-id').value = sp ? sp.sample_id : '';
    document.getElementById('sp-type').value = sp ? sp.item_type : 'mcq';
    document.getElementById('sp-grade').innerHTML = gradeOptions(sp ? sp.qual_grade : '기능사');
    document.getElementById('sp-qual').value = sp ? (sp.qual_name || '') : '';
    document.getElementById('sp-comp').innerHTML = '<option value="">태그 없음</option>' +
      comps.map(c => '<option value="' + escHtml(c.comp_id) + '"' +
        (sp && sp.comp_id === c.comp_id ? ' selected' : '') + '>' + escHtml(c.comp_name) + '</option>').join('');
    document.getElementById('sp-cat').value = sp ? (sp.category || '') : '';
    document.getElementById('sp-question').value = sp ? sp.question : '';
    document.getElementById('sp-o1').value = sp ? (sp.option1 || '') : '';
    document.getElementById('sp-o2').value = sp ? (sp.option2 || '') : '';
    document.getElementById('sp-o3').value = sp ? (sp.option3 || '') : '';
    document.getElementById('sp-o4').value = sp ? (sp.option4 || '') : '';
    document.getElementById('sp-answer').value = sp && sp.answer ? String(sp.answer) : '1';
    document.getElementById('sp-model').value = sp ? (sp.model_answer || '') : '';
    document.getElementById('sp-exp').value = sp ? (sp.explanation || '') : '';
    document.getElementById('sp-modal-title').textContent = sp ? '샘플 수정' : '샘플 추가';
    applyTypeToggle();
    window.spRenderModalImages(sp ? sp.sample_id : null);
    UI.modal('sp-modal', true);
  }

  // ===== 엑셀 업로드 =====
  let spValidated = [];
  function renderUploadPreview(results) {
    const okN = results.filter(r => r.ok).length, ngN = results.length - okN;
    const rowsHtml = results.map((r, i) =>
      '<tr class="' + (r.ok ? '' : 'row-err') + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escHtml(r.raw.유형) + '</td>' +
      '<td>' + escHtml(r.raw.자격등급) + '</td>' +
      '<td class="cell-q">' + escHtml(r.raw['문항(발문)']) + '</td>' +
      '<td>' + (r.ok ? '✅' : '❌ ' + escHtml(r.error)) + '</td></tr>').join('');
    document.getElementById('sp-upload-preview').innerHTML =
      '<div class="upload-summary">검증: <b>' + okN + '</b>건 저장 가능 / <b class="ng">' + ngN + '</b>건 제외</div>' +
      '<div class="upload-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>#</th><th>유형</th><th>자격등급</th><th>문항</th><th>검증</th></tr></thead><tbody>' +
      rowsHtml + '</tbody></table></div>';
    document.getElementById('sp-upload-save-btn').disabled = okN === 0;
  }

  document.getElementById('sp-upload-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    UI.showLoading('파일 분석 중...');
    try {
      const raw = await XlsxTool.parseSampleFile(f);
      spValidated = XlsxTool.validateSampleRows(raw);
      renderUploadPreview(spValidated);
    } catch (err) { console.error(err); UI.toast('파일을 읽을 수 없습니다.', 'error'); }
    finally { UI.hideLoading(); }
  });

  // ===== 필터 =====
  ['sp-f-kw','sp-f-type','sp-f-grade','sp-f-comp'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));

  // ===== 이벤트 위임 =====
  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'sback') { window.location.href = (s.role === 'admin' ? 'admin.html' : (s.role === 'coach' ? 'review.html' : 'team.html')); }
    if (act === 'sp-dl-one') {
      const sp = samples.find(x => x.sample_id === b.dataset.id);
      if (!sp) return;
      const tail = String(sp.sample_id).slice(-4);
      const label = (sp.qual_name || sp.category || CONST.TYPES[sp.item_type] || '샘플').replace(/[\\/:*?"<>|]/g, '');
      XlsxTool.downloadSampleRows([sp], 'xlsx', '샘플_' + label + '_' + tail);
      return;
    }
    if (act === 'sp-dl-all') {
      const list = filtered();
      if (!list.length) { UI.toast('다운로드할 샘플이 없습니다.', 'warning'); return; }
      document.getElementById('sp-dlall-count').textContent = list.length;
      UI.modal('sp-dlall-modal', true);
      return;
    }
    if (act === 'sp-dlall-close') { UI.modal('sp-dlall-modal', false); return; }
    if (act === 'sp-dlall-xlsx' || act === 'sp-dlall-csv') {
      const list = filtered();
      if (!list.length) { UI.toast('다운로드할 샘플이 없습니다.', 'warning'); UI.modal('sp-dlall-modal', false); return; }
      const fmt = act === 'sp-dlall-csv' ? 'csv' : 'xlsx';
      XlsxTool.downloadSampleRows(list, fmt, '샘플문항_전체_' + list.length + '건');
      UI.modal('sp-dlall-modal', false);
      return;
    }
    if (!canEdit && ['sp-add','sp-edit','sp-del','sp-save','sp-open-upload','sp-upload-save','sp-img-upload','sp-img-del'].includes(act)) {
      UI.toast('샘플 편집 권한이 없습니다.', 'warning'); return;
    }
    if (act === 'sp-add') openModal(null);
    if (act === 'sp-close') UI.modal('sp-modal', false);
    if (act === 'sp-edit') openModal(samples.find(x => x.sample_id === b.dataset.id));
    if (act === 'sp-del') {
      if (!(await UI.confirm('이 샘플을 삭제하시겠습니까?\n연결된 이미지도 함께 삭제됩니다.'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteSampleItem(b.dataset.id); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); reload(); } else UI.toast('삭제 실패', 'error');
    }
    if (act === 'sp-save') {
      const type = document.getElementById('sp-type').value;
      const body = {
        sample_id: document.getElementById('sp-modal-id').value || undefined,
        item_type: type,
        qual_grade: document.getElementById('sp-grade').value,
        qual_name: document.getElementById('sp-qual').value.trim(),
        comp_id: document.getElementById('sp-comp').value || null,
        category: document.getElementById('sp-cat').value.trim() || null,
        question: document.getElementById('sp-question').value.trim(),
        option1: document.getElementById('sp-o1').value.trim(),
        option2: document.getElementById('sp-o2').value.trim(),
        option3: document.getElementById('sp-o3').value.trim(),
        option4: document.getElementById('sp-o4').value.trim(),
        answer: Number(document.getElementById('sp-answer').value),
        model_answer: document.getElementById('sp-model').value.trim(),
        explanation: document.getElementById('sp-exp').value.trim()
      };
      if (!body.question) { UI.toast('문항을 입력해주세요.', 'warning'); return; }
      if (type === 'mcq' && [body.option1,body.option2,body.option3,body.option4].some(v => !v)) {
        UI.toast('객관식은 보기 4개를 모두 입력해주세요.', 'warning'); return; }
      if (type === 'essay' && !body.model_answer) { UI.toast('모범답안을 입력해주세요.', 'warning'); return; }
      if (!body.explanation) { UI.toast('해설을 입력해주세요.', 'warning'); return; }
      UI.showLoading('저장 중...'); const r = await API.saveSampleItem(body); UI.hideLoading();
      if (!r) { UI.toast('저장 실패', 'error'); return; }
      UI.toast('저장되었습니다.', 'success'); UI.modal('sp-modal', false); reload();
    }
    if (act === 'sp-img-upload') {
      const f = document.getElementById('sp-img-file').files[0];
      if (!f) { UI.toast('파일을 선택해주세요.', 'warning'); return; }
      const area = document.getElementById('sp-img-area').value;
      UI.showLoading('이미지 업로드 중...');
      const r = await API.uploadSampleImage(modalImgSampleId, area, f);
      UI.hideLoading();
      if (r) { UI.toast('첨부되었습니다.', 'success'); window.spRenderModalImages(modalImgSampleId); }
      else UI.toast('업로드 실패: ' + (API.uploadErrorMessage() || '알 수 없는 오류'), 'error');
    }
    if (act === 'sp-img-del') {
      const im = (window._spModalImgs || []).find(x => x.image_id === b.dataset.id);
      if (!im || !(await UI.confirm('이 이미지를 삭제하시겠습니까?'))) return;
      UI.showLoading('삭제 중...'); const ok = await API.deleteSampleImage(im); UI.hideLoading();
      if (ok) { UI.toast('삭제되었습니다.', 'success'); window.spRenderModalImages(modalImgSampleId); }
      else UI.toast('삭제 실패', 'error');
    }
    if (act === 'sp-dl-template') UI.modal('sp-tpl-modal', true);
    if (act === 'sp-tpl-close') UI.modal('sp-tpl-modal', false);
    if (act === 'sp-tpl-xlsx') { XlsxTool.downloadSampleTemplate('xlsx'); UI.modal('sp-tpl-modal', false); }
    if (act === 'sp-tpl-csv')  { XlsxTool.downloadSampleTemplate('csv');  UI.modal('sp-tpl-modal', false); }
    if (act === 'sp-open-upload') {
      spValidated = []; document.getElementById('sp-upload-preview').innerHTML = '';
      document.getElementById('sp-upload-file').value = ''; document.getElementById('sp-upload-save-btn').disabled = true;
      UI.modal('sp-upload-modal', true); }
    if (act === 'sp-upload-close') UI.modal('sp-upload-modal', false);
    if (act === 'sp-upload-save') {
      const ok = spValidated.filter(r => r.ok);
      if (!ok.length) { UI.toast('저장할 유효 행이 없습니다.', 'warning'); return; }
      let done = 0, fail = 0;
      for (let i = 0; i < ok.length; i++) {
        UI.showLoading('저장 중... (' + (i + 1) + '/' + ok.length + ')');
        const r = await API.saveSampleItem(ok[i].data); r ? done++ : fail++;
      }
      UI.hideLoading();
      UI.toast(done + '건 저장 완료' + (fail ? (' / ' + fail + '건 실패') : ''), fail ? 'warning' : 'success');
      UI.modal('sp-upload-modal', false); reload();
    }
  });

  reload();
})();
