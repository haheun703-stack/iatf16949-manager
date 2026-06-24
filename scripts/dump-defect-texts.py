# -*- coding: utf-8 -*-
"""
PPTX 대책서 → 원문 텍스트 JSON 덤프 (1단계, 무과금)

seed_defect_cases.py 의 PPTX 텍스트 추출만 떼어내, 라벨-경계 정규식(field())을
거치지 않은 '원문 텍스트'를 그대로 내보낸다. 2단계(ai-extract-cases.mjs)에서
앱과 동일한 @anthropic-ai/sdk 로 구조화 JSON 추출 → cases 적재한다.
정규식 노이즈를 AI 추출로 대체하기 위한 분리.

출력: scratchpad/defect-texts.json  [{ file, part_no, text }]
사용: python scripts/dump-defect-texts.py
"""
import os, re, sys, glob, zipfile, json, tempfile
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:/IATF16949,SQ 자동작성 봇/TPC AM사업부 품질폴더/3. 품질불량/01 불량개선대책서'

# 출력 경로(이식 가능: OS temp 기본). 환경변수 DEFECT_TEXTS_OUT 로 덮어쓰기 가능.
SCRATCH = os.environ.get('DEFECT_TEXTS_OUT') or \
    os.path.join(tempfile.gettempdir(), 'iatf-defect-texts.json')

PART_RE = re.compile(r'(\d{4,5}-[0-9A-Z]{3,6}(?:-\d)?)')
# 구조화 대책서 판별용 마커(발생일자/지역/수량 중 하나)
STRUCT_MARKERS = ['발생일자', '발생 일자', '발생지역', '발생 지역', '발생수량', '발생 수량']


def pptx_text(f):
    """슬라이드 XML 의 <a:t> 런을 순서대로 이어붙인 원문 텍스트."""
    try:
        z = zipfile.ZipFile(f)
        slides = sorted(
            [n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml', n)],
            key=lambda x: int(re.search(r'(\d+)', x).group()))
        out = []
        for n in slides:
            out += re.findall(r'<a:t>(.*?)</a:t>', z.read(n).decode('utf-8', 'ignore'))
        t = ' '.join(out)
        for a, b in [('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&#10;', ' ')]:
            t = t.replace(a, b)
        return re.sub(r'\s+', ' ', t).strip()
    except Exception:
        return ''


def main():
    files = glob.glob(os.path.join(ROOT, '**', '*.pptx'), recursive=True)
    records = []
    seen = set()
    for f in files:
        name = os.path.basename(f)
        if name.startswith('~$'):
            continue
        pm = PART_RE.search(name)
        if not pm:
            continue
        part = pm.group(1)
        txt = pptx_text(f)
        if len(txt) < 350:
            continue
        # 구조화 대책서만(노이즈 슬라이드 제외) — 비용/품질 관리
        if not any(m in txt for m in STRUCT_MARKERS):
            continue
        key = (part, name[:20])
        if key in seen:
            continue
        seen.add(key)
        records.append({'file': name, 'part_no': part, 'text': txt})

    os.makedirs(os.path.dirname(SCRATCH), exist_ok=True)
    with open(SCRATCH, 'w', encoding='utf-8') as fp:
        json.dump(records, fp, ensure_ascii=False, indent=2)
    print(f'대책서 PPTX {len(records)}건 원문 덤프 → {SCRATCH}')
    # 길이 분포 미리보기
    for r in records[:5]:
        print(f"  {r['part_no']:13} | {len(r['text']):5}자 | {r['file'][:50]}")


if __name__ == '__main__':
    main()
