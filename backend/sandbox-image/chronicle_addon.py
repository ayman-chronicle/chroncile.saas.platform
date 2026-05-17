"""Chronicle mitmproxy addon.

The addon is intentionally thin: mitmproxy terminates HTTP/TLS, this file
turns the request into the Chronicle world RPC shape, and Rust `worldd`
performs replay matching, fallback decisions, and interaction recording.
"""

from __future__ import annotations

import json
import os
import ipaddress
import socket
from typing import Any

from mitmproxy import ctx, http


WORLD_SOCKET = os.environ.get("WORLD_SOCKET", "/tmp/chronicle/world/worldd.sock")
WORLD_RPC_TIMEOUT_SECONDS = float(os.environ.get("WORLD_RPC_TIMEOUT_SECONDS", "5"))
HOP_BY_HOP_HEADERS = {
    "connection",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


class ChronicleAddon:
    def request(self, flow: http.HTTPFlow) -> None:
        if flow.request.method.upper() == "CONNECT":
            return
        try:
            matched = self._match(flow)
            flow.response = self._response(matched)
        except Exception as exc:  # mitmproxy must not crash the whole run.
            ctx.log.error(f"chronicle world rpc failed: {exc}")
            flow.response = http.Response.make(
                502,
                json.dumps(
                    {
                        "error": "chronicle world runtime unavailable",
                        "detail": str(exc),
                    },
                    separators=(",", ":"),
                ).encode("utf-8"),
                {"content-type": "application/json"},
            )

    def _match(self, flow: http.HTTPFlow) -> dict[str, Any]:
        request = {
            "method": flow.request.method,
            "url": flow.request.pretty_url,
            "authority": _authority(flow),
            "path": _path(flow.request.path),
            "pathQuery": _path_query(flow.request.path),
            "headers": _headers(flow.request.headers),
            "body": _body(flow.request),
        }
        envelope = _rpc({"rpc": "match_http", "request": request})
        result = envelope.get("result")
        if not result:
            raise RuntimeError(envelope.get("error") or "worldd returned no result")
        if result.get("type") != "http_matched":
            raise RuntimeError(f"unexpected worldd response type: {result.get('type')}")
        return result

    def _response(self, matched: dict[str, Any]) -> http.Response:
        headers = {
            str(k): str(v)
            for k, v in dict(matched.get("headers") or {}).items()
            if str(k).lower() not in HOP_BY_HOP_HEADERS
        }
        body = matched.get("body")
        if body is None:
            content = b""
        elif isinstance(body, str):
            content = body.encode("utf-8")
        else:
            headers.setdefault("content-type", "application/json")
            content = json.dumps(body, separators=(",", ":")).encode("utf-8")
        return http.Response.make(int(matched.get("statusCode") or 500), content, headers)


def _rpc(payload: dict[str, Any]) -> dict[str, Any]:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8") + b"\n"
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.settimeout(WORLD_RPC_TIMEOUT_SECONDS)
        sock.connect(WORLD_SOCKET)
        sock.sendall(raw)
        chunks: list[bytes] = []
        while True:
            chunk = sock.recv(65536)
            if not chunk:
                break
            chunks.append(chunk)
            if chunk.endswith(b"\n"):
                break
    line = b"".join(chunks).decode("utf-8").strip()
    if not line:
        raise RuntimeError("worldd closed the rpc socket without a response")
    return json.loads(line)


def _authority(flow: http.HTTPFlow) -> str:
    request = flow.request
    host = request.headers.get("host") or request.headers.get(":authority") or request.host or ""
    host = host.strip()
    sni = (
        str(getattr(flow.client_conn, "sni", "") or "").strip()
        or str(getattr(flow.server_conn, "sni", "") or "").strip()
    )
    if sni and (not host or _is_ip_literal(_strip_port(host))):
        host = sni
    port = request.port
    if port and port not in (80, 443) and ":" not in host:
        return f"{host}:{port}"
    return host


def _strip_port(host: str) -> str:
    if host.startswith("[") and "]" in host:
        return host[1:].split("]", 1)[0]
    if host.count(":") == 1:
        return host.rsplit(":", 1)[0]
    return host


def _is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def _path(path_query: str) -> str:
    path = (path_query or "/").split("?", 1)[0]
    return path if path.startswith("/") else f"/{path}"


def _path_query(path_query: str) -> str:
    path_query = path_query or "/"
    return path_query if path_query.startswith("/") else f"/{path_query}"


def _headers(headers: http.Headers) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in headers.items()}


def _body(request: http.Request) -> Any:
    raw = request.raw_content or b""
    if not raw:
        return None
    content_type = request.headers.get("content-type", "")
    text = raw.decode("utf-8", errors="replace")
    if "json" in content_type:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return text


addons = [ChronicleAddon()]
