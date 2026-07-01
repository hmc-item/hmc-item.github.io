// Supabase 접속정보 (2차 전용 별도 프로젝트 — 교체 시 이 두 줄만 수정)
const SUPABASE_URL = 'https://ozykvjuktmfyxdmudooh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ht9q_kAOXQHPDCjTu_7oqQ_64Jnr2C3';

const CONST = {
  DIFFICULTY: [1, 2, 3],
  TYPES     : { mcq: '객관식', essay: '서술형' },
  TYPE_FROM_LABEL: { '객관식': 'mcq', '서술형': 'essay' },
  ROLES     : { sme: 'sme', coach: 'coach', admin: 'admin' },
  ROLE_LABEL: { coach: '교수', admin: '관리자' },
  AREAS     : ['question', 'option1', 'option2', 'option3', 'option4', 'explanation', 'model_answer'],
  AREA_LABEL: {
    question: '문항', option1: '보기1', option2: '보기2', option3: '보기3',
    option4: '보기4', explanation: '해설', model_answer: '모범답안'
  },
  BUCKET: 'item-images',
  CLASSES   : [1, 2, 3],
  CLASS_LABEL: { 1: '1분반', 2: '2분반', 3: '3분반' },
  DEFAULT_TARGET: 50,
  GRADES    : ['기능사', '산업기사', '기사'],
  GRADE_TO_DIFFICULTY: { '기능사': 1, '산업기사': 2, '기사': 3 },
  DEFAULT_QUAL_NAME: '현대엔지비 직접개발'
};
window.CONST = CONST;
