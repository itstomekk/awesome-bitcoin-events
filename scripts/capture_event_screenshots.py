from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "event-images"
OUT.mkdir(parents=True, exist_ok=True)
TARGETS = [
    ("imagine-if-nashville-2026", "https://www.imagineifnashville.com/"),
    ("tabconf-8-2026", "https://tabconf.com/"),
    ("blockchain-africa-conference-2026", "https://bitcoinevents.co.za/"),
    ("bitcoin-bush-bash-busselton-2026", "https://bitcoinbushbash.info/"),
    ("labitconf-2026", "https://www.labitconf.com/"),
    ("bitcoin-for-corporations-symposium-2026", "https://bitcoinforcorporations.com/events/amsterdam-symposium-2026/"),
    ("bitcoin-amsterdam-2026", "https://www.bitcoin.amsterdam/2026"),
    ("b-only-2026", "https://b-only.org/"),
    ("bitcoin-veterans-summit-2026", "https://bitcoinveterans.org/summit2026/"),
    ("bitblockmine-2026", "https://bitblockboom.com/bbm2026/"),
    ("bitcoinday-naples-2027", "https://bitcoinday.io/"),
    ("bitcoin-treasuries-conference-uk-2027", "https://www.smarterwebcompany.co.uk/bitcoin-treasuries-conference-uk-2027/"),
    ("adopting-bitcoin-arnhem-2027", "https://nl27.adoptingbitcoin.org/"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 800}, device_scale_factor=1)
    page = context.new_page()
    for slug, url in TARGETS:
        out = OUT / f"{slug}.png"
        try:
            response = page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(2500)
            for selector in [
                "button:has-text('Accept')",
                "button:has-text('I agree')",
                "button:has-text('Got it')",
                "button[aria-label*='close' i]",
            ]:
                try:
                    page.locator(selector).first.click(timeout=700)
                    break
                except Exception:
                    pass
            page.screenshot(path=str(out), type="png", full_page=False)
            print(f"OK {slug} status={response.status if response else 'none'} bytes={out.stat().st_size}")
        except Exception as exc:
            print(f"FAIL {slug} {type(exc).__name__}: {exc}")
    browser.close()
