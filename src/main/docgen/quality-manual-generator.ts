import ExcelJS from 'exceljs'
import { join } from 'path'
import { app } from 'electron'
import type Database from 'better-sqlite3'
import type { DocGenRequest, DocGenResult } from '@shared/ipc-types'

function getTemplatePath(): string {
  if (!app.isPackaged) {
    return join(__dirname, '../../resources/templates/quality-manual-template.xlsx')
  }
  return join(process.resourcesPath, 'templates', 'quality-manual-template.xlsx')
}

interface RichTextPart {
  text: string
  font?: ExcelJS.Font
}

function applyReplacements(text: string, replacements: [string, string][]): { result: string; count: number } {
  let result = text
  let count = 0
  for (const [search, replace] of replacements) {
    if (result.includes(search)) {
      result = result.split(search).join(replace)
      count++
    }
  }
  return { result, count }
}

export async function generateQualityManual(
  req: DocGenRequest,
  _db: Database.Database
): Promise<DocGenResult> {
  const templatePath = getTemplatePath()

  // 1. Read template
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.readFile(templatePath)
  } catch (err) {
    return { success: false, error: `템플릿 파일을 읽을 수 없습니다: ${err}` }
  }

  // 3. Build replacement map
  const replacements: [string, string][] = []

  // Revision
  if (req.profile.revisionNumber) {
    replacements.push(['REV.7', req.profile.revisionNumber])
  }

  // Factory name
  if (req.profile.factoryName) {
    replacements.push(['1,2,3공장 공통적용', req.profile.factoryName])
    replacements.push(['1,2,3공장', req.profile.factoryName])
  }

  // Revision date
  if (req.profile.revisionDate) {
    // Common date formats in the template
    replacements.push(['250106', formatDateCompact(req.profile.revisionDate)])
    replacements.push(['2025.01.06', formatDateDotted(req.profile.revisionDate)])
    replacements.push(['2025-01-06', req.profile.revisionDate])
  }

  // 4. Walk all cells and apply replacements
  let replacedCount = 0

  for (const ws of wb.worksheets) {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        // Handle plain string values
        if (typeof cell.value === 'string') {
          const { result, count } = applyReplacements(cell.value, replacements)
          if (count > 0) {
            cell.value = result
            replacedCount += count
          }
        }

        // Handle richText values
        if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
          const richText = (cell.value as { richText: RichTextPart[] }).richText
          let modified = false
          const newRichText = richText.map((part) => {
            const { result, count } = applyReplacements(part.text, replacements)
            if (count > 0) {
              modified = true
              replacedCount += count
              return { ...part, text: result }
            }
            return part
          })
          if (modified) {
            cell.value = { richText: newRichText } as ExcelJS.CellRichTextValue
          }
        }
      })
    })
  }

  // 5. Write output file
  try {
    await wb.xlsx.writeFile(req.outputPath)
  } catch (err) {
    return { success: false, error: `파일 저장 실패: ${err}` }
  }

  return {
    success: true,
    outputPath: req.outputPath,
    replacedCount
  }
}

function formatDateCompact(isoDate: string): string {
  // YYYY-MM-DD → YYMMDD
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return parts[0].slice(2) + parts[1] + parts[2]
}

function formatDateDotted(isoDate: string): string {
  // YYYY-MM-DD → YYYY.MM.DD
  return isoDate.replace(/-/g, '.')
}
