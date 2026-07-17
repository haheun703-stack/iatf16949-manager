-- ============================================================
-- Migration 0074: SQ 체크포인트 ISIR 실사 반영 (2026-07-17)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 근거 = ISIR 스캔 354p 전수 판독(docs/sq-levelup-2026-10/)을 162개 체크포인트에
-- 대조한 실사 판정(에이전트 6영역 병렬, 보수 기준: 문서 확인분만 met/partial).
-- 결과: met 1 / partial 44 / na 1 / missing 116(이 중 근거 있는 18건만 note 기입).
-- ⚠️미터치 행만 갱신(status='missing' AND evidence_note IS NULL) — 사람이 앱에서
-- 수정한 체크는 절대 덮지 않음. 워크리스트 = 50_SQ항목별_실행워크리스트.md.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP·FMEA 4품번 2권 존재·개정정합(25460 p058~064 등), 단 28236 FMEA b개정 미반영·작업표준서/공정흐름도 실물 미편철', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 1 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '대조표 부재+불일치 실재: 재질주기 협정12개월↔CP3개월(25460 p066), 기호 C↔◆/◈, 압력 5kgf↔3kg', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 2 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '작업표준서 ISIR 세트 미편철 확인(2M100 2권 리스크15) — 현장 게시본 대조 불가', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 3 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 내 특별특성 ◆/◈ 명시 4품번 전부(25460 p059~062, 28236 p046~050, 2M100/2M110)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 4 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '측정장비 사진대장만 존재·교정유효 미기재(28236 p053), 설비·부자재 승인리스트/검증기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 5 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '자주검사 C/SHEET 실물 미확보(표준양식 금일 앱 등재만, 서식실물 없음), MES증빙 7/20 예정', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 17 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '기준수립 확인: 3-zone온도·냉각·LPG/AIR·MESH·스포트조건 CP명시(25460 p059~062 외 4품번). 실측기록·타점차트·프로파일성적서 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 19 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '4품번 CP에 수동브레이징/알곤가접 공정 부재 확인(추적맵 §5), 31728 실존·해당라인 여부 미확정', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 20 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '표준조건 vs 현장 실측 비교검증 기록 미확보(MES 기록 주장, 다운로드 증빙 7/20 예정)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 21 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 협정서 편철·양측서명(28236 2권p004 체결25.9.30 정합), 25460·2M110 체결일 공란(R11)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 22 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 단품·원소재 입고공정에 수입검사 규격·5EA/LOT 명시(2M100 2권p060 공정50 등), 별도 기준서 무', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 23 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '밀시트 수입검사 수기판정·서명 확인(28236 2권p015·p024), 자체 상하한 판정기준표 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 25 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'na', evidence_note = '4품번 전부 용접조립품 — 사내 다CAVITY 공정 없음(갑지 CAVITY 공란은 해당무 성격)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 28 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = 'PSW 한도견본란 무 표기(25460 2권p003·2M110 2권p003)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 32 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 LEAK OK/NG 마스터 시업전~1회/일·벤딩 길이센서 MASTER 명시(2M110 2권p047~052), 기록 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 34 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '품번별 신뢰성 시험계획서 편철·주기/월별 명기(25460 2권p066·2M100 p067 등), 통합 연간표 무', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 37 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '정기 성적서+전후사진 4품번 편철(25460 1권p004~005 등), 날짜역전·첨부1-1/1-3 결번·n=1(R7·R9)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 38 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'met', evidence_note = 'KTR 공인성적서 4품번 완질·전항목 불검출(TAK-2025-174166·2026-007093, 각 1권 p007~)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 39 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '25460 계획 3월 vs 실적 5월 혼재(2권p066) — 대사표 부재', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 40 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '측정설비 현황표 편철(25460 2권p067~068 30종·28236 p053), 관리번호·교정일 미기재', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 41 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '기준서 부위별 GAUGE 지정(2M100 2권p010~013)+신뢰성계획 외주항목 명기(p067)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 42 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'C/F성적서·CMM 편철(25460 2권p050~057·28236 p043~045), 2M100 JIG 2017·CMM 2022 시효(R16)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 45 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '세트 내 MSA·게이지 자료 부재 명기(25460 1권 플래그13)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 46 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 CP 초/중/종품 자주검사·C/F 기준 명시(25460 2권p059~062 등), 표준 C/SHEET 서식 미수취', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 49 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 용접외관·절단용입·LEAK 기준+용입100% 성적서(2M110 2권p017·2M100 p022)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 50 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 검사기준서 외관·치수·C/F장착성 완비(2M100 2권p007~013 84항목 등), 절단면 기준은 CP에만', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 53 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '26.03 정기검사 세트 4품번 실편철(각 1권), 1회/3개월 기준 미충족·치수 결권(R6)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 54 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '절개 용입성적서(2M110 2권p017 26.4.23 용입100% 등)+기밀성적서 편철, 공정 상시기록 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 55 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 교정공정 교정작업 발생시 전수검사 명시(2M100 2권p063 공정140·2M110 공정160)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 57 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '특별특성(리크·브레이징조건) CP·FMEA·협정서 지정+전수/마스터 기준(28236 2권p046~050), 실행기록 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 59 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 게이지 규격·설비일상점검표(시업전1회/일) 명시(25460 2권 p058~062 외), 라벨식별·실측기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 61 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 CP에 LEAK OK/NG마스터 시업전·1회/일, 벤딩 길이센서 MASTER 명시(2M100 p059~063), 실기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 64 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 팁 연마/교체주기 명시(28236 5,000/20,000EA p046~050·25460 50,000타), 메쉬·히터 주기표 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 66 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '측정설비현황이 사진대장뿐, 교정유효기간·관리번호 미기재(28236 p053·2M100 p066)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 67 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '현황표에 온도지시조절계 있으나 교정정보 미기재(28236 p053), 정도보증 기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 68 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 지그안착 C/F·체크지그 확인절차 명시(2M100 p059~063), F/P센서 구축현황·점검기준 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 70 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 벤딩공정에 에어누설·실린더조인트·길이센서 점검 명시(2M110 p047~052), 점검 실기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 72 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '28236 CP p046~050 스포트에 전류·통전·가압조건+팁카운터+설비일상점검 1회/일 명시, 실기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 73 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 3-zone온도·LPG/AIR유량·MESH속도 조건관리 3회/일 명시, 조건실측은 ISIR시 1건뿐(2M110 p017)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 74 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 가열/냉각 구간별 온도기준+3회/일 조건기록 명시(2M100 p062·25460 p060), 실측기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 76 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 MESH속도 ITEM 조건관리 LIST 명시(4품번 브레이징 공정), 속도 실측기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 78 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 팁 연마5,000/교체20,000EA 카운터+교체주기 관리대장 명시(28236 p046~050), 대장실물·경보 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 79 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 냉각수 온도기준 명시(스포트 18-25도 2M100 p062·브레이징 냉각 25~45도 28236), 기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 81 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 전수검사+마스터 일일검증+조건C/SHEET 대체관리 체계 명시, F/P대비표·이행기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 82 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '검사구 검증만 존재·시효경과(JIG도면 2017 p055~056·CMM 2022 p057~058, 2M100 2권)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 83 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 검사지그 안착 C/F 확인(초/중/종·전수) 명시(2M100 p059~063), 시업전 유격점검 기록 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 85 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'L1100-25 금형점검 체크시트 양식만 앱 등재(0065 갭양식), 기입 실물·현장 게시 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 87 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '354p 전수판독 내 타수·정기점검 기록 무(추적맵 §5 이력카드(타수) 정비 필요 명기)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 88 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '스캔 세트 내 오버홀·평행도 검사 기록 무(관리대장·이력카드 증빙 전무 확인)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 90 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '벤딩 금형 이력카드 부재 — 30_보완액션리스트 D7 정비 액션으로 등재(생기 담당)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 93 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = 'ISIR 풀세트 전수판독 내 금형 T/OUT 성형 검증·시타 평가 기록 무(부품 성적서만 존재)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 95 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '2차공급자현황 전업체 LOT관리: 제조년월일/납품BOX+CP LOT마킹·리크타각 확인 항목. 선입선출대장·마스터리스트 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 96 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '설변 시 납입용기 사양식별 변경표(A4) 부착+신구품 식별·사전통보 문서화(2M100 회신서). 장기보관 처리기준 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 102 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP에 수입검사 5EA/LOT·이력카드·이상시 통보 기준 명시(전 품번). 검사 전/후 식별·미검사품 투입방지 증빙 없음', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 104 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '밀시트·중금속·내식성 성적서 실편철+M/SHEET 1회/3개월 기준. 제3사 명의·CR SPCC↔STKM11A 표기차 결함', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 105 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '2M100 2권 p001 4M 검토의뢰·회신 실물. 공정감사 필요↔평가표 미제출 상충·날짜역전(08.08>08.07)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 120 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = '앱 J3100-08 4M 마스터리스트 양식 등재만, 기입 실물 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 121 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '28236 PSW 승인완결(25.09.30)·2M100 고객승인(8.19) 확인, 25460·2M110 판정공란·접수대장 부재', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 124 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 협정서·기준서 실편철, PSW 완결 28236뿐(R1), 25460·2M110 체결일 공란(R11)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 125 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 도면↔협정↔기준서 EO 개정 정합 실물 확인, 일치성 점검표·담당자 지정 문서 부재', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 126 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '4품번 정기검사 세트(26.03) 편철·신뢰성 주기(1회/6·12개월) 이행, 치수결권(R6)·날짜역전(R7)', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 128 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = '조직·인원현황 4품번 편철(품질보증책임자 명시, 28236 p059), 매뉴얼·절차서·업무분장표 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 129 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET evidence_note = 'B1100-12 리크·리워크 이력대장 앱 등재만, 기입 실물 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 153 AND status = 'missing' AND evidence_note IS NULL;
UPDATE sq_checkpoints SET status = 'partial', evidence_note = 'CP 전품번에 LEAK타각 확인·점마킹 등 누락방지 항목 명시, 전표/인터락 실물 미확인', updated_by = 'ISIR 실사(봇) 2026-07-17', updated_at = datetime('now')
 WHERE id = 156 AND status = 'missing' AND evidence_note IS NULL;
