#!/usr/bin/env python3
"""Smoke-test authenticated upload sessions and the browser-to-R2 CORS path."""

from __future__ import annotations

import argparse
import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def api_request(
    base_url: str, token: str, path: str, payload: dict, method: str = "POST"
) -> dict:
    request = Request(
        f"{base_url}{path}",
        data=json.dumps(payload).encode(),
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            envelope = json.load(response)
    except HTTPError as error:
        body = error.read().decode(errors="replace")
        raise RuntimeError(f"{path} returned HTTP {error.code}: {body}") from error
    if envelope.get("code") != 200 or "data" not in envelope:
        raise RuntimeError(f"{path} returned an invalid API envelope")
    return envelope["data"]


def check_cors(base_url: str, token: str, origin: str, verify_put: bool) -> None:
    session = api_request(
        base_url,
        token,
        "/api/admin/uploads",
        {
            "kind": "image",
            "file_name": "deploy-check.png",
            "content_type": "image/png",
            "file_size": 1,
        },
    )
    request = Request(
        session["upload_url"],
        method="OPTIONS",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    with urlopen(request, timeout=20) as response:
        allowed_origin = response.headers.get("Access-Control-Allow-Origin", "")
        allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
        allowed_headers = response.headers.get("Access-Control-Allow-Headers", "")
    if allowed_origin not in (origin, "*"):
        raise RuntimeError(f"R2 CORS does not allow origin {origin}")
    if "PUT" not in allowed_methods.upper():
        raise RuntimeError("R2 CORS does not allow PUT")
    if "content-type" not in allowed_headers.lower():
        raise RuntimeError("R2 CORS does not allow the Content-Type header")
    if not verify_put:
        return

    failure: BaseException | None = None
    try:
        put_request = Request(
            session["upload_url"],
            data=b"x",
            method="PUT",
            headers={"Origin": origin, "Content-Type": "image/png"},
        )
        with urlopen(put_request, timeout=20) as response:
            etag = response.headers.get("ETag", "")
            actual_origin = response.headers.get("Access-Control-Allow-Origin", "")
            exposed = response.headers.get("Access-Control-Expose-Headers", "")
        if not etag:
            raise RuntimeError("R2 PUT did not return an ETag")
        if actual_origin not in (origin, "*"):
            raise RuntimeError("R2 PUT response does not allow the blog origin")
        if "etag" not in exposed.lower():
            raise RuntimeError("R2 CORS does not expose ETag to the browser")
    except BaseException as error:
        failure = error

    try:
        api_request(
            base_url,
            token,
            "/api/admin/uploads",
            {"key": session["key"]},
            method="DELETE",
        )
    except BaseException as cleanup_error:
        if failure is None:
            raise
        raise RuntimeError(
            f"upload check failed and probe cleanup also failed: {cleanup_error}"
        ) from failure
    if failure is not None:
        raise failure


def check_multipart_resume(base_url: str, token: str) -> None:
    metadata = {
        "kind": "video",
        "file_name": "deploy-check.mp4",
        "content_type": "video/mp4",
        "file_size": 1,
    }
    session = api_request(base_url, token, "/api/admin/uploads", metadata)
    reference = {
        **metadata,
        "key": session["key"],
        "upload_id": session["upload_id"],
    }
    failure: BaseException | None = None
    try:
        resumed = api_request(
            base_url, token, "/api/admin/uploads/resume", reference
        )
        if resumed.get("completed_parts") or len(resumed.get("parts", [])) != 1:
            raise RuntimeError("multipart resume returned inconsistent parts")
    except BaseException as error:
        failure = error

    try:
        api_request(
            base_url,
            token,
            "/api/admin/uploads/abort",
            {"key": session["key"], "upload_id": session["upload_id"]},
        )
    except BaseException as cleanup_error:
        if failure is None:
            raise
        raise RuntimeError(
            f"multipart check failed and abort also failed: {cleanup_error}"
        ) from failure
    if failure is not None:
        raise failure


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("cors", "multipart"))
    parser.add_argument("--base-url", default="http://127.0.0.1:3006")
    parser.add_argument("--origin", default="https://blog.chuyi.uk")
    args = parser.parse_args()
    token = sys.stdin.read().strip()
    if not token:
        raise RuntimeError("admin token was not provided on stdin")
    if args.mode == "cors":
        check_cors(args.base_url, token, args.origin, verify_put=False)
    else:
        check_cors(args.base_url, token, args.origin, verify_put=True)
        check_multipart_resume(args.base_url, token)
    print(f"upload {args.mode} check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
