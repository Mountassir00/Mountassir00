"""GUARDIAN content scanner: secrets, prompt-injection markers, sensitive topics.

Heuristic and deliberately conservative. It reduces risk; it does not guarantee
detection. Findings only ever *raise* protection (redact, quarantine, reclassify up).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .enums import Classification
from .util import strip_diacritics

_SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("private_key", re.compile(r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )*PRIVATE KEY-----")),
    ("anthropic_key", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}")),
    ("openai_key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}")),
    ("github_token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("slack_token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")),
    ("mountassir_token", re.compile(r"\bmct_[A-Za-z0-9_\-]{20,}")),
    ("password", re.compile(r"(?i)\b(?:password|passwd|pwd|mot de passe|mdp)\s*[:=]\s*\S{4,}")),
]
_CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
_IBAN = re.compile(r"\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b")

_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(?i)\bignore\s+(?:all\s+|any\s+)?(?:the\s+|your\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions|prompts|messages|rules|directions)"),
    re.compile(r"(?i)\bdisregard\s+(?:all\s+|any\s+)?(?:the\s+|your\s+)?(?:previous|prior|above|earlier)?\s*(?:instructions|rules|guidelines|system prompt)"),
    re.compile(r"(?i)\b(?:ignore|oublie|ignorez|oubliez)\s+(?:toutes?\s+)?(?:tes|vos|les)\s+(?:instructions|consignes|regles)\s+(?:precedentes|anterieures)"),
    re.compile(r"(?i)\byou\s+are\s+now\s+(?:in\s+)?(?:developer\s+mode|dan\b|jailbroken|unrestricted|an?\s+unfiltered)"),
    re.compile(r"(?i)<\|\s*(?:im_start|im_end|system)\s*\|>"),
    re.compile(r"(?i)\b(?:reveal|print|show|output|leak)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+prompt|hidden\s+instructions|initial\s+instructions)"),
    re.compile(r"(?i)\b(?:send|post|exfiltrate|upload|forward)\b.{0,80}\b(?:memor(?:y|ies)|database|tokens?|credentials|secrets?|api\s*keys?)\b.{0,80}https?://"),
    re.compile(r"(?i)^\s*(?:new|updated)\s+(?:system\s+)?instructions\s*:", re.MULTILINE),
    re.compile(r"(?i)\b(?:call|invoke|use)\s+the\s+(?:tool|function)\s+\w+\s+(?:to|and)\s+(?:delete|export|send|revoke)"),
]

_SENSITIVE_TERMS: dict[str, tuple[str, ...]] = {
    "health": (
        "diagnostic", "diagnosis", "diagnosed", "medicament", "medication", "ordonnance", "prescription",
        "therapie", "therapy", "therapist", "psychiatre", "psychiatrist", "psychologue", "depression",
        "anxiete", "anxiety", "maladie", "illness", "traitement medical", "hospitalisation", "hospitalized",
        "symptome", "symptom", "chimiotherapie", "antidepresseur", "antidepressant",
    ),
    "finance": (
        "iban", "salaire", "salary", "releve bancaire", "bank statement", "avis d'imposition",
        "tax return", "numero fiscal", "credit immobilier", "mortgage",
    ),
    "intimate": ("sexualite", "sexuality", "vie intime", "relation intime", "orientation sexuelle"),
}
_SENSITIVE_RE = {
    topic: re.compile(r"\b(?:" + "|".join(re.escape(t) for t in terms) + r")\b")
    for topic, terms in _SENSITIVE_TERMS.items()
}


def _luhn_ok(digits: str) -> bool:
    total, parity = 0, len(digits) % 2
    for i, ch in enumerate(digits):
        d = int(ch)
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _iban_ok(candidate: str) -> bool:
    s = candidate.replace(" ", "")
    if not 15 <= len(s) <= 34:
        return False
    rearranged = s[4:] + s[:4]
    try:
        num = "".join(str(int(c, 36)) for c in rearranged)
    except ValueError:
        return False
    return int(num) % 97 == 1


@dataclass
class ScanResult:
    redacted: str
    secrets: list[str] = field(default_factory=list)
    injection: bool = False
    sensitive: list[str] = field(default_factory=list)

    @property
    def classification_floor(self) -> int:
        return int(Classification.C4_SENSITIVE) if self.sensitive else 0

    @property
    def flags(self) -> list[str]:
        out = [f"secret_redacted:{s}" for s in self.secrets]
        if self.injection:
            out.append("prompt_injection_suspect")
        out += [f"sensitive:{s}" for s in self.sensitive]
        return out


def scan(text: str) -> ScanResult:
    redacted = text
    secrets: list[str] = []
    for name, pattern in _SECRET_PATTERNS:
        if pattern.search(redacted):
            secrets.append(name)
            redacted = pattern.sub(f"[REDACTED:{name}]", redacted)

    def _card(m: re.Match[str]) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            if "payment_card" not in secrets:
                secrets.append("payment_card")
            return "[REDACTED:payment_card]"
        return m.group(0)

    redacted = _CARD.sub(_card, redacted)

    folded = strip_diacritics(redacted).casefold()
    sensitive = [topic for topic, rx in _SENSITIVE_RE.items() if rx.search(folded)]
    if "finance" not in sensitive and any(_iban_ok(m.group(0)) for m in _IBAN.finditer(redacted)):
        sensitive.append("finance")
    folded_raw = strip_diacritics(text)
    injection = any(p.search(folded_raw) for p in _INJECTION_PATTERNS)
    return ScanResult(redacted=redacted, secrets=secrets, injection=injection, sensitive=sensitive)
