const XlsxTool = (() => {
  const HEADERS = ['순번','문항유형','급수','문항','보기1','보기2','보기3','보기4','정답','모범답안','해설'];
  const SAMPLE_HEADERS = ['순번','문항유형','자격등급','국가기술자격명','역량ID','카테고리','문항','보기1','보기2','보기3','보기4','정답','모범답안','해설'];

  function downloadTemplate(fmt) {
    const sample = [
      HEADERS,
      ['1','객관식','2급','베어링 손상의 주된 원인은?','마모','부식','균열','정렬불량','3','','균열은 피로하중에 의해 발생'],
      ['2','서술형','1급','윤활관리 표준 절차를 서술하시오.','','','','','','1) 점검 2) 주유 3) 기록','채점 시 단계 누락 감점']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    if (fmt === 'csv') {
      const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);   // UTF-8 BOM
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), '문항_템플릿.csv');
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '문항');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(new Blob([out], { type: 'application/octet-stream' }), '문항_템플릿.xlsx');
    }
  }

  // 첫 행을 헤더로 보고 헤더명 기준으로 각 행을 {헤더: 값} 객체로 매핑(헤더 위치 유연 대응)
  function readRows(file, headers) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          if (!rows.length) return resolve([]);
          const head = rows[0].map(h => String(h).trim());
          const idx = {}; headers.forEach(h => { idx[h] = head.indexOf(h); });
          const out = [];
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (row.every(c => String(c).trim() === '')) continue; // 빈 행 skip
            const obj = {};
            headers.forEach(h => { obj[h] = idx[h] >= 0 ? String(row[idx[h]] == null ? '' : row[idx[h]]).trim() : ''; });
            out.push(obj);
          }
          resolve(out);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  function parseFile(file) { return readRows(file, HEADERS); }
  function parseSampleFile(file) { return readRows(file, SAMPLE_HEADERS); }

  function downloadSampleTemplate(fmt) {
    const sample = [
      SAMPLE_HEADERS,
      ['1','객관식','산업기사','기계정비산업기사','','정비','베어링 손상의 주된 원인은?','마모','부식','균열','정렬불량','3','','정렬불량은 진동을 유발한다'],
      ['2','서술형','기사','건설기계설비기사','','유압','유압회로 점검 절차를 서술하시오.','','','','','','1) 압력 점검 2) 누유 확인 3) 기록','단계 누락 시 감점']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    if (fmt === 'csv') {
      const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);   // UTF-8 BOM
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), '샘플문항_템플릿.csv');
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '샘플문항');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(new Blob([out], { type: 'application/octet-stream' }), '샘플문항_템플릿.xlsx');
    }
  }

  // sample_items 레코드 배열 → 업로드 템플릿과 동일한 2차원 배열(헤더 포함)
  function buildSampleAoa(samples) {
    const rows = samples.map((sp, i) => {
      const isMcq = sp.item_type === 'mcq';
      return [
        String(i + 1),
        CONST.TYPES[sp.item_type] || '',            // 객관식|서술형 (재업로드 호환 라벨)
        sp.qual_grade || '',
        sp.qual_name || '',
        sp.comp_id || '',
        sp.category || '',
        sp.question || '',
        isMcq ? (sp.option1 || '') : '',
        isMcq ? (sp.option2 || '') : '',
        isMcq ? (sp.option3 || '') : '',
        isMcq ? (sp.option4 || '') : '',
        isMcq && sp.answer ? String(sp.answer) : '',
        isMcq ? '' : (sp.model_answer || ''),
        sp.explanation || ''
      ];
    });
    return [SAMPLE_HEADERS].concat(rows);
  }

  // 샘플 배열을 xlsx/csv로 저장. filename은 확장자 제외 베이스명.
  function downloadSampleRows(samples, fmt, filename) {
    const aoa = buildSampleAoa(samples);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const base = filename || '샘플문항';
    if (fmt === 'csv') {
      const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);   // UTF-8 BOM
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '샘플문항');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(new Blob([out], { type: 'application/octet-stream' }), base + '.xlsx');
    }
  }

  // items 레코드 배열 → 문항 업로드 템플릿과 동일한 2차원 배열(헤더 포함)
  function buildItemAoa(items) {
    const rows = items.map((it, i) => {
      const isMcq = it.item_type === 'mcq';
      return [
        String(i + 1),
        CONST.TYPES[it.item_type] || '',            // 객관식|서술형 (재업로드 호환 라벨)
        it.grade || '',
        it.question || '',
        isMcq ? (it.option1 || '') : '',
        isMcq ? (it.option2 || '') : '',
        isMcq ? (it.option3 || '') : '',
        isMcq ? (it.option4 || '') : '',
        isMcq && it.answer ? String(it.answer) : '',
        isMcq ? '' : (it.model_answer || ''),
        it.explanation || ''
      ];
    });
    return [HEADERS].concat(rows);
  }

  // 문항 배열을 xlsx/csv로 저장. filename은 확장자 제외 베이스명.
  function downloadItemRows(items, fmt, filename) {
    const aoa = buildItemAoa(items);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const base = filename || '문항';
    if (fmt === 'csv') {
      const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);   // UTF-8 BOM
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '문항');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(new Blob([out], { type: 'application/octet-stream' }), base + '.xlsx');
    }
  }

  function validateRows(raw) {
    return raw.map(r => {
      const type = CONST.TYPE_FROM_LABEL[r.문항유형];
      const errs = [];
      if (!type) errs.push('문항유형은 객관식/서술형');
      const grade = normGrade(r.급수);
      if (!CONST.ITEM_GRADES.includes(grade)) errs.push('급수는 3급/2급/1급/1급 심화');
      if (!r.문항) errs.push('문항 필수');
      if (!r.해설) errs.push('해설 필수');
      if (type === 'mcq') {
        if (!r.보기1 || !r.보기2 || !r.보기3 || !r.보기4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(Number(r.정답))) errs.push('정답 1~4');
      }
      if (type === 'essay' && !r.모범답안) errs.push('모범답안 필수');
      const data = type ? {
        item_type: type, grade: grade, bloom: '', question: r.문항,
        option1: r.보기1, option2: r.보기2, option3: r.보기3, option4: r.보기4,
        answer: Number(r.정답), model_answer: r.모범답안, explanation: r.해설
      } : null;
      return { ok: errs.length === 0, error: errs.join(', '), data, raw: r };
    });
  }

  function validateSampleRows(raw) {
    return raw.map(r => {
      const type = CONST.TYPE_FROM_LABEL[r.문항유형];
      const errs = [];
      if (!type) errs.push('문항유형은 객관식/서술형');
      if (!CONST.GRADES.includes(r.자격등급)) errs.push('자격등급은 기능사/산업기사/기사');
      if (!r.문항) errs.push('문항 필수');
      if (!r.해설) errs.push('해설 필수');
      if (type === 'mcq') {
        if (!r.보기1 || !r.보기2 || !r.보기3 || !r.보기4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(Number(r.정답))) errs.push('정답 1~4');
      }
      if (type === 'essay' && !r.모범답안) errs.push('모범답안 필수');
      const data = (type && errs.length === 0) ? {
        item_type: type, qual_grade: r.자격등급, qual_name: r.국가기술자격명,
        comp_id: r.역량ID, category: r.카테고리, question: r.문항,
        option1: r.보기1, option2: r.보기2, option3: r.보기3, option4: r.보기4,
        answer: Number(r.정답), model_answer: r.모범답안, explanation: r.해설
      } : null;
      return { ok: errs.length === 0, error: errs.join(', '), data, raw: r };
    });
  }

  // ===== 자동화 문항_DB.xlsx 흡수 (인재육성팀 "최종" 통일양식) =====
  const AUTO_SHEETS = ['Q_draft', 'Q_confirmed'];   // Q_archive 제외
  const AUTO_HEADERS = ['문항ID','직무','급수','역량코드','역량명','Bloom','유형','문항(발문)',
                        '보기1','보기2','보기3','보기4','정답','해설','모범답안'];
  // 보기 앞의 "① "·"② " 등 접두 번호 제거(item-dev는 <ol> 자동 번호라 중복 방지)
  function stripOptPrefix(s) { return String(s == null ? '' : s).replace(/^\s*[①②③④]\s*[.)]?\s*/, ''); }

  // 지정 시트들을 순회하며 헤더명 기준으로 행을 dict화. 문항ID 기준 중복 제거.
  function parseAutomationFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const seen = {}; const out = [];
          const sheetNames = wb.SheetNames.filter(n => AUTO_SHEETS.indexOf(n) >= 0);
          const targets = sheetNames.length ? sheetNames : [wb.SheetNames[0]]; // 시트명 다르면 첫 시트
          targets.forEach(sn => {
            const ws = wb.Sheets[sn];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
            if (!rows.length) return;
            const head = rows[0].map(h => String(h).trim());
            const idx = {}; AUTO_HEADERS.forEach(h => { idx[h] = head.indexOf(h); });
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              if (row.every(c => String(c).trim() === '')) continue;
              const obj = {};
              AUTO_HEADERS.forEach(h => { obj[h] = idx[h] >= 0 ? String(row[idx[h]] == null ? '' : row[idx[h]]) : ''; });
              const key = String(obj['문항ID'] || '').trim();
              if (key && seen[key]) continue;      // 중복 문항ID 스킵(먼저 읽힌 것 유지)
              if (key) seen[key] = true;
              out.push(obj);
            }
          });
          resolve(out);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // 최종양식 행 → 정규화·검증. data에 _job/_area(=역량명, 그룹키)·_compId(역량코드, 있으면 프리필) 포함.
  function validateAutomationRows(raw) {
    return raw.map(r => {
      const type = normType(r['유형']);
      const grade = normGrade(r['급수']);
      const errs = [];
      if (!type) errs.push('유형 판별 불가(객관식/주관식)');
      if (!CONST.ITEM_GRADES.includes(grade)) errs.push('급수 판별 불가');
      const question = stripMarkers(r['문항(발문)']);
      const explanation = stripMarkers(r['해설']);
      if (!question) errs.push('발문 필수');
      if (!explanation) errs.push('해설 필수');
      const o1 = stripOptPrefix(stripMarkers(r['보기1'])), o2 = stripOptPrefix(stripMarkers(r['보기2'])),
            o3 = stripOptPrefix(stripMarkers(r['보기3'])), o4 = stripOptPrefix(stripMarkers(r['보기4']));
      const ans = normAnswer(r['정답']);
      if (type === 'mcq') {
        if (!o1 || !o2 || !o3 || !o4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(ans)) errs.push('정답 1~4');
      }
      const modelAns = stripMarkers(r['모범답안']);
      if (type === 'essay' && !modelAns) errs.push('모범답안 필수');
      const data = errs.length === 0 ? {
        item_type: type, grade: grade, bloom: String(r['Bloom'] || '').trim(),
        question: question,
        option1: o1, option2: o2, option3: o3, option4: o4,
        answer: type === 'mcq' ? ans : null,
        model_answer: type === 'essay' ? modelAns : '',
        explanation: explanation,
        _job: String(r['직무'] || '').trim(),
        _area: String(r['역량명'] || '').trim(),
        _compId: String(r['역량코드'] || '').trim()
      } : null;
      return { ok: errs.length === 0, error: errs.join(', '), data, raw: r };
    });
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
  }

  return { downloadTemplate, parseFile, validateRows, HEADERS,
           downloadSampleTemplate, parseSampleFile, validateSampleRows, SAMPLE_HEADERS,
           buildSampleAoa, downloadSampleRows,
           buildItemAoa, downloadItemRows,
           parseAutomationFile, validateAutomationRows };
})();
window.XlsxTool = XlsxTool;
