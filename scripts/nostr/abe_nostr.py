"""Awesome Bitcoin Events Nostr account: key setup and signed publishing.

The private key never leaves C:/Users/<you>/.secrets/abe-nostr/nsec.dpapi (Windows DPAPI,
bound to the current Windows user). Nothing here prints it.

  uv run --python 3.11 --with nostr-sdk==0.45.1 --with websockets==15.0.1 --with certifi python scripts/nostr/abe_nostr.py keygen
  ... abe_nostr.py pubkey
  ... abe_nostr.py publish event.json     # {"kind": 0, "content": "...", "tags": [[...]]}
"""
import asyncio
import ctypes
import ctypes.wintypes as wt
import json
import ssl
import sys
from pathlib import Path

import certifi
import websockets
from nostr_sdk import Event, EventBuilder, Keys, Kind, Tag

KEY_PATH = Path.home() / ".secrets" / "abe-nostr" / "nsec.dpapi"
RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net", "wss://nostr.mom"]


class _Blob(ctypes.Structure):
    _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]


def _dpapi(data, decrypt=False):
    src = _Blob(len(data), ctypes.cast(ctypes.create_string_buffer(data, len(data)), ctypes.POINTER(ctypes.c_char)))
    dst = _Blob()
    fn = ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
    if not fn(ctypes.byref(src), None, None, None, None, 0, ctypes.byref(dst)):
        raise OSError("DPAPI call failed")
    try:
        return ctypes.string_at(dst.pbData, dst.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(dst.pbData)


def load_keys():
    return Keys.parse(_dpapi(KEY_PATH.read_bytes(), decrypt=True).decode("ascii"))


def keygen():
    if KEY_PATH.exists():
        sys.exit(f"refusing: {KEY_PATH} already exists")
    keys = Keys.generate()
    KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    KEY_PATH.write_bytes(_dpapi(keys.secret_key().to_bech32().encode("ascii")))
    assert load_keys().public_key().to_hex() == keys.public_key().to_hex()
    pubkey()


def pubkey():
    pk = load_keys().public_key()
    print(json.dumps({"hex": pk.to_hex(), "npub": pk.to_bech32()}))


async def _publish_one(url, payload):
    ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        async with asyncio.timeout(25):
            async with websockets.connect(url, ssl=ctx, open_timeout=10, close_timeout=1) as ws:
                await ws.send(json.dumps(["EVENT", payload]))
                while True:
                    r = json.loads(await ws.recv())
                    if r[0] == "OK" and r[1] == payload["id"]:
                        if not r[2]:
                            return {"relay": url, "accepted": False, "msg": r[3]}
                        break
                await ws.send(json.dumps(["REQ", "rb", {"ids": [payload["id"]]}]))
                while True:
                    r = json.loads(await ws.recv())
                    if r[0] == "EVENT" and r[1] == "rb":
                        return {"relay": url, "accepted": True, "readback": r[2] == payload}
                    if r[0] in ("EOSE", "CLOSED"):
                        return {"relay": url, "accepted": True, "readback": False}
    except Exception as e:
        return {"relay": url, "accepted": False, "error": type(e).__name__}


def publish(path):
    spec = json.loads(Path(path).read_text(encoding="utf-8"))
    keys = load_keys()
    builder = EventBuilder(Kind(spec["kind"]), spec["content"]).tags([Tag.parse(t) for t in spec.get("tags", [])])
    event = keys.sign_event(builder.finalize_unsigned(keys.public_key()))
    if not event.verify():
        sys.exit("local signature check failed")
    payload = json.loads(event.as_json())
    res = asyncio.run(_gather(payload))
    print(json.dumps({"id": payload["id"], "kind": payload["kind"], "relays": res}, indent=1))


async def _gather(payload):
    return await asyncio.gather(*(_publish_one(u, payload) for u in RELAYS))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "keygen":
        keygen()
    elif cmd == "pubkey":
        pubkey()
    elif cmd == "publish" and len(sys.argv) == 3:
        publish(sys.argv[2])
    else:
        sys.exit(__doc__)
