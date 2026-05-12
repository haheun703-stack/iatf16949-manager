import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  Lightbulb,
  ClipboardList,
  BookOpen,
  Zap,
  ScrollText
} from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { MANUAL_SECTIONS, STAGE_LABELS, TEAM_NAMES, type ManualSection } from './manual-sections'

const PROFILE_FIELDS: { key: keyof CompanyProfile; label: string; placeholder: string }[] = [
  { key: 'companyName', label: '회사명', placeholder: '주식회사 티피씨' },
  { key: 'ceoName', label: '대표이사', placeholder: '이정훈' },
  { key: 'address', label: '주소', placeholder: '경상북도 경산시...' },
  { key: 'phone', label: '전화', placeholder: '(053)854-7500' },
  { key: 'fax', label: '팩스', placeholder: '' },
  { key: 'factoryName', label: '공장/사업부', placeholder: '2공장 AM사업부' },
  { key: 'revisionNumber', label: '개정번호', placeholder: 'REV.8' },
  { key: 'revisionDate', label: '개정일자', placeholder: '2026-05-12' }
]

interface GenerationLog {
  timestamp: string
  templateName: string
  success: boolean
  message: string
}

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: '',
  ceoName: '',
  address: '',
  phone: '',
  fax: '',
  factoryName: '',
  revisionNumber: '',
  revisionDate: ''
}

const STAGE_ICONS: Record<number, string> = {
  1: 'building',
  2: 'network',
  3: 'book',
  4: 'folder'
}

