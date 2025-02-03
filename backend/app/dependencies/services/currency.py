from abstractions.services.currency import CurrencyServiceInterface
from dependencies.services.inner_token import get_inner_token_service
from services.CurrencyService import CurrencyService


def get_currency_service() -> CurrencyServiceInterface:
    return CurrencyService(
        inner_token_service=get_inner_token_service(),
    )
