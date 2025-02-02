from abstractions.services.tonclient import TonClientInterface
from services.ton.client.api import TonApiClient
from services.ton.client.lib import TonTonLibClient
from services.ton.client.main_client import MainTonClient
from settings import settings


def get_api_client() -> TonApiClient:
    return TonApiClient(
        token=settings.ton.tonapi_key,
    )


def get_lib_client() -> TonTonLibClient:
    return TonTonLibClient(
        inner_token=settings.inner_token,
    )


def get_ton_client() -> TonClientInterface:
    return MainTonClient(  # todo: mock
        ton_client=get_lib_client(),
        ton_api_client=get_api_client(),
    )
