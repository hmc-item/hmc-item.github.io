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

  return {
    getTeams, addTeam, updateTeam, deleteTeam,
    getCompetencies, addCompetency, updateCompetency, deleteCompetency
  };
})();
window.API = API;
