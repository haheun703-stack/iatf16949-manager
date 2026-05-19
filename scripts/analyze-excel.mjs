import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function analyze() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '..', '..', 'IATF 전체 자료모음_김권표이사_260501', '1.품질&환경 메뉴얼_230501', '1.품질환경 매뉴얼 (REV.7_250106_프로세스맵 포함)_1,2,3공장 공통적용_완료.xlsx');
  await wb.xlsx.readFile(filePath);

  console.log('=== 시트 목록 ===');
  wb.worksheets.forEach((ws, i) => {
    console.log(`${i + 1}. ${ws.name} (rows: ${ws.rowCount}, cols: ${ws.columnCount})`);
  });

  console.log('\n=== 각 시트 상위 내용 미리보기 ===');
  for (const ws of wb.worksheets) {
    console.log(`\n--- [${ws.name}] ---`);
    let count = 0;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (count >= 20) return;
      const vals = [];
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        const v = cell.value;
        if (v && typeof v === 'object' && v.richText) {
          vals.push(`Col${colNum}: ${v.richText.map(r => r.text).join('')}`);
        } else if (v != null) {
          vals.push(`Col${colNum}: ${String(v).substring(0, 100)}`);
        }
      });
      if (vals.length > 0) {
        console.log(`  R${rowNum}: ${vals.join(' | ')}`);
        count++;
      }
    });
  }
}

analyze().catch(e => console.error(e));
