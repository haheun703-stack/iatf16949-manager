# @IATFAuditing 채널 전체 영상의 영어 자막을 docs/iatf-audit-channel/ 로 수집.
# 재실행 안전: 이미 확보한 자막은 스킵, 신규분만 받음(IP 차단 회복 후 분할 재실행으로 점진 완성).
# 사용: python scripts/fetch-iatf-transcripts.py   (.env 의 YOUTUBE_API_KEY / WEBSHARE_USERNAME / WEBSHARE_PASSWORD 필요)
import sys, io, os, json, time, urllib.request, urllib.parse, urllib.error
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # iatf16949-manager/
OUT = os.path.join(ROOT, 'docs', 'iatf-audit-channel')
TRDIR = os.path.join(OUT, 'transcripts'); os.makedirs(TRDIR, exist_ok=True)

env = {}
for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1); env[k.strip()] = v.strip().strip('"').strip("'")
KEY = env['YOUTUBE_API_KEY']; U = env.get('WEBSHARE_USERNAME'); P = env.get('WEBSHARE_PASSWORD')

def api(endpoint, params):
    params['key'] = KEY
    url = 'https://www.googleapis.com/youtube/v3/' + endpoint + '?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=25) as r:
        return json.load(r)

# 1) 전체 영상 목록 (YouTube Data API)
ch = api('channels', {'part': 'contentDetails', 'forHandle': 'IATFAuditing'})
uploads = ch['items'][0]['contentDetails']['relatedPlaylists']['uploads']
vids, token = [], None
while True:
    p = {'part': 'snippet', 'playlistId': uploads, 'maxResults': 50}
    if token: p['pageToken'] = token
    res = api('playlistItems', p)
    for it in res['items']:
        s = it['snippet']
        vids.append({'id': s['resourceId']['videoId'], 'title': s['title'], 'date': s.get('publishedAt', '')[:10]})
    token = res.get('nextPageToken')
    if not token: break
print(f'전체 영상 {len(vids)}개')

# 2) 자막 수집 (프록시 우선, 확보분 스킵)
_purl = f'http://{U}:{P}@p.webshare.io:80'
proxy_api = YouTubeTranscriptApi(proxy_config=GenericProxyConfig(http_url=_purl, https_url=_purl))
direct_api = YouTubeTranscriptApi()

manifest = []
captured = nocap = pending = 0
for i, v in enumerate(vids, 1):
    vid = v['id']; status = None; words = 0
    fp = os.path.join(TRDIR, f'{vid}.txt')
    if os.path.exists(fp):  # 재실행 시 스킵
        words = len(open(fp, encoding='utf-8').read().split()); status = 'captured'; captured += 1
    else:
        for mode in ('proxy', 'direct'):
            try:
                a = proxy_api if mode == 'proxy' else direct_api
                ft = a.fetch(vid, languages=['en'])
                text = ' '.join(getattr(s, 'text', '') for s in ft)
                open(fp, 'w', encoding='utf-8').write(text)
                words = len(text.split()); status = 'captured'; captured += 1
                break
            except Exception as e:
                en = type(e).__name__
                if 'NoTranscript' in en or 'TranscriptsDisabled' in en or 'NoTranscriptFound' in en:
                    status = 'nocaption'; nocap += 1; break
        if status is None:  # IpBlocked/429 등 → 다음 회차 재시도 대상
            status = 'pending'; pending += 1
    manifest.append({'id': vid, 'title': v['title'], 'date': v['date'], 'words': words, 'status': status})
    if i % 20 == 0 or i == len(vids):
        print(f'  {i}/{len(vids)} | captured{captured} nocap{nocap} pending{pending}')
    time.sleep(0.3)

json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'\n완료: 자막 {captured} · 자막없음 {nocap} · 미수집(차단) {pending} / 총 {len(vids)}')
print(f'→ {TRDIR} + manifest.json')
