from fastapi import APIRouter

from dependencies.services.deposit import get_deposit_service
from domain.metaholder.responses.deposit_response import DepositResponse

router = APIRouter(
    prefix='/deposit',
    tags=['deposit/'],
)


@router.get('')
async def check_user_deposit() -> list[DepositResponse]:
    deposit_service = get_deposit_service()
    return await deposit_service.check_user_transactions()