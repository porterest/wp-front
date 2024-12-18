import logging

from fastapi import APIRouter, HTTPException

from dependencies.services.auth import get_tonproof_service, get_auth_service
from domain.dto.auth import AuthTokens, Credentials
from domain.tonconnect.requests import CheckProofRequest
from domain.tonconnect.responses import GeneratePayloadResponse
from services.ton.tonconnect.exceptions import InvalidPayloadToken, TonProofVerificationFailed

router = APIRouter(
    prefix='/ton',
)

logger = logging.getLogger(__name__)


@router.get('/payload')
async def generate_payload(

) -> GeneratePayloadResponse:
    tonproof_service = get_tonproof_service()

    try:
        payload = await tonproof_service.generate_payload()
        return GeneratePayloadResponse(
            payload=payload,
        )
    except Exception as e:
        logger.error("There is an error while generating payload ", exc_info=True)
        raise HTTPException(status_code=500, detail="oops") from e


@router.post('/verify-payload')
async def verify_payload(
        verify_payload_request: CheckProofRequest,
) -> AuthTokens:
    tonproof_service = get_tonproof_service()
    auth_service = get_auth_service()

    try:
        await tonproof_service.check_payload(
            request=verify_payload_request,
        )

        tokens = await auth_service.create_token(
            credentials=Credentials(
                payload=verify_payload_request.proof.payload,
                wallet_address=verify_payload_request.address,
            ),
        )
        return tokens
    except TonProofVerificationFailed as e:
        raise HTTPException(status_code=400, detail=f'Invalid proof (backend): {e.status.name}')
    except InvalidPayloadToken:
        raise HTTPException(status_code=400, detail=f'Invalid payload (backend)')
    except Exception:
        logger.error("There is an error during verification or creating a token", exc_info=True)
        raise HTTPException(status_code=500, detail='no')
