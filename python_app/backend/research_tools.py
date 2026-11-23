"""Official source verification and SSRF-safe URL reachability helpers."""
import ipaddress
import socket
from urllib.parse import urlparse
import httpx

OFFICIAL_PORTAL_PRIORITY = [
    "scholarships.gov.in",
    "ssp.postmatric.karnataka.gov.in",
    "ssp.karnataka.gov.in",
    "karepass.cgg.gov.in",
    "myscheme.gov.in",
    "aicte-india.org",
    "ugc.gov.in",
    "socialjustice.gov.in",
    "minorityaffairs.gov.in",
    "tribal.nic.in",
    "education.gov.in",
    "karnataka.gov.in",
]


def is_safe_public_url(raw_url: str) -> bool:
    if not raw_url or raw_url == "Not verified":
        return False
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return False
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host in ("localhost", "::1") or host.endswith((".local", ".internal")):
        return False
    try:
        addr_info = socket.getaddrinfo(host, None)
        for item in addr_info:
            ip = ipaddress.ip_address(item[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
    except Exception:
        return False
    return True


def check_url_reachable(raw_url: str) -> bool | None:
    if not is_safe_public_url(raw_url):
        return False if raw_url and raw_url != "Not verified" else None
    try:
        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            resp = client.head(raw_url, headers={"User-Agent": "ScholarAI-SourceVerifier/1.0"})
            return 200 <= resp.status_code < 500
    except Exception:
        return False


def classify_domain_authority(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        host = host.lower()
        if "scholarships.gov.in" in host:
            return "Official Central Portal (NSP)"
        if "ssp." in host and "karnataka.gov.in" in host:
            return "Official State Portal (Karnataka SSP)"
        if "myscheme.gov.in" in host:
            return "Official Government Aggregator (myScheme)"
        if host.endswith(".gov.in") or host.endswith(".nic.in"):
            return "Official Government Domain (.gov.in / .nic.in)"
        if host.endswith(".ac.in") or host.endswith(".edu.in") or "aicte" in host or "ugc" in host:
            return "Official Academic / Statutory Body"
        return "Secondary Reference Source"
    except Exception:
        return "Unverified URL"
