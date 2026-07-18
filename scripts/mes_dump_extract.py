# -*- coding: utf-8 -*-
"""tspmes 클래식 exp 덤프에서 특정 테이블의 행 데이터를 CSV 로 추출.

사용: python scripts/mes_dump_extract.py <dmp> <tables.json> <TABLE> [--out out.csv] [--limit N]

포맷(11gR2 conventional exp, 실측 역공학):
  INSERT INTO "T" (...) VALUES (:1,...) 문 직후
  0x0A + u16(컬럼수) + 컬럼별 디스크립터
    문자형(1,96): u16 타입 + u16 최대길이 + u16 문자셋ID + u16 형식플래그(=1)
    기타(2 NUMBER, 12 DATE 등): u16 타입 + u16 최대길이
  + u16 0x0000(종결)
  행마다: u16 0x0000(행 마커) + 컬럼별 [u16 길이 + 데이터], NULL=0xFFFE
  테이블 끝: 행 마커 자리에 비0 값
"""
import csv
import io
import json
import struct
import sys

NULLLEN = 0xFFFE
ENDMARK = 0xFFFF


def decode_number(b):
    from decimal import Decimal
    if len(b) == 0:
        return None
    if b == b"\x80":
        return 0
    b0 = b[0]
    try:
        if b0 & 0x80:  # 양수
            exp = (b0 & 0x7F) - 65
            mant = b[1:]
            digits = [x - 1 for x in mant]
            neg = False
        else:  # 음수 (지수 반전, 마지막 102 종결바이트)
            exp = ((b0 ^ 0xFF) & 0x7F) - 65
            mant = b[1:]
            if mant and mant[-1] == 102:
                mant = mant[:-1]
            digits = [101 - x for x in mant]
            neg = True
        if any(d < 0 or d > 99 for d in digits):
            return "0x" + b.hex()
        val = Decimal(0)
        for d in digits:
            val = val * 100 + d
        val = val * (Decimal(100) ** (exp - len(digits) + 1))
        if neg:
            val = -val
        if val == val.to_integral_value():
            return int(val)
        return float(val)
    except Exception:
        return "0x" + b.hex()


def decode_date(b):
    if len(b) != 7:
        return b.hex()
    cc, yy, mm, dd, hh, mi, ss = b
    year = (cc - 100) * 100 + (yy - 100)
    return f"{year:04d}-{mm:02d}-{dd:02d} {hh-1:02d}:{mi-1:02d}:{ss-1:02d}"


def decode_str(b):
    # DB에 UTF-8/CP949 혼재 → UTF-8(엄격)이 먼저: CP949 한글이 유효한 UTF-8이 되는 경우는 드묾
    for enc in ("utf-8", "cp949"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            continue
    return b.decode("cp949", "replace")


class Reader:
    def __init__(self, f):
        self.f = f
        self.buf = b""
        self.pos = 0

    def read(self, n):
        while len(self.buf) - self.pos < n:
            chunk = self.f.read(8 * 1024 * 1024)
            if not chunk:
                raise EOFError
            self.buf = self.buf[self.pos:] + chunk
            self.pos = 0
        out = self.buf[self.pos:self.pos + n]
        self.pos += n
        return out

    def u16(self):
        return struct.unpack("<H", self.read(2))[0]


def extract(dmp_path, insert_offset, columns, out_path=None, limit=None):
    f = open(dmp_path, "rb")
    f.seek(insert_offset)
    head = f.read(65536)
    # INSERT ... VALUES (:1, ..., :N) 문 끝 찾기
    vi = head.find(b"VALUES")
    stmt_end = head.find(b")", vi) + 1
    f.seek(insert_offset + stmt_end)
    r = Reader(f)

    b0 = r.read(1)
    if b0 != b"\x0a":
        raise ValueError(f"디스크립터 시작 0x0A 아님: {b0.hex()}")
    ncols = r.u16()
    types = []
    for _ in range(ncols):
        t = r.u16()
        ln = r.u16()
        if t in (1, 96):  # 문자형: charset id + 형식플래그
            r.u16()
            r.u16()
        types.append((t, ln))
    if any(t in (8, 24, 112, 113) for t, _ in types):
        # LONG/LOB 테이블: 디스크립터 뒤 LOB 메타섹션+피스단위 값 포맷 별도 → 미지원
        raise NotImplementedError("LONG/LOB 컬럼 포함 테이블은 행 추출 미지원 (백로그)")
    sent = r.u16()
    if sent != 0:
        raise ValueError(f"디스크립터 종결 0 아님: {sent}")

    writer = None
    outf = None
    if out_path:
        outf = io.open(out_path, "w", encoding="utf-8-sig", newline="")
        writer = csv.writer(outf)
        writer.writerow(columns)

    rows = 0
    sample = []
    while True:
        try:
            marker = r.u16()
        except EOFError:
            break
        if marker != 0:
            break  # 테이블 끝
        rec = []
        ended = False
        for (t, _ln) in types:
            ln = r.u16()
            if ln == ENDMARK:  # 00 00 FF FF = 데이터 종료
                ended = True
                break
            if ln == NULLLEN:
                rec.append(None)
                continue
            raw = r.read(ln)
            if t == 2:
                rec.append(decode_number(raw))
            elif t == 12:
                rec.append(decode_date(raw))
            else:
                rec.append(decode_str(raw))
        if ended:
            break
        rows += 1
        if writer:
            writer.writerow(["" if v is None else v for v in rec])
        if len(sample) < 5:
            sample.append(rec)
        if limit and rows >= limit:
            break

    if outf:
        outf.close()
    return rows, sample


def main():
    dmp, tj, table = sys.argv[1], sys.argv[2], sys.argv[3]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    with io.open(tj, encoding="utf-8") as fp:
        meta = json.load(fp)["tables"][table]
    rows, sample = extract(dmp, meta["insert_offset"], meta["columns"], out, limit)
    print(f"{table}: {rows} rows" + (f" -> {out}" if out else ""))
    for rec in sample[:3]:
        print("  ", [str(v)[:30] if v is not None else "" for v in rec[:8]])


if __name__ == "__main__":
    main()
