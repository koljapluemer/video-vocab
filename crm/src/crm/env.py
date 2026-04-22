from __future__ import annotations

from dotenv import dotenv_values

from crm.paths import CRM_ENV_FILE


def get_required_env_var(name: str) -> str:
    values = dotenv_values(CRM_ENV_FILE)
    value = values.get(name)
    if not value:
        raise RuntimeError(f"{name} is not set in {CRM_ENV_FILE}")
    return value
