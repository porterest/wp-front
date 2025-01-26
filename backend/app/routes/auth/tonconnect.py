import logging

from fastapi import APIRouter, HTTPException
from starlette.responses import JSONResponse

from dependencies.services.auth import get_tonproof_service, get_auth_service
from dependencies.services.user import get_user_service
from domain.dto.auth import Credentials
from domain.metaholder.responses.auth import AuthResponse
from domain.tonconnect.requests import CheckProofRequest
from domain.tonconnect.responses import GeneratePayloadResponse
from services.ton.tonconnect.exceptions import InvalidPayloadToken, TonProofVerificationFailed

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get('/payload')
async def generate_payload(

) -> GeneratePayloadResponse:
    tonproof_service = get_tonproof_service()

    try:
        payload = await tonproof_service.generate_payload()
        logger.error(payload)
        return GeneratePayloadResponse(
            payload=payload,
        )
    except Exception as e:
        logger.error("There is an error while generating payload", exc_info=True)
        raise HTTPException(status_code=500, detail="oops") from e


@router.post('/verify_payload')
async def verify_payload(
        verify_payload_request: CheckProofRequest,
) -> JSONResponse:
    tonproof_service = get_tonproof_service()
    auth_service = get_auth_service()
    user_service = get_user_service()

    try:
        await tonproof_service.check_payload(
            request=verify_payload_request,
        )

        logger.error(verify_payload_request.proof.payload)

        tokens = await auth_service.create_token(
            credentials=Credentials(
                payload=verify_payload_request.proof.payload,
                wallet_address=verify_payload_request.address,
            ),
        )
        user = await user_service.get_user_by_wallet(verify_payload_request.address)
        return AuthResponse(
            accessToken=tokens.access_token.get_secret_value(),
            refreshToken=tokens.refresh_token.get_secret_value(),
            user_id=str(user.id),
            user_name=user.username or 'LOLUSER'
        )

    except TonProofVerificationFailed as e:
        logger.error(verify_payload_request.address)
        raise HTTPException(status_code=400, detail=f'Invalid proof (backend): {e.status.name}')
    except InvalidPayloadToken:
        logger.error(f"payload: {verify_payload_request.proof.payload}", exc_info=True)
        raise HTTPException(status_code=400, detail=f'Invalid payload (backend)', )
    except Exception:
        logger.error("There is an error during verification or creating a token", exc_info=True)
        raise HTTPException(status_code=500, detail='no')
