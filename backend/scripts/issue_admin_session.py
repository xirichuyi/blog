#!/usr/bin/env python3
"""Print a short-lived admin session token for deployment checks.

The token is the same HS256 cookie the Google sign-in callback issues, signed
with JWT_SECRET for the first address in GOOGLE_ALLOWED_EMAILS. It replaces a
static admin token: whoever can read the production .env can already sign
sessions, and the result expires after a few minutes.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import sys
import time

TTL_SECONDS = 600


def read_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    with open(path, encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key.strip()] = value
    return values


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> int:
    if len(sys.argv) != 2:
        raise RuntimeError("usage: issue_admin_session.py /path/to/.env")
    env = read_env(sys.argv[1])
    secret = env.get("JWT_SECRET", "")
    emails = [
        email.strip().lower()
        for email in env.get("GOOGLE_ALLOWED_EMAILS", "").split(",")
        if email.strip()
    ]
    if not secret or not emails:
        raise RuntimeError("JWT_SECRET and GOOGLE_ALLOWED_EMAILS are required")

    now = int(time.time())
    header = {"typ": "JWT", "alg": "HS256"}
    claims = {
        "sub": emails[0],
        "email": emails[0],
        "name": "deploy-check",
        "picture": None,
        "iss": "chuyi-blog",
        "aud": "blog-admin",
        "iat": now,
        "exp": now + TTL_SECONDS,
    }
    signing_input = ".".join(
        b64url(json.dumps(part, separators=(",", ":")).encode())
        for part in (header, claims)
    )
    signature = hmac.new(
        secret.encode(), signing_input.encode(), hashlib.sha256
    ).digest()
    print(f"{signing_input}.{b64url(signature)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
