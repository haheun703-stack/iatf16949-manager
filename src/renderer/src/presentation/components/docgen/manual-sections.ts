export interface ManualSection {
  id: string
  sheetName: string
  title: string
  stage: 1 | 2 | 3 | 4
  clause?: string
  description: string
  items: string[]
  teamId: string
  relatedForms: string[]
  relatedRegulations: string[]
  tips: string[]
  autoFilled: boolean
}

export const STAGE_LABELS: Record<number, string> = {
  1: '1단계: 회사 기본 정보',
  2: '2단계: 프로세스 체계',
  3: '3단계: 표준 조항 (1~10장)',
  4: '4단계: 문서 관리'
}

export const TEAM_NAMES: Record<string, string> = {
  'team-mg': '관리지원팀',
  'team-pu': '자재/납품팀',
  'team-pr': '생산팀',
  'team-qc': '품질팀',
  'team-de': '개발팀',
  all: '전체 팀'
}

export const MANUAL_SECTIONS: ManualSection[] = [
  // ──── 1단계: 회사 기본 정보 ────
  {
    id: 'cover',
    sheetName: '표지',
    title: '표지 (Cover Page)',
    stage: 1,
    description: '매뉴얼의 첫 페이지. 회사명, 주소, 연락처 등 기본 정보를 표시합니다.',
    items: [
      '회사명 (국문/영문)',
      '본사 주소',
      '2공장 주소',
      '3공장 주소',
      '전화번호 / 팩스',
      '홈페이지 URL'
    ],
    teamId: 'team-mg',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      '회사 프로필에서 입력한 정보가 자동 반영됩니다.',
      '문서 생성 시 자동 치환되므로 별도 수정이 필요 없습니다.'
    ],
    autoFilled: true
  },
  {
    id: 'policy',
    sheetName: '0.3품질_환경방침',
    title: '품질/환경 방침',
    stage: 1,
    clause: '5.2',
    description: '회사의 품질방침과 환경방침을 선언하는 페이지입니다. 좌측에 품질방침, 우측에 환경방침을 기술합니다.',
    items: [
      '품질방침 텍스트 (자유 서술)',
      '환경방침 텍스트 (자유 서술)'
    ],
    teamId: 'team-mg',
    relatedForms: ['품질방침 선언문', '환경방침 선언문'],
    relatedRegulations: [],
    tips: [
      '품질방침은 고객만족, 지속적 개선, 법규 준수 등 핵심 가치를 포함해야 합니다.',
      '환경방침은 오염 예방, 환경법규 준수, 환경 성과 개선을 포함해야 합니다.',
      'ISO 9001:2015 5.2절 및 ISO 14001:2015 5.2절 요구사항을 충족해야 합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'company-intro',
    sheetName: '0.4회사소개',
    title: '회사 소개',
    stage: 1,
    description: '회사 개요, 연혁, 경영 비전, 조직 구조를 4개 섹션으로 소개합니다.',
    items: [
      '1. 회사 개요 (회사명, 소재지, 대표이사, 전화/팩스, 홈페이지, 주생산품)',
      '2. 회사 연혁 (주요 연도별 이벤트)',
      '3. 경영 비전 (비전 선언문)',
      '4. 조직 구조 (조직도 이미지/다이어그램)'
    ],
    teamId: 'team-mg',
    relatedForms: ['조직도', '회사 연혁표'],
    relatedRegulations: ['A-1100'],
    tips: [
      '회사명, 주소, 대표이사 등은 회사 프로필에서 자동 반영됩니다.',
      '회사 연혁은 설립일부터 주요 인증/수상/확장 이력을 연대순으로 기술합니다.',
      '조직도는 현재 TPC2 AM사업부 기준으로 작성합니다.'
    ],
    autoFilled: true
  },
  {
    id: 'camera',
    sheetName: '카메라',
    title: '방침 게시물 (카메라용)',
    stage: 1,
    description: '품질방침과 환경방침을 사내 게시용 포스터 형태로 작성합니다. 현장 게시 후 사진 촬영 대상입니다.',
    items: [
      '품질방침 게시 텍스트',
      '환경방침 게시 텍스트',
      '게시 일자',
      '회사명 + 대표이사명'
    ],
    teamId: 'team-mg',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      '0.3 방침 시트와 동일한 내용이지만, 포스터/게시판 형식입니다.',
      '심사 시 방침 게시 증빙 사진으로 활용됩니다.',
      '회사명, 대표이사, 날짜는 자동 치환됩니다.'
    ],
    autoFilled: true
  },

  // ──── 2단계: 프로세스 체계 ────
  {
    id: 'process-map',
    sheetName: '0.5프로세스맵',
    title: '프로세스맵',
    stage: 2,
    clause: '4.4',
    description: '품질경영시스템의 전체 프로세스를 시각적으로 표현한 다이어그램입니다.',
    items: [
      '프로세스맵 다이어그램 (COP/SP/MP)',
      '외주 프로세스 식별 및 기술',
      '공장별 외주 프로세스 차이점'
    ],
    teamId: 'team-qc',
    relatedForms: ['프로세스 맵', '거북이 다이어그램', '프로세스 상호작용도'],
    relatedRegulations: ['QM-01'],
    tips: [
      'COP(고객지향 프로세스), SP(지원 프로세스), MP(경영 프로세스)로 분류합니다.',
      '외주 프로세스가 있으면 별도 기술하고 관리 방법을 명시합니다.',
      '프로세스맵 이미지가 Excel 시트에 삽입되어 있으며, 직접 편집이 필요할 수 있습니다.'
    ],
    autoFilled: false
  },
  {
    id: 'matrix-dept',
    sheetName: '0.6프로세스 매트릭스(부서)',
    title: '프로세스 매트릭스 (부서별)',
    stage: 2,
    clause: '4.4',
    description: '각 프로세스/표준 문서에 대한 부서별 책임을 매핑하는 매트릭스입니다.',
    items: [
      '프로세스명 및 표준번호 목록',
      '부서명 (열 헤더): 총무, 영업, 품질, 개발, 구매, 생산, 생기',
      '책임 구분: ● 주관부서 / ○ 관련부서'
    ],
    teamId: 'team-qc',
    relatedForms: ['R&R 매트릭스'],
    relatedRegulations: [],
    tips: [
      '부서명이 현재 조직에 맞는지 확인하세요 (관리지원팀, 자재/납품팀, 생산팀, 품질팀, 개발팀).',
      '●는 주관(주책임) 부서, ○는 관련(협조) 부서를 의미합니다.',
      '모든 규정/프로세스에 최소 하나의 주관부서가 지정되어야 합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'matrix-clause',
    sheetName: '0.7프로세스 매트릭스(조항)',
    title: '프로세스 매트릭스 (조항별)',
    stage: 2,
    clause: '4.4',
    description: 'IATF 16949 각 조항에 대해 관련 프로세스, 규정, 책임부서를 매핑하는 교차참조 매트릭스입니다.',
    items: [
      'IATF 16949 요구사항 번호 (4~10)',
      '해당 프로세스명',
      '관련 규정 (규정번호 + 규정명칭)',
      '책임부서'
    ],
    teamId: 'team-qc',
    relatedForms: ['조항-규정 매핑표'],
    relatedRegulations: [],
    tips: [
      '이 매트릭스는 심사 시 가장 중요하게 검토되는 문서 중 하나입니다.',
      'regulations.json에 정의된 모든 규정이 적절한 조항에 매핑되어야 합니다.',
      '누락된 조항이 없는지 전수 확인이 필요합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'csr-matrix',
    sheetName: '0.7-1(3공장)ZF CSR반영한 요구사항 매트릭스',
    title: 'ZF CSR 요구사항 매트릭스',
    stage: 2,
    description: 'ZF(고객사)의 고객특별요구사항(CSR)을 내부 프로세스 및 규정에 매핑합니다. 3공장 전용.',
    items: [
      'ZF CSR 요건 내용',
      '해당 IATF 16949 프로세스',
      '관련 내부 규정 및 지침',
      '주관부서',
      '기타 고객 CSR (해당 시)'
    ],
    teamId: 'team-qc',
    relatedForms: ['고객 요구사항 매트릭스', 'CSR 매핑표'],
    relatedRegulations: [],
    tips: [
      '고객별 CSR이 있는 경우에만 작성합니다.',
      '2공장 AM사업부에는 해당 고객 CSR이 있는지 확인 필요합니다.',
      '해당 없으면 이 시트는 비워두거나 삭제 가능합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'csr-ref',
    sheetName: '0.7-2(3공장)ZF CSR반영한 요구사항 매트릭스참고',
    title: 'ZF CSR 참조 표준 목록',
    stage: 2,
    description: 'CSR 매트릭스에서 참조하는 국제 표준 및 고객 표준 목록입니다.',
    items: [
      'ISO/IATF 표준 목록',
      'VDA 발행물 목록',
      'AIAG 매뉴얼 목록',
      'ZF 내부 표준 목록'
    ],
    teamId: 'team-qc',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      '참조용 문서이므로 표준 버전만 최신으로 업데이트하면 됩니다.',
      '해당 고객이 없으면 이 시트는 비워두거나 삭제 가능합니다.'
    ],
    autoFilled: false
  },

  // ──── 3단계: 표준 조항 (1~10장) ────
  {
    id: 'ch1-scope',
    sheetName: '1.적용범위_목적',
    title: '제1장 적용범위 및 목적',
    stage: 3,
    clause: '1',
    description: 'QMS의 적용범위, 목적, 책임과 권한, 문서의 승인/발행/배포 절차를 기술합니다.',
    items: [
      '적용범위 (제품 종류, 공장 위치)',
      '적용 제외 사항 (예: 8.3 설계/개발 제외 여부)',
      '목적 선언',
      '책임과 권한 기술',
      '시행일자'
    ],
    teamId: 'team-qc',
    relatedForms: ['QMS 적용범위 문서', '인증범위 정의서'],
    relatedRegulations: [],
    tips: [
      'IATF 16949에서 제외 가능한 조항은 8.3(설계/개발)뿐입니다.',
      '제외 시 타당한 사유를 기술해야 합니다.',
      '공장별로 적용범위가 다를 수 있으므로 명확히 구분합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch2-ref',
    sheetName: '2.인용규격',
    title: '제2장 인용규격',
    stage: 3,
    clause: '2',
    description: '본 매뉴얼에서 인용하는 국제 표준 목록을 기술합니다.',
    items: [
      'ISO 9001:2015 인용',
      'ISO 14001:2015 인용',
      '기타 적용 표준'
    ],
    teamId: 'team-qc',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      '표준 번호와 발행연도를 정확히 기재합니다.',
      '일반적으로 ISO 9001:2015, ISO 14001:2015가 기본입니다.',
      '대부분 보일러플레이트 텍스트이므로 수정 불필요합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch3-terms',
    sheetName: '3.용어의정의',
    title: '제3장 용어의 정의',
    stage: 3,
    clause: '3',
    description: '매뉴얼에서 사용하는 품질/환경 관련 용어를 정의합니다. 6페이지 분량의 용어집.',
    items: [
      '품질 관련 용어 정의',
      '환경 관련 용어 정의',
      '경영시스템 용어 정의',
      '회사 고유 용어 (해당 시 추가)'
    ],
    teamId: 'team-qc',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      'ISO 9000:2015 / ISO 14050에서 정의된 표준 용어를 사용합니다.',
      '대부분 표준 보일러플레이트이므로 특별한 수정이 필요 없습니다.',
      '회사 고유 약어나 용어가 있으면 추가합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch4',
    sheetName: '4.조직상황',
    title: '제4장 조직의 상황',
    stage: 3,
    clause: '4',
    description: '조직의 내외부 이슈, 이해관계자 요구, QMS 범위, 프로세스 관리를 기술합니다. 4페이지.',
    items: [
      '4.1 조직과 조직 상황의 이해 (내부/외부 이슈)',
      '4.2 이해관계자의 니즈와 기대 (고객, 공급자, 규제기관 등)',
      '4.3 QMS 적용범위 결정 (제품, 프로세스, 사이트)',
      '4.4 QMS 프로세스 (4.4.1 수립/실행, 4.4.1.1 제품적합성, 4.4.1.2 제품안전, 4.4.2 문서화)'
    ],
    teamId: 'team-qc',
    relatedForms: ['내외부 이슈 분석표', 'SWOT 분석서', '이해관계자 요구사항 목록', '프로세스 맵'],
    relatedRegulations: ['QM-01'],
    tips: [
      '내외부 이슈는 SWOT 분석 결과와 연계합니다.',
      '이해관계자별 요구사항을 구체적으로 나열합니다.',
      '제품안전(4.4.1.2)은 IATF 16949 보충 요구사항입니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch5',
    sheetName: '5.리더쉽',
    title: '제5장 리더십',
    stage: 3,
    clause: '5',
    description: '최고경영자의 리더십, 품질/환경 방침, 조직 역할/책임/권한을 기술합니다. 3페이지.',
    items: [
      '5.1 리더십과 의지표명 (5.1.1 일반, 5.1.1.1 기업책임, 5.1.1.2 효과성/효율성, 5.1.1.3 프로세스 오너, 5.1.2 고객중심)',
      '5.2 방침 (품질방침 수립, 의사소통)',
      '5.3 역할/책임/권한 (5.3.1 부여/의사소통, 5.3.2 시정조치 책임)'
    ],
    teamId: 'team-mg',
    relatedForms: ['경영방침 선언문', '조직도', '업무분장표', '직무기술서', 'R&R 매트릭스'],
    relatedRegulations: ['MP-01', 'A-1100', 'A-3100', 'A-7100'],
    tips: [
      '프로세스 오너(5.1.1.3)는 각 프로세스별 책임자를 지정해야 합니다.',
      '업무분장표는 팀별 R&R을 명확히 정의합니다.',
      '경영방침은 0.3 방침 시트와 일관성을 유지해야 합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch6',
    sheetName: '6.기획',
    title: '제6장 기획',
    stage: 3,
    clause: '6',
    description: '리스크/기회 관리, 품질목표 수립, 변경 기획을 기술합니다. 3페이지.',
    items: [
      '6.1 리스크와 기회 조치 (6.1.1 결정, 6.1.2 기획, 6.1.2.1 FMEA, 6.1.2.2 예방조치, 6.1.2.3 비상사태계획)',
      '6.2 품질목표 (6.2.1 수립, 6.2.2 달성기획, 6.2.2.1 보충)',
      '6.3 변경의 기획'
    ],
    teamId: 'team-qc',
    relatedForms: ['리스크 평가표', 'FMEA', '비상사태 대응 계획서', '품질목표 관리표', '4M 변경관리대장'],
    relatedRegulations: ['MP-02', 'A-2100', 'A-8100', 'A-8101'],
    tips: [
      '리스크 분석은 FMEA 방법론을 적용합니다 (6.1.2.1).',
      '비상사태 계획(6.1.2.3)은 BCP와 연계합니다.',
      '품질목표는 측정 가능하고 모니터링 가능해야 합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch7',
    sheetName: '7.지원',
    title: '제7장 지원',
    stage: 3,
    clause: '7',
    description: 'QMS 운영에 필요한 자원, 적격성, 인식, 의사소통, 문서관리를 기술합니다. 7페이지 (최대 분량).',
    items: [
      '7.1 자원 (인원, 기반구조, 환경, 계측기, 조직지식)',
      '7.2 적격성 (교육훈련, OJT, 심사원 자격)',
      '7.3 인식',
      '7.4 의사소통',
      '7.5 문서화된 정보 (문서관리, 기록관리)'
    ],
    teamId: 'all',
    relatedForms: ['인력운영 계획서', '설비관리 대장', '계측기 관리대장', 'MSA 보고서', '교육훈련 계획서', '문서관리 대장'],
    relatedRegulations: ['MP-03', 'A-3200', 'A-4100', 'A-4101', 'A-4200', 'F-1100', 'F-1101', 'F-2100', 'L-1100', 'L-3100', 'L-3101'],
    tips: [
      '7장은 분량이 가장 많으므로 (7페이지) 단계적으로 작성합니다.',
      '계측기 관리(7.1.5)와 MSA(7.1.5.1.1)는 품질팀 주관입니다.',
      '문서관리(7.5)는 전사 적용이므로 모든 팀이 인지해야 합니다.',
      '담당: 관리지원팀(인원/인식), 품질팀(계측기/문서), 생산팀(설비)'
    ],
    autoFilled: false
  },
  {
    id: 'ch8',
    sheetName: '8.운용',
    title: '제8장 운용',
    stage: 3,
    clause: '8',
    description: '제품 실현의 전체 과정 — 운용기획, 고객요구, 설계/개발, 구매, 생산, 검사, 부적합 관리. 17페이지 (최대 분량).',
    items: [
      '8.1 운용 기획 및 관리',
      '8.2 제품/서비스 요구사항 (고객 의사소통, 요구사항 검토, 특별특성)',
      '8.3 설계와 개발 (APQP, FMEA, PPAP, 시작품, 설계변경)',
      '8.4 외부 제공 프로세스 관리 (공급자 선정/평가/모니터링/심사)',
      '8.5 생산 및 서비스 (관리계획서, 작업표준, TPM, 식별/추적성, 변경관리)',
      '8.6 제품 불출 (검사, 레이아웃 검사, 합격판정)',
      '8.7 부적합 출력 관리 (특채, 재작업, 수리, 고객통보)'
    ],
    teamId: 'all',
    relatedForms: ['APQP 일정표', 'FMEA', '관리계획서(CP)', 'PPAP 패키지', '작업표준서', '검사기준서', '부적합품 처리 보고서'],
    relatedRegulations: ['CP-01', 'CP-02', 'CP-03', 'SP-01', 'SP-02', 'H-1100', 'H-2100', 'H-3200', 'J-1100', 'J-1101', 'J-1102', 'J-1103', 'J-2100', 'J-3100', 'K-1100', 'K-1200', 'K-2100', 'L-2100', 'M-1100', 'M-1200', 'M-2100', 'B-1100', 'D-1100'],
    tips: [
      '8장은 17페이지로 가장 방대합니다. 섹션별로 나누어 작성합니다.',
      '8.3 설계/개발은 적용 제외 가능합니다 (1장 적용범위에서 선언).',
      '5개 핵심 도구(APQP, FMEA, MSA, SPC, PPAP)가 모두 이 장에서 다루어집니다.',
      '담당: 관리지원팀(영업), 개발팀(설계), 자재/납품팀(구매), 생산팀(생산), 품질팀(검사)'
    ],
    autoFilled: false
  },
  {
    id: 'ch9',
    sheetName: '9.성과평가',
    title: '제9장 성과 평가',
    stage: 3,
    clause: '9',
    description: '성과 모니터링, 내부심사, 경영검토를 기술합니다. 5페이지.',
    items: [
      '9.1 모니터링/측정/분석/평가 (공정능력, SPC, 고객만족)',
      '9.2 내부심사 (QMS심사, 공정심사, 제품심사, 심사프로그램)',
      '9.3 경영검토 (입력, 출력, 보충 요구사항)'
    ],
    teamId: 'team-qc',
    relatedForms: ['공정능력 분석(Cpk)', 'SPC 관리도', '내부심사 계획서', '내부심사 보고서', '경영검토 회의록'],
    relatedRegulations: ['A-2200', 'A-5100', 'A-5200', 'H-3100', 'L-4100', 'L-4101', 'L-4102'],
    tips: [
      '내부심사(9.2)는 QMS/공정/제품 3종류 심사를 모두 포함해야 합니다.',
      '경영검토(9.3)는 최소 연 1회 실시하며 입력/출력 사항을 기록합니다.',
      '고객만족(9.1.2)은 고객 스코어카드, PPM, 납기 달성률 등을 분석합니다.'
    ],
    autoFilled: false
  },
  {
    id: 'ch10',
    sheetName: '10.개선',
    title: '제10장 개선',
    stage: 3,
    clause: '10',
    description: '부적합 시정조치, 지속적 개선 활동을 기술합니다. 2페이지.',
    items: [
      '10.1 일반사항 (개선 기회)',
      '10.2 부적합 및 시정조치 (10.2.3 문제해결, 10.2.4 실수방지, 10.2.5 보증관리, 10.2.6 필드고장 분석)',
      '10.3 지속적 개선 (벤치마킹, 개선과제 추진)'
    ],
    teamId: 'team-qc',
    relatedForms: ['시정조치 보고서(CAR)', '8D 보고서', '5Why 분석서', '포카요케 목록', '개선과제 추진현황표'],
    relatedRegulations: ['SP-03', 'A-6100', 'A-6200', 'A-6300', 'B-2100', 'B-2200', 'B-2300'],
    tips: [
      '문제해결(10.2.3)은 8D 방법론을 기본으로 합니다.',
      '실수방지(10.2.4)는 포카요케(Poka-Yoke) 적용 목록을 관리합니다.',
      '지속적 개선(10.3)은 제안제도, 분임조 활동과 연계합니다.'
    ],
    autoFilled: false
  },

  // ──── 4단계: 문서 관리 ────
  {
    id: 'toc',
    sheetName: '0.1목차',
    title: '목차 (Table of Contents)',
    stage: 4,
    description: '매뉴얼의 전체 장 구성과 각 장의 개정번호, 시행일자를 목록화합니다.',
    items: [
      '장번호 (제0.1장 ~ 제10장)',
      '요건번호 (IATF 조항 번호)',
      '제목',
      '개정번호',
      '시행일자'
    ],
    teamId: 'team-qc',
    relatedForms: [],
    relatedRegulations: [],
    tips: [
      '모든 장 작성 완료 후 최종적으로 정리합니다.',
      '개정번호와 시행일자가 각 장 헤더와 일치하는지 확인합니다.',
      '장 제목이 각 시트의 실제 제목과 일치해야 합니다.'
    ],
    autoFilled: true
  },
  {
    id: 'revision-history',
    sheetName: '0.2개정이력',
    title: '개정이력 및 승인',
    stage: 4,
    description: '매뉴얼의 개정 이력과 승인 체인(작성→검토→승인)을 기록합니다.',
    items: [
      '개정 이력 테이블 (개정번호, 일자, 사유, 작성자)',
      '주관부서 승인 체인 (작성→검토→검토→승인)',
      '협의부서별 서명 (7개 부서)'
    ],
    teamId: 'team-qc',
    relatedForms: ['문서 승인 절차서'],
    relatedRegulations: ['A-4100'],
    tips: [
      '이전 개정 이력을 모두 보존합니다.',
      '신규 개정 시 현재 개정번호, 일자, 변경사유를 추가합니다.',
      '모든 관련 부서의 검토/승인이 완료된 후 발행합니다.'
    ],
    autoFilled: false
  }
]
