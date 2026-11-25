"""Coffre-fort C5 : secrets, identifiants, clés (§26).

Les secrets ne transitent JAMAIS par un contexte de modèle de langage. Les agents ne
manipulent que des poignées opaques ; seul un exécuteur d'outil explicitement autorisé
résout la poignée au moment de l'appel.

`DevVault` est une implémentation de développement, en mémoire. En production, ne pas
réinventer : trousseau du système (Keychain / Credential Manager / libsecret), gestionnaire
de secrets (Bitwarden Secrets Manager, 1Password, HashiCorp Vault) ou KMS du fournisseur.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4


@dataclass(frozen=True)
class SecretHandle:
    handle_id: str
    name: str

    def __str__(self) -> str:  # une poignée ne révèle jamais le secret
        return f"<secret:{self.name}>"


class VaultAccessError(PermissionError):
    pass


class DevVault:
    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}
        self._allowed_tools: dict[str, frozenset[str]] = {}

    def put(self, name: str, value: str, allowed_tools: frozenset[str]) -> SecretHandle:
        handle = SecretHandle(f"vh_{uuid4().hex[:12]}", name)
        self._secrets[handle.handle_id] = value
        self._allowed_tools[handle.handle_id] = allowed_tools
        return handle

    def resolve_for_tool(self, handle: SecretHandle, tool_name: str) -> str:
        if tool_name not in self._allowed_tools.get(handle.handle_id, frozenset()):
            raise VaultAccessError(f"l'outil {tool_name!r} n'est pas autorisé à utiliser {handle}.")
        return self._secrets[handle.handle_id]

    def revoke(self, handle: SecretHandle) -> None:
        self._secrets.pop(handle.handle_id, None)
        self._allowed_tools.pop(handle.handle_id, None)

    def __repr__(self) -> str:
        return f"DevVault({len(self._secrets)} secrets)"
