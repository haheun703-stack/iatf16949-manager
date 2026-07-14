import { useEffect, useState, type ReactNode } from 'react'
import { Info, Package, Building2, Loader2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import type { AppInfo, CompanyProfile } from '@shared/ipc-types'

/** 정의열 한 줄 — 라벨 : 값 */
function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }): JSX.Element {
  const empty = !value
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/60 last:border-b-0">
      <div className="w-28 shrink-0 text-[12.5px] text-muted-foreground">{label}</div>
      <div
        className={
          'flex-1 min-w-0 text-[13px] break-words ' +
          (empty ? 'text-amber-600' : 'text-foreground') +
          (mono ? ' tabular-nums font-mono text-[12px]' : '')
        }
      >
        {value || '미설정'}
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  sub,
  children
}: {
  icon: JSX.Element
  title: string
  sub?: string
  children: ReactNode
}): JSX.Element {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-[15px] font-bold leading-tight">{title}</h2>
          {sub && <div className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
      <div className="px-0.5">{children}</div>
    </section>
  )
}

/**
 * 제품 정보 화면 — 버전 · 제조사 · 시스템 정보. 심사장 시연 대비 (UI P3).
 * 앱 식별/버전(main APP_INFO) + 제조사(운영 조직 = company_profile).
 */
export function AboutView(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [i, p] = await Promise.all([
          window.api.invoke(window.api.channels.APP_INFO),
          window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)
        ])
        if (alive) {
          setInfo(i as AppInfo)
          setProfile(p as CompanyProfile)
        }
      } catch {
        if (alive) setInfo(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!info) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
      </div>
    )
  }

  const osLabel =
    info.platform === 'win32'
      ? `Windows (${info.arch})`
      : `${info.platform} (${info.arch})`

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        icon={<Info className="w-5 h-5" />}
        title="제품 정보"
        sub="버전 · 제조사 · 시스템 정보"
      />

      {/* 제품 요약 밴드 */}
      <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="min-w-0">
          <div className="text-[18px] font-extrabold tracking-tight leading-tight">
            {info.productName}
          </div>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            버전 <span className="font-semibold text-foreground tabular-nums">v{info.version}</span>
            <span className="mx-1.5 text-border">·</span>
            {info.copyright}
          </div>
        </div>
      </div>

      {/* 제조사(운영 조직) */}
      <Card
        icon={<Building2 className="w-[18px] h-[18px]" />}
        title="제조사 (운영 조직)"
        sub="이 품질경영시스템을 운영하는 조직 — 사이드바에서 설정"
      >
        <Row label="회사명" value={profile?.companyName} />
        <Row label="대표자" value={profile?.ceoName} />
        <Row label="공장(사업장)" value={profile?.factoryName} />
        <Row label="주소" value={profile?.address} />
        <Row label="전화" value={profile?.phone} />
        <Row label="팩스" value={profile?.fax} />
        <Row
          label="품질매뉴얼 개정"
          value={
            profile?.revisionNumber || profile?.revisionDate
              ? [profile?.revisionNumber, profile?.revisionDate].filter(Boolean).join(' · ')
              : ''
          }
        />
      </Card>

      {/* 시스템(런타임) */}
      <Card icon={<Package className="w-[18px] h-[18px]" />} title="시스템 정보" sub="런타임 환경">
        <Row label="운영체제" value={osLabel} />
        <Row label="Electron" value={info.electron} mono />
        <Row label="Chromium" value={info.chrome} mono />
        <Row label="Node.js" value={info.node} mono />
        <Row label="V8" value={info.v8} mono />
      </Card>
    </div>
  )
}
