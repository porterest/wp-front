from pathlib import Path
from typing import Type, Tuple

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict, PydanticBaseSettingsSource, JsonConfigSettingsSource


class DBSettings(BaseSettings):
    host: str
    port: int
    name: str
    user: str
    password: SecretStr

    @property
    def url(self):
        return f"postgresql+asyncpg://{self.user}:{self.password.get_secret_value()}@{self.host}:{self.port}/{self.name}"


class TonConnectSettings(BaseSettings):
    payload_ttl: int
    allowed_domains: list[str]


class TonSettings(BaseSettings):
    tonconnect: TonConnectSettings
    tonapi_key: SecretStr


class JwtSettings(BaseSettings):
    secret_key: SecretStr
    issuer: str
    audience: str
    access_expire: int
    refresh_expire: int


class VaultSettings(BaseSettings):
    host: str
    port: int
    token: SecretStr


class InnerTokenSettings(BaseSettings):
    symbol: str
    minter_address: str  # = Field


class SecretsSettings(BaseSettings):
    expected_path: str
    expected_key: str


class Settings(BaseSettings):
    db: DBSettings
    jwt: JwtSettings
    ton: TonSettings
    vault: VaultSettings
    allowed_domains: list[str]
    inner_token: InnerTokenSettings
    secrets: SecretsSettings

    debug: bool = True

    model_config = SettingsConfigDict(
        extra='ignore',
        json_file=Path(__file__).parent / 'settings.json',
        json_file_encoding='utf-8',
    )

    @classmethod
    def settings_customise_sources(
            cls,
            settings_cls: Type[BaseSettings],
            init_settings: PydanticBaseSettingsSource,
            env_settings: PydanticBaseSettingsSource,
            dotenv_settings: PydanticBaseSettingsSource,
            file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return (JsonConfigSettingsSource(settings_cls),)


settings = Settings()
