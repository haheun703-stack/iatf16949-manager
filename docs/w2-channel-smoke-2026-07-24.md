# W2 채널 스모크 리스트 — 작동 지도

> 생성: `node scripts/w2-smoke.mjs` · 대상 139채널 · base=http://127.0.0.1:8090
> ⚠️ DB **복사본**(IATF_DATA_DIR)에 물린 서버로 실행 — 쓰기 채널 포함.
> 빈 payload(`{}`) 호출 결과다. "인자필요"는 **핸들러 도달 성공**(payload 만 없음)을 뜻한다.

## 요약

| 상태 | 개수 | 의미 |
|---|---:|---|
| ✅ OK | 132 | 빈 payload 로도 정상 응답 — 웹에서 그대로 작동 |
| 🟡 인자필요 | 5 | 핸들러 도달 O, payload 만 필요 — 화면에서 호출 시 정상 예상 |
| 🔵 쓰기 | 0 | 쓰기 경로(스모크는 readonly 라 차단) — W2 2착 대상 |
| ⚪ 스텁 | 2 | dialog/shell 스텁 — W2 3착(파일 API) 대상 |
| ❌ 실패 | 0 | 원인 규명 필요 |

## 전체 채널

| 채널 | 상태 | 사유/응답 |
|---|---|---|
| `ai:absenceCheck` | 🟡 인자필요 | payload 필요: 알 수 없는 트리거: undefined |
| `ai:absenceExplain` | ✅ OK | 객체 {success,error} |
| `ai:briefingFacts` | ✅ OK | 객체 {today,overdue,dueSoon,audit,sq} |
| `ai:briefingSummarize` | ✅ OK | 객체 {success,text,costUsd} |
| `ai:copilotAsk` | ✅ OK | 객체 {success,error} |
| `ai:draftApprove` | ✅ OK | 객체 {success,error} |
| `ai:draftList` | ✅ OK | 배열 0건 |
| `ai:draftReject` | ✅ OK | 객체 {success,error} |
| `ai:draftStats` | ✅ OK | 객체 {proposed,approved,approvedAsIs,approvedEdited,rejected,…} |
| `ai:generate` | ✅ OK | 객체 {success,error} |
| `ai:generateGuide` | ✅ OK | 객체 {success,error} |
| `ai:isirCompleteness` | ✅ OK | 객체 {partName,pkg,docs,cpItemCount,processCount,…} |
| `ai:isirExplain` | ✅ OK | 객체 {success,error} |
| `ai:mockAudit` | ✅ OK | 객체 {success,error} |
| `ai:readinessExplain` | ✅ OK | 객체 {success,error} |
| `ai:readinessPredict` | ✅ OK | 객체 {score,totalPoints,measurablePoints,counts,categories,…} |
| `ai:scoreForm` | ✅ OK | 객체 {success,error} |
| `ai:similarCases` | ✅ OK | 객체 {success,error} |
| `ai:structureCapture` | ✅ OK | 객체 {success,error} |
| `app:info` | ✅ OK | 객체 {productName,version,copyright,electron,chrome,…} |
| `appUser:delete` | ✅ OK | 객체 {success} |
| `appUser:list` | ✅ OK | 배열 17건 |
| `appUser:upsert` | ✅ OK | 객체 {success} |
| `apqp:board` | ✅ OK | 객체 {phases,overallPct,currentPhaseNo} |
| `apqp:elementUpdate` | ✅ OK | 객체 {success} |
| `bom:formUsage` | ✅ OK | 객체 {usedBy} |
| `bom:getDocDetail` | ✅ OK | null 반환 |
| `bom:listDocs` | ✅ OK | 배열 105건 |
| `bom:stats` | ✅ OK | 객체 {totalDocs,totalForms,byStatus,byCategory,byFormType} |
| `case:create` | ✅ OK | 객체 {id,caseNo} |
| `case:distribute` | ✅ OK | 객체 {created,updated,forms} |
| `case:factSave` | 🟡 인자필요 | payload 필요: NOT NULL constraint failed: case_facts.case_id |
| `case:get` | ✅ OK | null 반환 |
| `case:list` | ✅ OK | 배열 14건 |
| `case:screeningSave` | ✅ OK | 객체 {success} |
| `case:stepUpdate` | ✅ OK | 객체 {success} |
| `case:update` | ✅ OK | 객체 {success} |
| `clause:coverage` | ✅ OK | 배열 7건 |
| `company:pickMastersDir` | ⚪ 스텁 | dialog 스텁(취소 반환) — 파일 API 로 대체 필요 |
| `company:profileGet` | ✅ OK | 객체 {companyName,ceoName,address,phone,fax,…} |
| `company:profileSave` | ✅ OK | 객체 {success} |
| `dashboard:dailyBoard` | ✅ OK | 객체 {overdue,dueSoon,sqRed,drafts} |
| `dashboard:v5` | ✅ OK | 객체 {formsTotal,formsScored,formsWithDraft,avgScore,gradeDist,…} |
| `docgen:generate` | ✅ OK | 객체 {success,error} |
| `docgen:saveDialog` | ✅ OK | 객체 {filePath} |
| `fmea:board` | ✅ OK | null 반환 |
| `fmea:docCreate` | ✅ OK | 객체 {id} |
| `fmea:docList` | ✅ OK | 배열 2건 |
| `fmea:docUpdate` | ✅ OK | 객체 {success} |
| `fmea:exportXlsx` | ✅ OK | 객체 {success,error} |
| `fmea:rowCreate` | 🟡 인자필요 | payload 필요: NOT NULL constraint failed: fmea_rows.doc_id |
| `fmea:rowDelete` | ✅ OK | 객체 {success} |
| `fmea:rowUpdate` | ✅ OK | 객체 {success} |
| `form:draftDefaults` | ✅ OK | 객체 {values,serialPreview} |
| `form:examplesGet` | ✅ OK | 배열 0건 |
| `form:exportXlsx` | ✅ OK | 객체 {success,error} |
| `form:getDefinition` | ✅ OK | null 반환 |
| `form:guideGet` | ✅ OK | null 반환 |
| `form:list` | ✅ OK | 배열 301건 |
| `form:renderModel` | ✅ OK | 객체 {sheetName,rowCount,colCount,colWidthsPx,rowHeightsPx,…} |
| `form:revisionGet` | ✅ OK | null 반환 |
| `form:revisionList` | ✅ OK | 배열 0건 |
| `form:revisionSave` | ✅ OK | 객체 {success,error} |
| `form:scoreLatest` | ✅ OK | null 반환 |
| `form:scoreList` | ✅ OK | 배열 301건 |
| `form:setScope` | ✅ OK | 객체 {success,scope} |
| `form:submissionCreate` | 🟡 인자필요 | payload 필요: NOT NULL constraint failed: form_submissions.form_code |
| `form:submissionDelete` | ✅ OK | 객체 {success} |
| `form:submissionGet` | ✅ OK | null 반환 |
| `form:submissionList` | ✅ OK | 배열 4건 |
| `form:submissionUpdate` | ✅ OK | 객체 {success} |
| `iatf:dashboard` | ✅ OK | 객체 {clauses,duties,docs} |
| `integrity:check` | ✅ OK | 객체 {ranAt,totals,rows} |
| `kpi:home` | ✅ OK | 배열 35건 |
| `kpi:month` | ✅ OK | 배열 0건 |
| `kpi:save` | ✅ OK | 객체 {success} |
| `kpi:save-batch` | ✅ OK | 객체 {success,saved} |
| `mesRecords:coverage` | ✅ OK | 객체 {days,dataEndYmd,strips} |
| `mesRecords:detail` | ✅ OK | null 반환 |
| `mesRecords:status` | ✅ OK | 객체 {available,path,builtAt,sourceDmp,dataEndYmd,…} |
| `mesTrace:expand` | ✅ OK | null 반환 |
| `mesTrace:search` | ✅ OK | 배열 0건 |
| `mesTrace:status` | ✅ OK | 객체 {available,path,builtAt,sourceDmp,lotCount,…} |
| `msa:create` | ✅ OK | 객체 {id} |
| `msa:delete` | ✅ OK | 객체 {success} |
| `msa:list` | ✅ OK | 배열 5건 |
| `msa:update` | ✅ OK | 객체 {success} |
| `obligation:complete` | ✅ OK | 객체 {success,nextDueDate} |
| `obligation:create` | ✅ OK | 객체 {id} |
| `obligation:delete` | ✅ OK | 객체 {success} |
| `obligation:list` | ✅ OK | 배열 74건 |
| `obligation:resetDue` | ✅ OK | 객체 {success,count} |
| `obligation:update` | ✅ OK | 객체 {success} |
| `parts:detail` | ✅ OK | null 반환 |
| `parts:importIsir` | ⚪ 스텁 | dialog 스텁(취소 반환) — 파일 API 로 대체 필요 |
| `parts:list` | ✅ OK | 배열 5건 |
| `ppap:board` | ✅ OK | null 반환 |
| `ppap:elementUpdate` | ✅ OK | 객체 {success} |
| `ppap:submissionCreate` | ✅ OK | 객체 {id} |
| `ppap:submissionList` | ✅ OK | 배열 2건 |
| `ppap:submissionUpdate` | ✅ OK | 객체 {success} |
| `print:toPdf` | ✅ OK | 객체 {success,error} |
| `process:docGet` | ✅ OK | null 반환 |
| `process:docSave` | ✅ OK | 객체 {success} |
| `process:getDetail` | ✅ OK | null 반환 |
| `process:list` | ✅ OK | 배열 9건 |
| `process:pageAdd` | 🟡 인자필요 | payload 필요: NOT NULL constraint failed: process_pages.process_code |
| `process:pageAiExtract` | ✅ OK | 객체 {success,error} |
| `process:pageDeleteImage` | ✅ OK | 객체 {success} |
| `process:pageReadImage` | ✅ OK | 객체 {success,error} |
| `process:pageUpload` | ✅ OK | 객체 {success,error} |
| `process:pagesBulkUpload` | ✅ OK | 객체 {success,added,error} |
| `reg:browse` | ✅ OK | 배열 70건 |
| `reg:forms` | ✅ OK | 배열 0건 |
| `regulation:getSections` | ✅ OK | 배열 0건 |
| `report:exportScores` | ✅ OK | 객체 {success,error} |
| `schedule:create` | ✅ OK | 객체 {id} |
| `schedule:delete` | ✅ OK | 객체 {success} |
| `schedule:list` | ✅ OK | 배열 9건 |
| `schedule:update` | ✅ OK | 객체 {success} |
| `sq:assessConfirm` | ✅ OK | 객체 {success,confirmedCount} |
| `sq:assessExport` | ✅ OK | 객체 {success,error} |
| `sq:assessFinalize` | ✅ OK | 객체 {success,remaining} |
| `sq:assessGet` | ✅ OK | 객체 {id,assessedAt,assessor,witness,summaryOpinion,…} |
| `sq:assessList` | ✅ OK | 배열 1건 |
| `sq:assessMeta` | ✅ OK | 객체 {success} |
| `sq:assessRun` | ✅ OK | 객체 {success,id} |
| `sq:checkpointUpdate` | ✅ OK | 객체 {success,suggestedState} |
| `sq:dashboard` | ✅ OK | 객체 {basis,guideVersion,totalRaw,naScore,totalConverted,…} |
| `sq:guideGet` | ✅ OK | null 반환 |
| `sq:itemDetail` | ✅ OK | null 반환 |
| `sq:readiness` | ✅ OK | 객체 {categories,totalPoints} |
| `sqtrack:itemUpdate` | ✅ OK | 객체 {success,error} |
| `sqtrack:overview` | ✅ OK | 객체 {auditDate,title,goal,parts,totals} |
| `sqtrack:partDetail` | ✅ OK | null 반환 |
| `sqtrack:setAuditDate` | ✅ OK | 객체 {success} |
| `team:regs` | ✅ OK | 배열 0건 |
| `team:summary` | ✅ OK | 배열 5건 |
| `team:todayBoard` | ✅ OK | 객체 {date,totals,trend,teams,unassigned} |
