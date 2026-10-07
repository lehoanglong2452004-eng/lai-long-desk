import json, urllib.request, ssl, time, datetime as dt
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36"
today = dt.date.today()
T = [
 # global bonds / central banks
 ("bis_policy", "https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.US+XM+JP+GB+CN+AU+CA+CH+HK+SG?lastNObservations=2&format=csv", None),
 ("bis_policy_v1", "https://stats.bis.org/api/v1/data/WS_CBPOL/D.US+XM+JP+GB+CN+AU+CA+CH+HK+SG/all?lastNObservations=2&format=csv", None),
 ("ust_curve", f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{today.year}/all?type=daily_treasury_yield_curve&field_tdr_date_value={today.year}&page&_format=csv", None),
 ("bundesbank_10y", "https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZST.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A?lastNObservations=3&format=csv", None),
 ("ecb_yc_10y", "https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=3&format=csvdata", None),
 ("ecb_dfr", "https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?lastNObservations=2&format=csvdata", None),
 ("boe_gilt", "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Sep/2026&Dateto=now&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N", None),
 ("mof_jgb", "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv", None),
 ("yahoo_bund", "https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=1d&interval=5m", None),
 ("yahoo_move", "https://query1.finance.yahoo.com/v8/finance/chart/%5EMOVE?range=5d&interval=1d", None),
 ("yahoo_zn", "https://query1.finance.yahoo.com/v8/finance/chart/ZN%3DF?range=5d&interval=1d", None),
 ("yahoo_fgbl", "https://query1.finance.yahoo.com/v8/finance/chart/FGBL%3DF?range=5d&interval=1d", None),
 ("yahoo_es", "https://query1.finance.yahoo.com/v8/finance/chart/ES%3DF?range=1d&interval=1m", None),
 ("fred_t10yie", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10YIE", None),
 ("fred_walcl", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL", None),
 ("fred_hy", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2", None),
 ("fred_nfci", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=NFCI", None),
 ("fred_tp", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=THREEFYTP10", None),
 ("cftc_tff", "https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=3&$order=report_date_as_yyyy_mm_dd%20DESC&cftc_contract_market_code=043602", None),
 # crypto
 ("cg_global", "https://api.coingecko.com/api/v3/global", None),
 ("llama_stables", "https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1", None),
 ("blockchain_hash", "https://api.blockchain.info/charts/hash-rate?timespan=7days&format=json", None),
 ("mempool_fees", "https://mempool.space/api/v1/fees/recommended", None),
 ("okx_liq", "https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&uly=BTC-USDT&state=filled&limit=5", None),
 ("okx_lsr", "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H", None),
 ("okx_oi", "https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume?ccy=BTC&period=1H", None),
 ("bybit_lsr", "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=2", None),
 ("bybit_oi", "https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=2", None),
 ("binance_lsr", "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=2", None),
 ("binance_spot_kl", "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=2", None),
 ("deribit_dvol", "https://www.deribit.com/api/v2/public/get_index_price?index_name=btc_usd", None),
 ("hl_ctx", "https://api.hyperliquid.xyz/info", {"type": "metaAndAssetCtxs"}),
 ("cme_vol", "https://www.cmegroup.com/CmeWS/mvc/Volume/Details/F/437/20261006/P?tradeDate=20261006", None),
]
out = []
for name, url, body in T:
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"User-Agent": UA, "Origin": "https://lehoanglong2452004-eng.github.io", "Accept": "*/*",
                                          **({"Content-Type": "application/json"} if body else {})})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            b = r.read(); st = r.status; cors = r.headers.get("Access-Control-Allow-Origin")
    except urllib.error.HTTPError as e:
        b = e.read(); st = e.code; cors = e.headers.get("Access-Control-Allow-Origin")
    except Exception as e:
        b = str(e).encode(); st = "ERR"; cors = None
    txt = b.decode("utf-8", "replace")
    out.append(f"## {name} status={st} cors={cors} bytes={len(b)} {time.time()-t0:.1f}s\n{(txt[:500] if len(txt)<4000 else txt[:300]+' ... '+txt[-300:])}\n")
open("probe/out/sources.txt", "w").write("\n".join(out))