export function DocGenView(): JSX.Element {
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_PROFILE)
  const [profileDirty, setProfileDirty] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(MANUAL_SECTIONS[0].id)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logs, setLogs] = useState<GenerationLog[]>([])

  const sectionsByStage = useMemo(() => {
    const grouped: Record<number, ManualSection[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const s of MANUAL_SECTIONS) {
      grouped[s.stage].push(s)
    }
    return grouped
  }, [])

  const selectedSection = useMemo(
    () => MANUAL_SECTIONS.find((s) => s.id === selectedId) ?? MANUAL_SECTIONS[0],
    [selectedId]
  )

  // Load profile from DB
  useEffect(() => {
    window.api
      .invoke(window.api.channels.COMPANY_PROFILE_GET)
      .then((p) => setProfile(p))
      .catch((err) => console.error('Failed to load profile:', err))
  }, [])

  const handleProfileChange = useCallback(
    (key: keyof CompanyProfile, value: string) => {
      setProfile((prev) => ({ ...prev, [key]: value }))
      setProfileDirty(true)
      setProfileSaved(false)
    },
    []
  )

  const handleProfileSave = useCallback(async () => {
    setProfileSaving(true)
    try {
      await window.api.invoke(window.api.channels.COMPANY_PROFILE_SAVE, profile)
      setProfileDirty(false)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setProfileSaving(false)
    }
  }, [profile])

  const handleGenerate = useCallback(async () => {
    if (generating) return

    if (profileDirty) {
      await handleProfileSave()
    }

    const defaultName = `품질&환경 매뉴얼_${profile.factoryName || '출력'}_${profile.revisionNumber || 'REV'}.xlsx`
    const { filePath } = await window.api.invoke(window.api.channels.DOCGEN_SAVE_DIALOG, {
      defaultName
    })

    if (!filePath) return

    setGenerating(true)
    const now = new Date().toLocaleString('ko-KR')

    try {
      const result = await window.api.invoke(window.api.channels.DOCGEN_GENERATE, {
        templateId: 'quality-manual',
        profile,
        outputPath: filePath
      })

      setLogs((prev) => [
        {
          timestamp: now,
          templateName: '품질&환경 매뉴얼',
          success: result.success,
          message: result.success
            ? `치환 완료: ${result.replacedCount}건 | 저장: ${result.outputPath}`
            : `오류: ${result.error}`
        },
        ...prev
      ])
    } catch (err) {
      setLogs((prev) => [
        {
          timestamp: now,
          templateName: '품질&환경 매뉴얼',
          success: false,
          message: `오류: ${String(err)}`
        },
        ...prev
      ])
    } finally {
      setGenerating(false)
    }
  }, [generating, profileDirty, profile, handleProfileSave])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <h1 className="text-xl font-bold text-foreground">품질&환경 매뉴얼 작성 가이드</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          총 {MANUAL_SECTIONS.length}개 시트 · 4단계 · REV.7 기준 템플릿 | 각 항목을 확인하고 매뉴얼을 생성하세요
        </p>
      </div>

      {/* Main Split Layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel — Section List */}
        <div className="w-[260px] shrink-0 bg-card border border-border rounded-lg overflow-y-auto">
          <div className="p-3">
            {([1, 2, 3, 4] as const).map((stage) => (
              <StageGroup
                key={stage}
                stage={stage}
                sections={sectionsByStage[stage]}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>

        {/* Right Panel — Section Detail */}
        <div className="flex-1 overflow-y-auto bg-card border border-border rounded-lg p-5">
          <SectionDetail section={selectedSection} />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="shrink-0 mt-4 space-y-3">
        {/* Collapsible Company Profile */}
        <div className="bg-card border border-border rounded-lg">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-lg"
          >
            <span>회사 정보 {profileDirty ? '(수정됨)' : ''}</span>
            {profileOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {profileOpen && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              <div className="grid grid-cols-4 gap-3">
                {PROFILE_FIELDS.map((field) => (
                  <div key={field.key} className={field.key === 'address' ? 'col-span-2' : ''}>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.key === 'revisionDate' ? 'date' : 'text'}
                      value={profile[field.key]}
                      onChange={(e) => handleProfileChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleProfileSave}
                  disabled={!profileDirty || profileSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    profileSaved
                      ? 'bg-green-600 text-white'
                      : profileDirty
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {profileSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : profileSaved ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {profileSaved ? '저장됨' : '저장'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button + Log */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
              generating
                ? 'bg-primary/80 text-primary-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                매뉴얼 생성 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                매뉴얼 생성하기 (.xlsx)
              </>
            )}
          </button>

          {logs.length > 0 && (
            <div
              className={`flex items-center gap-1.5 text-[11px] ${
                logs[0].success ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {logs[0].success ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{logs[0].message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Stage Group (Left Panel) ─── */

function StageGroup({
  stage,
  sections,
  selectedId,
  onSelect
}: {
  stage: number
  sections: ManualSection[]
  selectedId: string
  onSelect: (id: string) => void
}): JSX.Element {
  const stageColors: Record<number, string> = {
    1: 'text-blue-600',
    2: 'text-purple-600',
    3: 'text-emerald-600',
    4: 'text-amber-600'
  }

  return (
    <div className="mb-3">
      <div
        className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 px-2 ${stageColors[stage] || 'text-muted-foreground'}`}
      >
        {STAGE_LABELS[stage]}
      </div>
      <div className="space-y-0.5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
              selectedId === section.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted/60'
            }`}
          >
            <span className="shrink-0 w-4 text-center text-[10px] text-muted-foreground">
              {section.clause || ''}
            </span>
            <span className="truncate">{section.title}</span>
            {section.autoFilled && (
              <Zap className="w-3 h-3 text-amber-500 shrink-0 ml-auto" title="자동치환" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Section Detail (Right Panel) ─── */

function SectionDetail({ section }: { section: ManualSection }): JSX.Element {
  const stageColors: Record<number, string> = {
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-purple-100 text-purple-700',
    3: 'bg-emerald-100 text-emerald-700',
    4: 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="space-y-5">
      {/* Title Area */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageColors[section.stage]}`}
          >
            {section.stage}단계
          </span>
          {section.clause && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              조항 {section.clause}
            </span>
          )}
          {section.autoFilled && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              자동치환
            </span>
          )}
        </div>
        <h2 className="text-[16px] font-bold text-foreground">{section.title}</h2>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
          {section.description}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          시트명: <span className="font-mono text-foreground">{section.sheetName}</span>
        </p>
      </div>

      {/* Items Checklist */}
      <DetailBlock icon={<ClipboardList className="w-4 h-4" />} title="작성 항목">
        <ul className="space-y-1.5">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
              <span className="shrink-0 w-4 h-4 mt-0.5 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                {i + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </DetailBlock>

      {/* Team */}
      <DetailBlock icon={<Users className="w-4 h-4" />} title="담당팀">
        <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[12px] font-medium px-2.5 py-1 rounded-md">
          <Users className="w-3 h-3" />
          {TEAM_NAMES[section.teamId] || section.teamId}
        </span>
      </DetailBlock>

      {/* Related Forms */}
      {section.relatedForms.length > 0 && (
        <DetailBlock icon={<FileText className="w-4 h-4" />} title="관련 양식/폼">
          <div className="flex flex-wrap gap-2">
            {section.relatedForms.map((form, i) => (
              <span
                key={i}
                className="text-[11px] bg-muted text-foreground px-2.5 py-1 rounded-md border border-border"
              >
                {form}
              </span>
            ))}
          </div>
        </DetailBlock>
      )}

      {/* Related Regulations */}
      {section.relatedRegulations.length > 0 && (
        <DetailBlock icon={<BookOpen className="w-4 h-4" />} title="관련 규정">
          <div className="flex flex-wrap gap-2">
            {section.relatedRegulations.map((reg, i) => (
              <span
                key={i}
                className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-mono"
              >
                {reg}
              </span>
            ))}
          </div>
        </DetailBlock>
      )}

      {/* Tips */}
      {section.tips.length > 0 && (
        <DetailBlock icon={<Lightbulb className="w-4 h-4" />} title="작성 팁">
          <ul className="space-y-1.5">
            {section.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <span className="shrink-0 text-amber-500 mt-0.5">-</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}
    </div>
  )
}

/* ─── Reusable Detail Block ─── */

function DetailBlock({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground mb-3">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}
