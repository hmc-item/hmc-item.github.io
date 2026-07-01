const XlsxTool = (() => {
  const HEADERS = ['순번','문항유형','난이도','문항','보기1','보기2','보기3','보기4','정답','모범답안','해설'];

  function downloadTemplate(fmt) {
    const sample = [
      HEADERS,
      ['1','객관식','2','베어링 손상의 주된 원인은?','마모','부식','균열','정렬불량','3','','균열은 피로하중에 의해 발생'],
      ['2','서술형','3','윤활관리 표준 절차를 서술하시오.','','','','','','1) 점검 2) 주유 3) 기록','채점 시 단계 누락 감점']
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

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          if (!rows.length) return resolve([]);
          // 첫 행을 헤더로 보고 매핑(헤더 위치 유연 대응: 헤더명 기준)
          const head = rows[0].map(h => String(h).trim());
          const idx = {}; HEADERS.forEach(h => { idx[h] = head.indexOf(h); });
          const out = [];
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (row.every(c => String(c).trim() === '')) continue; // 빈 행 skip
            const get = (h) => idx[h] >= 0 ? String(row[idx[h]] == null ? '' : row[idx[h]]).trim() : '';
            out.push({
              순번: get('순번'), 문항유형: get('문항유형'), 난이도: get('난이도'),
              문항: get('문항'), 보기1: get('보기1'), 보기2: get('보기2'),
              보기3: get('보기3'), 보기4: get('보기4'), 정답: get('정답'),
              모범답안: get('모범답안'), 해설: get('해설')
            });
          }
          resolve(out);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function validateRows(raw) {
    return raw.map(r => {
      const type = CONST.TYPE_FROM_LABEL[r.문항유형];
      const errs = [];
      if (!type) errs.push('문항유형은 객관식/서술형');
      const diff = Number(r.난이도);
      if (![1,2,3].includes(diff)) errs.push('난이도 1/2/3');
      if (!r.문항) errs.push('문항 필수');
      if (type === 'mcq') {
        if (!r.보기1 || !r.보기2 || !r.보기3 || !r.보기4) errs.push('보기1~4 필수');
        if (![1,2,3,4].includes(Number(r.정답))) errs.push('정답 1~4');
      }
      if (type === 'essay' && !r.모범답안) errs.push('모범답안 필수');
      const data = type ? {
        item_type: type, difficulty: diff, question: r.문항,
        option1: r.보기1, option2: r.보기2, option3: r.보기3, option4: r.보기4,
        answer: Number(r.정답), model_answer: r.모범답안, explanation: r.해설
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

  return { downloadTemplate, parseFile, validateRows, HEADERS };
})();
window.XlsxTool = XlsxTool;
