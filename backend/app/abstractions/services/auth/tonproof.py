from abc import ABC, abstractmethod

from domain.tonconnect.enums import VerifyResult
from domain.tonconnect.requests import CheckProofRequest
from domain.tonconnect.responses import GeneratePayloadResponse


class TonProofServiceInterface(ABC):
    @abstractmethod
    async def generate_payload(self) -> GeneratePayloadResponse:
        ...

    @abstractmethod
    async def check_payload(self, request: CheckProofRequest):
        # raises TonProofVerificationFailed with appropriate status if failed
        ...
