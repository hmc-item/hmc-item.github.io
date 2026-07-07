const API = (() => {

  let lastUploadError = '';   // 최근 이미지 업로드 실패 사유(토스트로 노출 — 멤버가 원인 보고 가능)

  // ===== Teams =====
  async function getTeams() {
    const { data, error } = await DB.from('teams').select('*').order('team_name');
    if (error) { console.error('[getTeams]', error); return []; }
    return data || [];
  }
  async function addTeam(name, classNo) {
    const id = generateId('t');
    const ok = await saveRow('teams', null, null,
      { id, team_id: id, team_name: name, class_no: classNo != null ? classNo : null });
    return ok ? { team_id: id } : null;
  }
  async function updateTeam(teamId, name, classNo) {
    const { data } = await DB.from('teams').select('*').eq('team_id', teamId);
    if (!data || !data.length) return false;
    const cur = data[0];
    return saveRow('teams', 'team_id', teamId,
      { id: cur.id, team_id: teamId, team_name: name,
        class_no: classNo != null ? classNo : null, created_at: cur.created_at });
  }
  async function deleteTeam(teamId) {
    const { error } = await DB.from('teams').delete().eq('team_id', teamId);
    if (error) { console.error('[deleteTeam]', error); return false; }
    return true;
  }

  // ===== Competencies =====
  async function getCompetencies() {
    const { data, error } = await DB.from('competencies').select('*');
    if (error) { console.error('[getCompetencies]', error); return []; }
    return (data || []).sort((a, b) => Number(a.order_index) - Number(b.order_index));
  }
  async function addCompetency(b) {
    const id = generateId('c');
    const ok = await saveRow('competencies', null, null, {
      id, comp_id: id, comp_name: b.comp_name, category: b.category || null,
      description: b.description || null, team_id: b.team_id || null,
      target_count: b.target_count != null ? b.target_count : CONST.DEFAULT_TARGET,
      order_index: b.order_index || 0
    });
    return ok ? { comp_id: id } : null;
  }
  async function updateCompetency(b) {
    const { data } = await DB.from('competencies').select('*').eq('comp_id', b.comp_id);
    if (!data || !data.length) return false;
    const cur = data[0];
    const pick = (k, d) => (b[k] !== undefined ? b[k] : (d !== undefined ? d : cur[k]));
    return saveRow('competencies', 'comp_id', b.comp_id, {
      id: cur.id, comp_id: b.comp_id, comp_name: pick('comp_name'),
      category: pick('category'), description: pick('description'),
      team_id: pick('team_id'), target_count: pick('target_count'),
      order_index: pick('order_index'), created_at: cur.created_at
    });
  }
  async function deleteCompetency(compId) {
    const { error } = await DB.from('competencies').delete().eq('comp_id', compId);
    if (error) { console.error('[deleteCompetency]', error); return false; }
    return true;
  }

  // ===== Items =====
  async function getItems(p) {
    p = p || {};
    let q = DB.from('items').select('*');
    if (p.comp_id) q = q.eq('comp_id', p.comp_id);
    if (p.team_id) q = q.eq('team_id', p.team_id);
    const { data, error } = await q;
    if (error) { console.error('[getItems]', error); return []; }
    return (data || []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }
  async function getItemCounts() {
    const { data, error } = await DB.from('items').select('comp_id');
    if (error) { console.error('[getItemCounts]', error); return {}; }
    const m = {};
    (data || []).forEach(r => { m[r.comp_id] = (m[r.comp_id] || 0) + 1; });
    return m;
  }
  function normItem(b, idOverride) {
    const isMcq = b.item_type === 'mcq';
    return {
      item_id: idOverride, comp_id: b.comp_id, team_id: b.team_id,
      item_type: b.item_type, grade: b.grade || null, bloom: b.bloom || null,
      question: b.question || '',
      option1: isMcq ? (b.option1 || '') : null,
      option2: isMcq ? (b.option2 || '') : null,
      option3: isMcq ? (b.option3 || '') : null,
      option4: isMcq ? (b.option4 || '') : null,
      answer : isMcq ? (b.answer != null ? Number(b.answer) : null) : null,
      model_answer: isMcq ? null : (b.model_answer || ''),
      explanation : b.explanation || '',
      updated_at  : new Date().toISOString()
    };
  }
  async function saveItem(b) {
    if (!b.comp_id || !b.team_id || !b.item_type || !b.question) return null;
    if (b.item_id) {
      const { data } = await DB.from('items').select('created_at').eq('item_id', b.item_id);
      const created = (data && data[0]) ? data[0].created_at : new Date().toISOString();
      const row = normItem(b, b.item_id); row.created_at = created;
      const ok = await saveRow('items', 'item_id', b.item_id, row);
      return ok ? true : null;
    }
    const id = generateId('it');
    const row = normItem(b, id); row.created_at = new Date().toISOString();
    const ok = await saveRow('items', null, null, row);
    return ok ? { item_id: id } : null;
  }
  async function deleteItem(itemId) {
    const { error } = await DB.from('items').delete().eq('item_id', itemId);
    if (error) { console.error('[deleteItem]', error); return false; }
    return true;
  }

  // ===== Images =====
  function publicUrl(path) {
    const { data } = DB.storage.from(CONST.BUCKET).getPublicUrl(path);
    return data ? data.publicUrl : '';
  }
  async function getImages(itemId) {
    const { data, error } = await DB.from('item_images').select('*').eq('item_id', itemId);
    if (error) { console.error('[getImages]', error); return []; }
    return data || [];
  }
  async function getImagesByItems(ids) {
    if (!ids || !ids.length) return {};
    const { data, error } = await DB.from('item_images').select('*').in('item_id', ids);
    if (error) { console.error('[getImagesByItems]', error); return {}; }
    const m = {}; (data || []).forEach(r => { (m[r.item_id] = m[r.item_id] || []).push(r); });
    return m;
  }
  async function uploadImage(itemId, compId, area, file) {
    const safe = safeKey(file.name);   // 스토리지 키는 ASCII만(한글 파일명 → Invalid key 400 방지)
    const path = compId + '/' + itemId + '/' + Date.now() + '_' + safe;
    const up = await DB.storage.from(CONST.BUCKET).upload(path, file, { upsert: false });
    if (up.error) { console.error('[uploadImage]', up.error); lastUploadError = up.error.message || String(up.error); return null; }
    const id = generateId('img');
    const ok = await saveRow('item_images', null, null,
      { image_id: id, item_id: itemId, area, file_path: path, file_name: file.name });
    if (!ok) return null;
    return { image_id: id, item_id: itemId, area, file_path: path, file_name: file.name };
  }
  async function deleteImage(img) {
    await DB.storage.from(CONST.BUCKET).remove([img.file_path]);
    const { error } = await DB.from('item_images').delete().eq('image_id', img.image_id);
    if (error) { console.error('[deleteImage]', error); return false; }
    return true;
  }

  // ===== Sample Items =====
  async function getSampleItems(p) {
    p = p || {};
    let q = DB.from('sample_items').select('*');
    if (p.comp_id) q = q.eq('comp_id', p.comp_id);
    const { data, error } = await q;
    if (error) { console.error('[getSampleItems]', error); return []; }
    return (data || []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }
  async function getSampleCount() {
    const { count, error } = await DB.from('sample_items').select('*', { count: 'exact', head: true });
    if (error) { console.error('[getSampleCount]', error); return 0; }
    return count || 0;
  }
  function normSample(b, idOverride) {
    const isMcq = b.item_type === 'mcq';
    const qn = (b.qual_name && String(b.qual_name).trim()) ? String(b.qual_name).trim() : CONST.DEFAULT_QUAL_NAME;
    return {
      sample_id: idOverride, item_type: b.item_type,
      qual_grade: b.qual_grade || null, qual_name: qn,
      comp_id: b.comp_id || null, category: b.category || null,
      question: b.question || '',
      option1: isMcq ? (b.option1 || '') : null,
      option2: isMcq ? (b.option2 || '') : null,
      option3: isMcq ? (b.option3 || '') : null,
      option4: isMcq ? (b.option4 || '') : null,
      answer : isMcq ? (b.answer != null ? Number(b.answer) : null) : null,
      model_answer: isMcq ? null : (b.model_answer || ''),
      explanation : b.explanation || '',
      updated_at  : new Date().toISOString()
    };
  }
  async function saveSampleItem(b) {
    if (!b.item_type || !b.question || !b.explanation) return null;
    if (b.sample_id) {
      const { data } = await DB.from('sample_items').select('created_at').eq('sample_id', b.sample_id);
      const created = (data && data[0]) ? data[0].created_at : new Date().toISOString();
      const row = normSample(b, b.sample_id); row.created_at = created;
      const ok = await saveRow('sample_items', 'sample_id', b.sample_id, row);
      return ok ? true : null;
    }
    const id = generateId('sm');
    const row = normSample(b, id); row.created_at = new Date().toISOString();
    const ok = await saveRow('sample_items', null, null, row);
    return ok ? { sample_id: id } : null;
  }
  async function deleteSampleItem(sampleId) {
    const imgs = await getSampleImages(sampleId);
    for (const im of imgs) { await deleteSampleImage(im); }
    const { error } = await DB.from('sample_items').delete().eq('sample_id', sampleId);
    if (error) { console.error('[deleteSampleItem]', error); return false; }
    return true;
  }

  // ===== Sample Images =====
  async function getSampleImages(sampleId) {
    const { data, error } = await DB.from('sample_item_images').select('*').eq('sample_id', sampleId);
    if (error) { console.error('[getSampleImages]', error); return []; }
    return data || [];
  }
  async function getSampleImagesByIds(ids) {
    if (!ids || !ids.length) return {};
    const { data, error } = await DB.from('sample_item_images').select('*').in('sample_id', ids);
    if (error) { console.error('[getSampleImagesByIds]', error); return {}; }
    const m = {}; (data || []).forEach(r => { (m[r.sample_id] = m[r.sample_id] || []).push(r); });
    return m;
  }
  async function uploadSampleImage(sampleId, area, file) {
    const safe = safeKey(file.name);   // 스토리지 키는 ASCII만(한글 파일명 → Invalid key 400 방지)
    const path = 'samples/' + sampleId + '/' + Date.now() + '_' + safe;
    const up = await DB.storage.from(CONST.BUCKET).upload(path, file, { upsert: false });
    if (up.error) { console.error('[uploadSampleImage]', up.error); lastUploadError = up.error.message || String(up.error); return null; }
    const id = generateId('simg');
    const ok = await saveRow('sample_item_images', null, null,
      { image_id: id, sample_id: sampleId, area, file_path: path, file_name: file.name });
    if (!ok) return null;
    return { image_id: id, sample_id: sampleId, area, file_path: path, file_name: file.name };
  }
  async function deleteSampleImage(img) {
    await DB.storage.from(CONST.BUCKET).remove([img.file_path]);
    const { error } = await DB.from('sample_item_images').delete().eq('image_id', img.image_id);
    if (error) { console.error('[deleteSampleImage]', error); return false; }
    return true;
  }

  // ===== 차용: 샘플 이미지를 새 item으로 복제 =====
  async function copySampleImageToItem(newItemId, compId, sImg) {
    try {
      const url = publicUrl(sImg.file_path);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('fetch ' + resp.status);
      const blob = await resp.blob();
      const file = new File([blob], sImg.file_name, { type: blob.type || 'application/octet-stream' });
      const r = await uploadImage(newItemId, compId, sImg.area, file);
      return !!r;
    } catch (e) { console.error('[copySampleImageToItem]', e); return false; }
  }

  // ===== Notices =====
  function sortNotices(arr) {
    return (arr || []).slice().sort((a, b) => {
      const pa = a.is_pinned ? 1 : 0, pb = b.is_pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;                       // 고정 먼저
      return String(b.created_at).localeCompare(String(a.created_at)); // 최신순
    });
  }
  async function getNotices() {
    const { data, error } = await DB.from('notices').select('*');
    if (error) { console.error('[getNotices]', error); return []; }
    return sortNotices(data);
  }
  async function getNoticesForTeam(teamId) {
    const all = await getNotices();
    return all.filter(n => n.is_common ||
      (Array.isArray(n.team_ids) && n.team_ids.includes(teamId)));
  }
  async function saveNotice(b) {
    const id = b.notice_id || generateId('n');
    let created_at;
    if (b.notice_id) {   // 수정: 기존 등록일 보존(정렬 유지)
      const { data } = await DB.from('notices').select('created_at').eq('notice_id', b.notice_id);
      created_at = data && data[0] ? data[0].created_at : undefined;
    }
    const row = {
      id, notice_id: id, title: b.title, content: b.content,
      is_common: !!b.is_common,
      team_ids: b.is_common ? [] : (b.team_ids || []),
      is_pinned: !!b.is_pinned
    };
    if (created_at) row.created_at = created_at;
    const ok = await saveRow('notices', b.notice_id ? 'notice_id' : null, b.notice_id || null, row);
    return ok ? { notice_id: id } : null;
  }
  async function deleteNotice(noticeId) {
    const { error } = await DB.from('notices').delete().eq('notice_id', noticeId);
    if (error) { console.error('[deleteNotice]', error); return false; }
    return true;
  }

  // ===== Help texts =====
  async function getHelpTexts() {
    const { data, error } = await DB.from('help_texts').select('*');
    if (error) { console.error('[getHelpTexts]', error); return []; }
    return data || [];
  }
  async function getHelpText(role) {
    const { data, error } = await DB.from('help_texts').select('body').eq('role', role);
    if (error) { console.error('[getHelpText]', error); return null; }
    return data && data[0] ? data[0].body : null;
  }
  async function saveHelpText(role, body) {
    return saveRow('help_texts', 'role', role, { role, body });
  }

  // ===== Theory sections =====
  async function getTheorySection(compId) {
    const { data, error } = await DB.from('theory_sections')
      .select('content,status,updated_at').eq('section_key', compId);
    if (error) { console.error('[getTheorySection]', error); return null; }
    return data && data[0] ? data[0] : null;
  }
  async function saveTheorySection(draft) {
    if (!draft || !draft.sectionKey) return null;
    const id = 'ths_' + draft.sectionKey;
    const row = {
      id, section_key: draft.sectionKey,
      subject: draft.subject || null, section_title: draft.sectionTitle || null,
      content: draft, status: draft.status || 'draft',
      updated_at: new Date().toISOString(),
    };
    const ok = await saveRow('theory_sections', 'section_key', draft.sectionKey, row);
    return ok ? { section_key: draft.sectionKey } : null;
  }
  async function setDevDone(compId, v) {
    const { data } = await DB.from('competencies').select('*').eq('comp_id', compId);
    if (!data || !data.length) return false;
    const cur = data[0];
    return saveRow('competencies', 'comp_id', compId, Object.assign({}, cur, { dev_done: !!v }));
  }

  // ===== Comments =====
  async function getComments(p) {
    p = p || {}; let q = DB.from('comments').select('*');
    if (p.item_id) q = q.eq('item_id', p.item_id);
    if (p.comp_id) q = q.eq('comp_id', p.comp_id);
    const { data, error } = await q;
    if (error) { console.error('[getComments]', error); return []; }
    return (data || []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }
  async function getCommentsByItems(ids) {
    if (!ids || !ids.length) return {};
    const { data, error } = await DB.from('comments').select('*').in('item_id', ids);
    if (error) { console.error('[getCommentsByItems]', error); return {}; }
    const m = {}; (data || []).forEach(c => { (m[c.item_id] = m[c.item_id] || []).push(c); });
    Object.keys(m).forEach(k => m[k].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))));
    return m;
  }
  async function getUnresolvedCounts() {
    const { data, error } = await DB.from('comments').select('comp_id,is_resolved').eq('is_resolved', false);
    if (error) { console.error('[getUnresolvedCounts]', error); return {}; }
    const m = {}; (data || []).forEach(c => { m[c.comp_id] = (m[c.comp_id] || 0) + 1; });
    return m;
  }
  async function addComment(b) {
    if (!b.item_id || !b.content) return null;
    const id = generateId('cm');
    const ok = await saveRow('comments', null, null, {
      comment_id: id, item_id: b.item_id, comp_id: b.comp_id || '',
      author_role: b.author_role, content: b.content, is_resolved: false
    });
    return ok ? { comment_id: id } : null;
  }
  async function _reinsertComment(commentId, patch) {
    const { data } = await DB.from('comments').select('*').eq('comment_id', commentId);
    if (!data || !data.length) return false;
    const cur = data[0];
    return saveRow('comments', 'comment_id', commentId, {
      comment_id: commentId, item_id: cur.item_id, comp_id: cur.comp_id,
      author_role: cur.author_role,
      content: patch.content !== undefined ? patch.content : cur.content,
      is_resolved: patch.is_resolved !== undefined ? patch.is_resolved : cur.is_resolved,
      created_at: cur.created_at
    });
  }
  async function updateComment(id, content) { return _reinsertComment(id, { content }); }
  async function setCommentResolved(id, v) { return _reinsertComment(id, { is_resolved: v }); }
  async function deleteComment(id) {
    const { error } = await DB.from('comments').delete().eq('comment_id', id);
    if (error) { console.error('[deleteComment]', error); return false; }
    return true;
  }

  return {
    getTeams, addTeam, updateTeam, deleteTeam,
    getCompetencies, addCompetency, updateCompetency, deleteCompetency,
    getItems, getItemCounts, saveItem, deleteItem,
    getImages, getImagesByItems, uploadImage, deleteImage, publicUrl,
    getComments, getCommentsByItems, getUnresolvedCounts,
    addComment, updateComment, setCommentResolved, deleteComment,
    getSampleItems, getSampleCount, saveSampleItem, deleteSampleItem,
    getSampleImages, getSampleImagesByIds, uploadSampleImage, deleteSampleImage,
    copySampleImageToItem,
    getNotices, getNoticesForTeam, saveNotice, deleteNotice,
    getHelpTexts, getHelpText, saveHelpText,
    getTheorySection, saveTheorySection, setDevDone,
    uploadErrorMessage: () => lastUploadError
  };
})();
window.API = API;
