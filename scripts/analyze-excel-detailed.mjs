import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function analyzeDetailed() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '..', 'resources', 'templates', 'quality-manual-template.xlsx');

  console.log(`Reading: ${filePath}`);
  await wb.xlsx.readFile(filePath);

  console.log(`\n${'='.repeat(80)}`);
  console.log('QUALITY MANUAL TEMPLATE - DETAILED STRUCTURE ANALYSIS');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Total sheets: ${wb.worksheets.length}\n`);

  // Sheet overview
  console.log('=== SHEET OVERVIEW ===');
  wb.worksheets.forEach((ws, i) => {
    const mergeCount = Object.keys(ws._merges || {}).length;
    console.log(`  ${(i + 1).toString().padStart(2)}. "${ws.name}" -- rows: ${ws.rowCount}, cols: ${ws.columnCount}, merges: ${mergeCount}`);
  });

  // Detailed per-sheet analysis
  for (const ws of wb.worksheets) {
    console.log(`\n${'#'.repeat(80)}`);
    console.log(`# SHEET: "${ws.name}"`);
    console.log(`# Rows: ${ws.rowCount} | Columns: ${ws.columnCount}`);
    console.log(`${'#'.repeat(80)}`);

    // 1. Merged cells
    const merges = ws._merges || {};
    const mergeKeys = Object.keys(merges);
    console.log(`\n--- Merged Cells (${mergeKeys.length} merges) ---`);
    if (mergeKeys.length <= 60) {
      mergeKeys.forEach(k => {
        const m = merges[k];
        const range = m.range || m.model || k;
        console.log(`  ${range}`);
      });
    } else {
      console.log(`  (Too many to list all -- showing first 30 and last 10)`);
      mergeKeys.slice(0, 30).forEach(k => {
        const m = merges[k];
        const range = m.range || m.model || k;
        console.log(`  ${range}`);
      });
      console.log(`  ...`);
      mergeKeys.slice(-10).forEach(k => {
        const m = merges[k];
        const range = m.range || m.model || k;
        console.log(`  ${range}`);
      });
    }

    // 2. Build merge lookup maps
    const mergedSlaves = new Set();
    const mergedMasters = new Map();
    for (const k of mergeKeys) {
      const m = merges[k];
      const range = m.range || m.model || k;
      const match = String(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (match) {
        const startCol = colToNum(match[1]);
        const startRow = parseInt(match[2]);
        const endCol = colToNum(match[3]);
        const endRow = parseInt(match[4]);
        const masterKey = `${startRow},${startCol}`;
        mergedMasters.set(masterKey, `[merged ${match[1]}${match[2]}:${match[3]}${match[4]}]`);
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r !== startRow || c !== startCol) {
              mergedSlaves.add(`${r},${c}`);
            }
          }
        }
      }
    }

    // 3. Content dump - first 30 non-empty rows, de-duplicated for merges
    console.log(`\n--- Content (first 30 rows, de-duplicated for merges) ---`);
    let rowsPrinted = 0;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowsPrinted >= 30) return;
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const key = `${rowNum},${colNum}`;
        if (mergedSlaves.has(key)) return;

        let v = cell.value;
        if (v && typeof v === 'object' && v.richText) {
          v = v.richText.map(r => r.text).join('');
        }
        if (v != null && String(v).trim() !== '') {
          const colLetter = numToCol(colNum);
          const mergeInfo = mergedMasters.get(key) || '';
          const displayVal = String(v).substring(0, 120).replace(/\n/g, '\\n');
          cells.push(`${colLetter}${rowNum}${mergeInfo}: "${displayVal}"`);
        }
      });
      if (cells.length > 0) {
        console.log(`  R${rowNum}: ${cells.join(' | ')}`);
        rowsPrinted++;
      }
    });

    // 4. Structure analysis
    console.log(`\n--- Structure Analysis ---`);

    // Form-like patterns: cells with labels containing ':' next to empty cells
    const formFields = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum > 60) return;
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        const key = `${rowNum},${colNum}`;
        if (mergedSlaves.has(key)) return;
        const v = getCellText(cell);
        if (v && (v.includes(':') || v.includes('：')) && v.length < 50) {
          formFields.push({ row: rowNum, col: numToCol(colNum), label: v.trim().substring(0, 60) });
        }
      });
    });

    if (formFields.length > 0) {
      console.log(`  Form-like labels detected (${formFields.length}):`);
      formFields.slice(0, 20).forEach(f => console.log(`    R${f.row} ${f.col}: "${f.label}"`));
      if (formFields.length > 20) console.log(`    ... and ${formFields.length - 20} more`);
    }

    // Detect table header rows (rows with multiple short text values in consecutive columns)
    const tableHeaders = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      const filledCells = [];
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        const key = `${rowNum},${colNum}`;
        if (mergedSlaves.has(key)) return;
        const v = getCellText(cell);
        if (v && v.length < 30 && v.length > 0) {
          filledCells.push({ col: colNum, val: v.trim() });
        }
      });
      if (filledCells.length >= 4) {
        tableHeaders.push({ row: rowNum, cells: filledCells.slice(0, 10) });
      }
    });

    if (tableHeaders.length > 0) {
      console.log(`  Potential table header rows (${tableHeaders.length} rows with 4+ short labels):`);
      tableHeaders.slice(0, 5).forEach(h => {
        const labels = h.cells.map(c => `${numToCol(c.col)}:"${c.val.substring(0, 20)}"`).join(', ');
        console.log(`    R${h.row}: ${labels}`);
      });
      if (tableHeaders.length > 5) console.log(`    ... and ${tableHeaders.length - 5} more`);
    }

    // Count empty vs filled cells in first 30 rows to determine density
    let totalCells = 0, filledCells = 0;
    ws.eachRow({ includeEmpty: true }, (row, rowNum) => {
      if (rowNum > 30) return;
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        totalCells++;
        if (cell.value != null && String(cell.value).trim() !== '') filledCells++;
      });
    });
    const density = totalCells > 0 ? ((filledCells / totalCells) * 100).toFixed(1) : 0;
    console.log(`  Cell density (first 30 rows): ${filledCells}/${totalCells} = ${density}%`);

    // Identify likely structure type
    const rowCount = ws.rowCount;
    const colCount = ws.columnCount;
    let structureType = 'unknown';
    if (rowCount <= 40 && mergeKeys.length > 5) structureType = 'form/cover-page';
    else if (tableHeaders.length >= 3) structureType = 'table/matrix';
    else if (rowCount > 100) structureType = 'document-body (long content)';
    else structureType = 'mixed form/content';

    console.log(`  Likely structure: ${structureType}`);
    console.log('');
  }
}

function getCellText(cell) {
  if (!cell || !cell.value) return '';
  const v = cell.value;
  if (typeof v === 'object' && v.richText) {
    return v.richText.map(r => r.text).join('');
  }
  return String(v);
}

function colToNum(col) {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

function numToCol(num) {
  let result = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

analyzeDetailed().catch(e => console.error(e));
