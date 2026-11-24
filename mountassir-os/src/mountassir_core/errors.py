"""Error hierarchy. Every error carries a stable machine-readable ``code``.

Messages must never contain memory content: they end up in the audit log.
"""


class CoreError(Exception):
    code = "core_error"


class PermissionDenied(CoreError):
    code = "permission_denied"


class QuotaExceeded(PermissionDenied):
    code = "quota_exceeded"


class NotFound(CoreError):
    code = "not_found"


class ValidationError(CoreError):
    code = "validation_error"


class SystemStopped(CoreError):
    code = "system_stopped"


class BackupError(CoreError):
    code = "backup_error"


class NotInitialized(CoreError):
    code = "not_initialized"
