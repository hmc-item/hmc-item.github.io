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
    return items.filter(i => (!ft || i.item_type === ft) && (!fd || String(i.difficulty) === fd));
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
          '<button class="btn btn-secondary btn-sm" data-act="edit-item" data-id="' + escHtml(it.item_id) + '">수정</button>' +
          '<button class="btn btn-danger btn-sm" data-act="del-item" data-id="' + escHtml(it.item_id) + '">삭제</button></div>'
      : '';
    return '<div class="item-card" data-id="' + escHtml(it.item_id) + '">' +
      '<div class="item-card-head"><div class="item-badges">' +
        '<span class="num">' + (idx + 1) + '</span>' +
        '<span class="type-badge type-' + it.item_type + '">' + typeLabel + '</span>' +
        '<span class="diff-badge diff-' + it.difficulty + '">난이도 ' + it.difficulty + '</span>' +
      '</div>' + actions + '</div>' +
      '<div class="item-q">' + escHtml(it.question) + '</div>' + body + exp +
      '<div class="item-images-slot" data-id="' + escHtml(it.item_id) + '"></div>' +   // Task 10
      '<div class="item-comments-slot" data-id="' + escHtml(it.item_id) + '"></div>' +  // Task 13
      '</div>';
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
  }

  async function reload() {
    UI.showLoading('문항 불러오는 중...');
    const comps = await API.getCompetencies();
    comp = comps.find(c => c.comp_id === compId) || null;
    ctx.comp = comp;
    items = await API.getItems({ comp_id: compId });
    UI.hideLoading();
    render();
  }
  window.itemsReload = reload;
  window.itemsGetAll = () => items;

  // 유형 토글
  function applyTypeToggle() {
    const isMcq = document.getElementById('im-type').value === 'mcq';
    document.getElementById('im-mcq').style.display = isMcq ? 'block' : 'none';
    document.getElementById('im-essay').style.display = isMcq ? 'none' : 'block';
  }
  document.getElementById('im-type').addEventListener('change', applyTypeToggle);

  function openItemModal(it) {
    document.getElementById('item-modal-id').value = it ? it.item_id : '';
    document.getElementById('im-type').value = it ? it.item_type : 'mcq';
    document.getElementById('im-diff').value = it ? String(it.difficulty) : '1';
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

  document.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'add-item') { if (!ctx.canEdit) return; openItemModal(null); }
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
        difficulty: Number(document.getElementById('im-diff').value),
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
      UI.showLoading('저장 중...'); const r = await API.saveItem(body); UI.hideLoading();
      if (!r) { UI.toast('저장 실패', 'error'); return; }
      UI.toast('저장되었습니다.', 'success'); UI.modal('item-modal', false); reload();
    }
  });

  ['filter-type','filter-diff'].forEach(id =>
    document.getElementById(id).addEventListener('change', render));

  reload();
})();
