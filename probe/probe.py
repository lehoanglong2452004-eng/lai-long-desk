import urllib.request, os
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
urls = {
 "fed": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
 "bls_cpi": "https://www.bls.gov/schedule/news_release/cpi.htm",
 "bls_emp": "https://www.bls.gov/schedule/news_release/empsit.htm",
 "bea": "https://www.bea.gov/news/schedule/full",
 "wasde": "https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report",
 "fred_rel": "https://fred.stlouisfed.org/releases/calendar",
}
os.makedirs("probe/out", exist_ok=True)
for k, u in urls.items():
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "text/html,*/*", "Accept-Language": "en-US"}), timeout=30)
        b = r.read().decode("utf-8", "replace"); print(k, r.status, len(b))
        open(f"probe/out/{k}.html", "w").write(b)
    except Exception as e:
        print(k, "ERR", e); open(f"probe/out/{k}.err", "w").write(str(e))
