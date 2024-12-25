from fastapi import APIRouter, Request

from dependencies.services.deposit import get_deposit_service
from routes.helpers import get_user_id_from_request

router = APIRouter(
    prefix='/deposit',
    tags=['deposit/'],
)


@router.get('')
async def check_user_deposit(
        request: Request,
) -> None:
    user_id = get_user_id_from_request(request)

    deposit_service = get_deposit_service()

    await deposit_service.start_deposit_process()
