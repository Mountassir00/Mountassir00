"""Politique de divulgation sous forme de données versionnées.

La politique est une donnée, pas un prompt : elle est lisible, comparable (empreinte),
versionnée et modifiable uniquement par une action d'administration autorisée.
"""

from __future__ import annotations

import hashlib
import json

from pydantic import BaseModel, ConfigDict

from ..domain.classification import Classification, SensitiveCategory
from ..domain.principals import AssuranceLevel

C = Classification
A = AssuranceLevel


class PolicyConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    version: str = "v0-default"
    # Assurance minimale de l'interlocuteur externe par niveau divulgable sans validation.
    min_assurance_external: dict[Classification, AssuranceLevel] = {
        C.C0_PUBLIC: A.CLAIMED,
        C.C1_SHARED: A.CHANNEL,
        C.C2_CONFIDENTIAL: A.AUTHENTICATED,
    }
    # Niveau maximal pouvant entrer dans le contexte du représentant externe.
    representative_max_classification: Classification = C.C2_CONFIDENTIAL
    # Catégories interdites par défaut à l'extérieur (validation humaine si octroi nominatif).
    external_forbidden_categories: frozenset[SensitiveCategory] = frozenset({
        SensitiveCategory.HEALTH,
        SensitiveCategory.INTIMATE,
        SensitiveCategory.SECURITY,
        SensitiveCategory.IDENTITY_DOCUMENT,
    })
    # Assurance minimale du propriétaire pour consulter chaque niveau.
    owner_min_assurance: dict[Classification, AssuranceLevel] = {
        C.C0_PUBLIC: A.AUTHENTICATED,
        C.C1_SHARED: A.AUTHENTICATED,
        C.C2_CONFIDENTIAL: A.AUTHENTICATED,
        C.C3_PRIVATE: A.STRONG,
        C.C4_SENSITIVE: A.STRONG,
    }
    step_up_max_age_seconds: int = 300
    # Combinaisons de quasi-identifiants dont la réunion révèle une information privée
    # (ex. quartier + horaires réguliers => localisation physique prévisible).
    protected_qi_combinations: tuple[frozenset[str], ...] = (
        frozenset({"qi:neighborhood", "qi:daily_schedule"}),
        frozenset({"qi:children_school", "qi:daily_schedule"}),
        frozenset({"qi:employer", "qi:neighborhood", "qi:vehicle"}),
    )
    # Nombre maximal de quasi-identifiants distincts divulgués à un même interlocuteur.
    max_qi_per_requester: dict[AssuranceLevel, int] = {
        A.CLAIMED: 2,
        A.CHANNEL: 3,
        A.AUTHENTICATED: 5,
        A.STRONG: 8,
        A.STEP_UP: 8,
    }
    # Les sessions anonymes partagent un même budget (résiste à la rotation d'identités).
    pool_anonymous_sessions: bool = True

    def fingerprint(self) -> str:
        """Empreinte stable (indépendante de l'ordre d'itération des ensembles)."""
        blob = json.dumps(_canon(self.model_dump()), sort_keys=True)
        return hashlib.sha256(blob.encode()).hexdigest()[:16]


def _canon(obj):
    if isinstance(obj, dict):
        return {str(getattr(k, "value", k)): _canon(v) for k, v in obj.items()}
    if isinstance(obj, (set, frozenset)):
        return sorted((_canon(x) for x in obj), key=lambda x: json.dumps(x, sort_keys=True))
    if isinstance(obj, (list, tuple)):
        return [_canon(x) for x in obj]
    return getattr(obj, "value", obj)
