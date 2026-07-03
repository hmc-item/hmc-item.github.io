const XlsxTool = (() => {
  // ===== 최종 통일양식 (자동화 문항_DB.xlsx와 동일 28컬럼) =====
  // item-dev의 모든 업로드·다운로드·템플릿이 이 양식을 공유(SME가 자동화 앱과 동일 양식 사용).
  const FINAL_HEADERS = ['문항ID','직무','급수','역량코드','역량명','Bloom','유형','문항(발문)',
    '보기1','보기2','보기3','보기4','정답','해설','모범답안','채점루브릭','현장맥락','검토결과',
    '이미지유무','이미지저장경로','이미지출처','샘플문항활용여부','자격등급','국가기술자격명',
    '기존문항비교','유사문항ID','유사도%','최종조치'];
  const ITEM_REQUIRED   = ['유형','급수','문항(발문)','보기1','보기2','보기3','보기4','정답','해설','모범답안'];
  const SAMPLE_REQUIRED = ['유형','자격등급','문항(발문)','보기1','보기2','보기3','보기4','정답','해설','모범답안'];
  const AUTO_SHEETS = ['Q_draft', 'Q_confirmed'];   // 자동화 문항_DB.xlsx 시트(Q_archive 제외)

  // 헤더 정규화: 별표·중복공백 제거 → 템플릿("정답 *")과 자동화 출력("정답")을 같은 파서로 매칭
  function normHeader(h) { return String(h == null ? '' : h).replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
  // 필수 컬럼에 * 부착한 헤더행(빈 템플릿용 — 사람이 필수 인지)
  function starHeaders(reqSet) { return FINAL_HEADERS.map(h => reqSet.indexOf(h) >= 0 ? h + ' *' : h); }
  // 부분 map(헤더명→값)으로 최종양식 순서의 한 행 생성
  function rowFrom(map) { return FINAL_HEADERS.map(h => (map[h] != null ? map[h] : '')); }
  // 보기 앞의 "① "·"② " 접두 번호 제거(item-dev는 <ol> 자동 번호라 중복 방지)
  function stripOptPrefix(s) { return String(s == null ? '' : s).replace(/^\s*[①②③④]\s*[.)]?\s*/, ''); }

  // 시트 2D 배열 → 헤더명(정규화) 기준 dict 배열. 헤더 순서·별표·잉여 컬럼에 유연.
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const head = rows[0].map(normHeader);
    const idx = {}; FINAL_HEADERS.forEach(h => { idx[h] = head.indexOf(h); });
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.every(c => String(c == null ? '' : c).trim() === '')) continue;   // 빈 행 skip
      const obj = {};
      FINAL_HEADERS.forEach(h => { obj[h] = idx[h] >= 0 ? String(row[idx[h]] == null ? '' : row[idx[h]]) : ''; });
      out.push(obj);
    }
    return out;
  }

  // 단일 시트(첫 시트) 파싱 — SME 문항/샘플 업로드용
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          resolve(rowsToObjects(rows));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  const parseSampleFile = parseFile;   // 동일 양식

  // 자동화 문항_DB.xlsx(Q_draft+Q_confirmed 시트) 파싱 — 관리자 가져오기용. 문항ID 기준 중복 제거.
  function parseAutomationFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const names = wb.SheetNames.filter(n => AUTO_SHEETS.indexOf(n) >= 0);
          const targets = names.length ? names : [wb.SheetNames[0]];   // 시트명 다르면 첫 시트
          const seen = {}; const out = [];
          targets.forEach(sn => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false });
            rowsToObjects(rows).forEach(o => {
              const k = String(o['문항ID'] || '').trim();
              if (k && seen[k]) return;
              if (k) seen[k] = true;
              out.push(o);
            });
          });
          resolve(out);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // 공통 정규화(유형·발문·보기·정답 등) — item/sample 검증 공용
  function common(r) {
    return {
      type: normType(r['유형']),
      question: stripMarkers(r['문항(발문)']),
      explanation: stripMarkers(r['해설']),
      o1: stripOptPrefix(stripMarkers(r['보기1'])), o2: stripOptPrefix(stripMarkers(r['보기2'])),
      o3: stripOptPrefix(stripMarkers(r['보기3'])), o4: stripOptPrefix(stripMarkers(r['보기4'])),
      ans: normAnswer(r['정답']),
      modelAns: stripMarkers(r['모범답안'])
    };
  }

  // 문항(개발) 검증 — SME 업로드 + 관리자 가져오기 공용. data에 _job/_area/_compId(그룹 매핑) 포함.
  function validateRows(raw) {
    return raw.map(r => {
      const c = common(r); const grade = normGrade(r['급수']); const errs = [];
      if (!c.type) errs.push('유형 판별 불가(객관식/주관식)');
      if (!CONST.ITEM_GRADES.includes(grade)) errs.push('급수는 3급/2급/1급/1급 심화');
      if (!c.question) errs.push('문항(발문) 필수');
      if (!c.explanation) errs.push('해설 필수');
      if (c.type === 'mcq') {
        if (!c.o1 || !c.o2 || !c.o3 || !c.o4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(c.ans)) errs.push('정답 1~4');
      }
      if (c.type === 'essay' && !c.modelAns) errs.push('모범답안 필수');
      const data = errs.length === 0 ? {
        item_type: c.type, grade: grade, bloom: String(r['Bloom'] || '').trim(),
        question: c.question, option1: c.o1, option2: c.o2, option3: c.o3, option4: c.o4,
        answer: c.type === 'mcq' ? c.ans : null,
        model_answer: c.type === 'essay' ? c.modelAns : '',
        explanation: c.explanation,
        _job: String(r['직무'] || '').trim(),
        _area: String(r['역량명'] || '').trim(),
        _compId: String(r['역량코드'] || '').trim()
      } : null;
      return { ok: errs.length === 0, error: errs.join(', '), data, raw: r };
    });
  }
  const validateAutomationRows = validateRows;   // 동일(최종양식 공용)

  // 샘플 검증 — 자격등급 필수, 역량코드→comp_id
  function validateSampleRows(raw) {
    return raw.map(r => {
      const c = common(r); const qg = String(r['자격등급'] || '').trim(); const errs = [];
      if (!c.type) errs.push('유형은 객관식/서술형');
      if (!CONST.GRADES.includes(qg)) errs.push('자격등급은 기능사/산업기사/기사');
      if (!c.question) errs.push('문항(발문) 필수');
      if (!c.explanation) errs.push('해설 필수');
      if (c.type === 'mcq') {
        if (!c.o1 || !c.o2 || !c.o3 || !c.o4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(c.ans)) errs.push('정답 1~4');
      }
      if (c.type === 'essay' && !c.modelAns) errs.push('모범답안 필수');
      const data = errs.length === 0 ? {
        item_type: c.type, qual_grade: qg, qual_name: String(r['국가기술자격명'] || '').trim(),
        comp_id: String(r['역량코드'] || '').trim(), category: '',
        question: c.question, option1: c.o1, option2: c.o2, option3: c.o3, option4: c.o4,
        answer: c.type === 'mcq' ? c.ans : null,
        model_answer: c.type === 'essay' ? c.modelAns : '',
        explanation: c.explanation
      } : null;
      return { ok: errs.length === 0, error: errs.join(', '), data, raw: r };
    });
  }

  // ===== 파일 출력 =====
  function writeAoa(aoa, sheetName, fmt, base) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (fmt === 'csv') {
      const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);   // UTF-8 BOM
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(new Blob([out], { type: 'application/octet-stream' }), base + '.xlsx');
    }
  }

  // 빈 문항 템플릿 (필수 * 표기 + 예시 2행)
  function downloadTemplate(fmt) {
    const aoa = [starHeaders(ITEM_REQUIRED),
      rowFrom({ '유형': '객관식', '급수': '2급', 'Bloom': '이해', '문항(발문)': '베어링 손상의 주된 원인은?',
        '보기1': '마모', '보기2': '부식', '보기3': '균열', '보기4': '정렬불량', '정답': '3', '해설': '균열은 피로하중에 의해 발생' }),
      rowFrom({ '유형': '서술형', '급수': '1급', '문항(발문)': '윤활관리 표준 절차를 서술하시오.',
        '모범답안': '1) 점검 2) 주유 3) 기록', '해설': '채점 시 단계 누락 감점' })];
    writeAoa(aoa, '문항', fmt, '문항_템플릿');
  }

  // 빈 샘플 템플릿 (필수 * 표기)
  function downloadSampleTemplate(fmt) {
    const aoa = [starHeaders(SAMPLE_REQUIRED),
      rowFrom({ '유형': '객관식', '자격등급': '산업기사', '국가기술자격명': '기계정비산업기사', '문항(발문)': '베어링 손상의 주된 원인은?',
        '보기1': '마모', '보기2': '부식', '보기3': '균열', '보기4': '정렬불량', '정답': '3', '해설': '정렬불량은 진동을 유발한다' }),
      rowFrom({ '유형': '서술형', '자격등급': '기사', '국가기술자격명': '건설기계설비기사', '문항(발문)': '유압회로 점검 절차를 서술하시오.',
        '모범답안': '1) 압력 점검 2) 누유 확인 3) 기록', '해설': '단계 누락 시 감점' })];
    writeAoa(aoa, '샘플문항', fmt, '샘플문항_템플릿');
  }

  // items 레코드 배열 → 최종양식 2D 배열(헤더 clean, 재업로드·자동화 호환)
  function buildItemAoa(items) {
    const rows = items.map(it => {
      const isMcq = it.item_type === 'mcq';
      return rowFrom({
        '문항ID': it.item_id || '', '급수': it.grade || '', 'Bloom': it.bloom || '',
        '유형': CONST.TYPES[it.item_type] || '', '문항(발문)': it.question || '',
        '보기1': isMcq ? (it.option1 || '') : '', '보기2': isMcq ? (it.option2 || '') : '',
        '보기3': isMcq ? (it.option3 || '') : '', '보기4': isMcq ? (it.option4 || '') : '',
        '정답': isMcq && it.answer ? String(it.answer) : '', '해설': it.explanation || '',
        '모범답안': isMcq ? '' : (it.model_answer || '')
      });
    });
    return [FINAL_HEADERS].concat(rows);
  }
  function downloadItemRows(items, fmt, filename) {
    writeAoa(buildItemAoa(items), '문항', fmt, filename || '문항');
  }

  // sample_items 레코드 배열 → 최종양식 2D 배열
  function buildSampleAoa(samples) {
    const rows = samples.map(sp => {
      const isMcq = sp.item_type === 'mcq';
      return rowFrom({
        '문항ID': sp.sample_id || '', '역량코드': sp.comp_id || '',
        '유형': CONST.TYPES[sp.item_type] || '', '자격등급': sp.qual_grade || '', '국가기술자격명': sp.qual_name || '',
        '문항(발문)': sp.question || '',
        '보기1': isMcq ? (sp.option1 || '') : '', '보기2': isMcq ? (sp.option2 || '') : '',
        '보기3': isMcq ? (sp.option3 || '') : '', '보기4': isMcq ? (sp.option4 || '') : '',
        '정답': isMcq && sp.answer ? String(sp.answer) : '', '해설': sp.explanation || '',
        '모범답안': isMcq ? '' : (sp.model_answer || '')
      });
    });
    return [FINAL_HEADERS].concat(rows);
  }
  function downloadSampleRows(samples, fmt, filename) {
    writeAoa(buildSampleAoa(samples), '샘플문항', fmt, filename || '샘플문항');
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
  }

  return { FINAL_HEADERS,
           downloadTemplate, parseFile, validateRows,
           downloadSampleTemplate, parseSampleFile, validateSampleRows,
           buildSampleAoa, downloadSampleRows,
           buildItemAoa, downloadItemRows,
           parseAutomationFile, validateAutomationRows };
})();
window.XlsxTool = XlsxTool;
