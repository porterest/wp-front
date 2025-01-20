from abstractions.services.currency import CurrencyServiceInterface
from services.CurrencyService import CurrencyService


def get_currency_service() -> CurrencyServiceInterface:
    return CurrencyService()