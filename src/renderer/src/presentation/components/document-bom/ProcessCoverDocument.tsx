import type { ProcessDocDto } from '@shared/ipc-types'

/**
 * 구조화 데이터(ProcessDocDto)를 공식 문서 표지 양식처럼 렌더한다.
 * (캡쳐 이미지 대신 데이터로 그리는 "문서 모드")
 */
export function ProcessCoverDocument({
  doc,
  page,
  logoKo,
  logoEn
}: {
  doc: ProcessDocDto
  page?: string
  /** 표지 로고 한글 표기(company_profile.companyNameShort, 39호 S1). 공백이면 셀 비움. */
  logoKo?: string
  /** 표지 로고 영문 표기(company_profile.companyNameEn). 공백이면 셀 비움. */
  logoEn?: string
}): JSX.Element {
  const cell = 'border border-zinc-700 px-2 py-1 align-middle'
  const lbl = `${cell} bg-zinc-200 text-center font-bold`

  return (
    <div className="bg-white text-zinc-900 text-[12px] overflow-x-auto">
      {/* 헤더 */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-[110px] text-center`} rowSpan={4}>
              {logoKo ? (
                <div className="text-2xl font-black text-blue-700 leading-none tracking-widest">{logoKo}</div>
              ) : null}
              {logoEn ? (
                <div className="text-[10px] font-bold text-blue-700 tracking-[3px] mt-0.5">{logoEn}</div>
              ) : null}
            </td>
            <td className={`${cell} text-center`} rowSpan={4}>
              <div className="text-xl font-black tracking-[6px]">품질경영 시스템</div>
              <div className="text-base font-extrabold text-blue-700 tracking-widest mt-1">
                {doc.title || ''}
              </div>
            </td>
            <th className={`${lbl} w-[92px]`}>문 서 번 호</th>
            <td className={`${cell} w-[140px] text-center`}>{doc.docNo || ''}</td>
          </tr>
          <tr>
            <th className={lbl}>재.개정 일자</th>
            <td className={`${cell} text-center`}>{doc.revDate || ''}</td>
          </tr>
          <tr>
            <th className={lbl}>개 정 번 호</th>
            <td className={`${cell} text-center`}>{doc.revNo || ''}</td>
          </tr>
          <tr>
            <th className={lbl}>페 이 지</th>
            <td className={`${cell} text-center`}>{page || '1/1'}</td>
          </tr>
          <tr>
            <td className={lbl}>적용 범위</td>
            <td className={cell} colSpan={3}>
              {doc.scope || ''}
            </td>
          </tr>
          <tr>
            <td className={lbl}>목 &nbsp; 적</td>
            <td className={cell} colSpan={3}>
              {doc.purpose || ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 개정 이력 */}
      <div className="text-[11px] font-bold text-zinc-600 mt-3 mb-1">개정 이력</div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-200">
            <th className={`${cell} w-[40px]`}>개정<br />번호</th>
            <th className={`${cell} w-[88px]`}>재.개정일<br />시행일자</th>
            <th className={cell}>재.개정사유 및 내용</th>
            <th className={`${cell} w-[140px]`}>작성부서<br />작성자</th>
            <th className={`${cell} w-[84px]`}>프로세스<br />성과지표</th>
            <th className={`${cell} w-[120px]`}>산 출 식</th>
            <th className={`${cell} w-[46px]`}>측정<br />주기</th>
            <th className={`${cell} w-[64px]`}>측정<br />책임자</th>
          </tr>
        </thead>
        <tbody>
          {doc.revisions.length === 0 ? (
            <tr>
              <td className={`${cell} text-center text-zinc-400`} colSpan={8}>
                개정 이력 없음
              </td>
            </tr>
          ) : (
            doc.revisions.map((r, i) => (
              <tr key={i}>
                <td className={`${cell} text-center`}>{r.no}</td>
                <td className={`${cell} text-center whitespace-nowrap`}>{r.date}</td>
                <td className={cell}>{r.reason}</td>
                <td className={`${cell} text-center`}>{r.author}</td>
                <td className={`${cell} text-center`}>{r.kpi}</td>
                <td className={`${cell} text-center`}>{r.formula}</td>
                <td className={`${cell} text-center`}>{r.cycle}</td>
                <td className={`${cell} text-center`}>{r.owner}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 결재 */}
      {doc.approvals.length > 0 && (
        <>
          <div className="text-[11px] font-bold text-zinc-600 mt-3 mb-1">결재</div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="bg-zinc-200">
                {doc.approvals.map((a, i) => (
                  <th key={i} className={cell}>
                    {a.role}
                  </th>
                ))}
              </tr>
              <tr>
                {doc.approvals.map((a, i) => (
                  <td key={i} className={`${cell} text-center`}>
                    {a.title}
                  </td>
                ))}
              </tr>
              <tr>
                {doc.approvals.map((a, i) => (
                  <td key={i} className={`${cell} text-center`}>
                    {a.name}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
