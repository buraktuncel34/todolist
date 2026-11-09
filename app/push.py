"""Web Push (VAPID) for the PWA: morning summary + timed routine alerts."""
import base64
import json
import logging
import os

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid01
from pywebpush import WebPushException, webpush

from .db import DATA, q, x

log = logging.getLogger("gunluk.push")
PEM = DATA / "vapid_private.pem"
SUB = os.environ.get("PUBLIC_URL") or ("mailto:" + os.environ["OWNER_EMAIL"] if os.environ.get("OWNER_EMAIL") else "https://localhost")
_public = None


def ensure_keys():
    global _public
    if not PEM.exists():
        v = Vapid01()
        v.generate_keys()
        v.save_key(str(PEM))
        os.chmod(PEM, 0o600)
    v = Vapid01.from_file(str(PEM))
    raw = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    _public = base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    return _public


def public_key():
    return _public or ensure_keys()


def send_all(title, body, url="/", tag=None, user_id=None):
    """Push to one user's devices (user_id), or to every device when user_id is None."""
    sent = 0
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag or title})
    if user_id is None:
        rows = q("SELECT endpoint, data FROM push_subs")
    else:
        rows = q("SELECT endpoint, data FROM push_subs WHERE user_id=?", (user_id,))
    for s in rows:
        try:
            webpush(subscription_info=json.loads(s["data"]), data=payload, vapid_private_key=str(PEM),
                    vapid_claims={"sub": SUB}, ttl=6 * 3600)
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, "status_code", None)
            if code in (404, 410):
                x("DELETE FROM push_subs WHERE endpoint=?", (s["endpoint"],))
            log.warning("push failed (%s): %s", code, e)
        except Exception as e:  # noqa: BLE001 - one bad subscription must not stop the rest
            log.warning("push error: %s", e)
    return sent
