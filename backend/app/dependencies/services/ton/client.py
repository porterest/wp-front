from abstractions.services.tonclient import TonClientInterface
from services.ton.client.api import MockTonApiClient
# from services.ton.client.api import TonApiClient
from settings import settings


def get_ton_client() -> TonClientInterface:
    return MockTonApiClient(  # todo: mock
        token=settings.ton.tonapi_key,
    )
