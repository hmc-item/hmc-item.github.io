const API = (() => {

  // ===== Teams =====
  async function getTeams() {
    const { data, error } = await DB.from('teams').select('*').order('team_name');
    if (error) { console.error('[getTeams]', error); return []; }
    return data || [];
  }
  async function addTeam(name) {
    const id = generateId('t');
    const ok = await saveRow('teams', null, null, { id, team_id: id, team_name: name });
    return ok ? { team_id: id } : null;
  }
  async function updateTeam(teamId, name) {
    const { data } = await DB.from('teams').select('*').eq('team_id', teamId);
    if (!data || !data.length) return false;
    const cur = data[0];
    return saveRow('teams', 'team_id', teamId,
      { id: cur.id, team_id: teamId, team_name: name, created_at: cur.created_at });
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
      item_type: b.item_type, difficulty: Number(b.difficulty),
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
    const safe = file.name.replace(/[^\w.\-가-힣]/g, '_');
    const path = compId + '/' + itemId + '/' + Date.now() + '_' + safe;
    const up = await DB.storage.from(CONST.BUCKET).upload(path, file, { upsert: false });
    if (up.error) { console.error('[uploadImage]', up.error); return null; }
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

  return {
    getTeams, addTeam, updateTeam, deleteTeam,
    getCompetencies, addCompetency, updateCompetency, deleteCompetency,
    getItems, getItemCounts, saveItem, deleteItem,
    getImages, getImagesByItems, uploadImage, deleteImage, publicUrl
  };
})();
window.API = API;
