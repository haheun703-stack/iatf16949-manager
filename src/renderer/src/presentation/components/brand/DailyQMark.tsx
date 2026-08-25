/**
 * 데일리Q 마크 (시안 C 게이지Q · 사장님 결정 2026-08-25)
 *
 * 원본 = resources/brand/mark.svg · mark-simple.svg. 여기 좌표는 그 사본이므로
 * 원본을 고치면 이 파일도 함께 고칠 것(아이콘 png/ico 는 scripts/gen-brand-assets.cjs 가 굽는다).
 *
 * 색: 본체는 currentColor 를 따른다 — 밝은/어두운 테마 어디에 놓아도 글자와 같은 톤이 된다.
 *     바늘만 신호주황 고정(양쪽 바탕에서 다 보이는 중간 톤).
 *
 * simple: 20px 이하에 쓴다. 눈금·얇은 바늘이 뭉치는 것을 막은 단순판.
 */
export function DailyQMark({
  size = 20,
  simple = false,
  className,
  title = '데일리Q'
}: {
  size?: number
  simple?: boolean
  className?: string
  title?: string
}): JSX.Element {
  const SIG = '#D2542A'
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      style={{ overflow: 'visible', flex: 'none' }}
    >
      <g transform="translate(1.4, 5.4)" fill="none" stroke="currentColor" strokeLinecap="round">
        {simple ? (
          <>
            <path d="M57.9 71.3 A 29 29 0 1 1 75.3 53.9" strokeWidth="12" />
            <path d="M48 44 L60.0 32.0" stroke={SIG} strokeWidth="10" />
            <circle cx="48" cy="44" r="5.5" fill="currentColor" stroke="none" />
            <path d="M62.1 58.1 L78.5 74.5" strokeWidth="12" />
          </>
        ) : (
          <>
            <path d="M57.9 71.3 A 29 29 0 1 1 75.3 53.9" strokeWidth="9" />
            <g strokeWidth="4">
              <path d="M48 26 V31" />
              <path d="M31.1 37.8 L35.8 39.6" />
              <path d="M64.9 37.8 L60.2 39.6" />
            </g>
            <path d="M48 44 L59.3 32.7" stroke={SIG} strokeWidth="7" />
            <circle cx="48" cy="44" r="4.5" fill="currentColor" stroke="none" />
            <path d="M62.1 58.1 L77.7 73.7" strokeWidth="10" />
          </>
        )}
      </g>
    </svg>
  )
}
