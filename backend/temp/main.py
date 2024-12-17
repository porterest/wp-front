import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from enum import Enum
from typing import Annotated, Optional, List, AsyncGenerator
from uuid import uuid4, UUID

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi import status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from requests import CheckProofRequest

current_block = 1
block_started_at = datetime.now()

BLOCK_DURATION = 600


class TimeResponse(BaseModel):
    server_time: datetime = datetime.now()
    current_block: int
    remaining_time_in_block: Annotated[int, 'Time in seconds to the next block']
    block_duration_seconds: int = 600


def next_block():
    global CURRENT_BLOCK, BLOCK_STARTED_AT

    CURRENT_BLOCK += 1
    BLOCK_STARTED_AT = datetime.now()


@asynccontextmanager
async def _lifespan(_) -> AsyncGenerator[None, None]:
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        next_block,
        trigger='interval',
        seconds=BLOCK_DURATION,
        max_instances=1,
    )

    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(lifespan=_lifespan)


async def auth_middleware(
        request: Request,
        call_next,
):
    if request.url.path.startswith('/auth'):
        return await call_next(request)

    token = request.headers.get('Authorization', None)
    if not token:
        raise HTTPException(status_code=401, detail='No token provided')

    if token != "Bearer abc":
        raise HTTPException(status_code=403, detail='Token is bullshit')

    return await call_next(request)


app.middleware('http')(auth_middleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    logging.error(f"{request}: {exc_str}")
    content = {'status_code': 422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


# TODO: move to main
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ab328c6h7.duckdns.org", "https://abchaaa.duckdns.org", "https://web.telegram.org"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

USER_ID = UUID('2ad27b24-b77c-45d9-9752-4043575c4b5b')


def generate_payload(ttl: int) -> str:
    payload = bytearray(uuid4().bytes)
    ts = int(datetime.now().timestamp()) + ttl
    payload.extend(ts.to_bytes(8, 'big'))
    return payload.hex()


def verify_payload_and_signature(
        request: CheckProofRequest
) -> bool:
    return True


@app.get("/auth/payload")
async def generate_proof_payload(
        request: Request,
):
    try:
        proof_payload = generate_payload(600)
        print(proof_payload, request.method)
        return {"payload": proof_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/verify_payload")
async def verify_proof_payload(
        request: CheckProofRequest,
):
    try:
        if verify_payload_and_signature(request):
            return {
                "token": "Bearer abc",
            }
        else:
            raise HTTPException(status_code=401, detail="Proof check failed. Are you a villain?")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'lol: {str(e)}')


@app.post('/auth/logout')
async def logout():
    return


@app.post('/auth/refresh')
async def refresh():
    return {
        'token': 'Bearer abc',
    }


class BalanceResponse(BaseModel):
    balances: dict[
        Annotated[str, 'Token name'],
        Annotated[float, 'User balance'],
    ]
    # total_balance: Annotated[float, 'Total user balance in USDT equivalent']
    at_risk: Annotated[float, 'Total user bets amount']


class BetResponse(BaseModel):
    bet_id: UUID
    amount: float
    vector: tuple[float, float]  # TODO: consider!
    pair_name: str
    created_at: datetime


class UserBetsResponse(BaseModel):
    user_id: UUID
    bets: List[BetResponse]


class TransactionType(Enum):
    INTERNAL_DEPOSIT = "internal_deposit"  # bet closing
    EXTERNAL_DEPOSIT = "external_deposit"  # deposit from external wallet
    INTERNAL_WITHDRAWAL = "internal_withdrawal"  # bet creation
    EXTERNAL_WITHDRAWAL = "external_withdrawal"  # withdraw to external wallet
    REWARD = "reward"  # reward for being involved in round


class TransactionResponse(BaseModel):
    type: TransactionType
    sender: str
    recipient: str
    amount: float

    tx_id: Optional[str] = None  # would be presented if type is external deposit/withdraw


class UserHistoryResponse(BaseModel):
    user_id: UUID
    transactions: List[TransactionResponse]


@app.get('/user/balances')
async def get_user_info() -> BalanceResponse:
    return BalanceResponse(
        balances={
            'TON': 12.1,
            'USDT': 132.4,
        },
        at_risk=1323.7,
    )


@app.get('/user/history')
async def get_tx_history() -> UserHistoryResponse:
    return UserHistoryResponse(
        user_id=USER_ID,
        transactions=[
            TransactionResponse(
                type=TransactionType.EXTERNAL_DEPOSIT,
                sender='you',
                recipient='app',
                amount=10.2,
                tx_id='very-long-tx-id-string',
            ),
            TransactionResponse(
                type=TransactionType.INTERNAL_WITHDRAWAL,
                sender='you',
                recipient='app',
                amount=4,
            ),
            TransactionResponse(
                type=TransactionType.INTERNAL_DEPOSIT,
                sender='app',
                recipient='you',
                amount=6,
            ),
        ],
    )


bets = UserBetsResponse(
    user_id=USER_ID,
    bets=[
        BetResponse(
            bet_id=UUID('4063a32b-cd82-4577-a8ff-6ab705c580ea'),
            amount=4.0,
            vector=(10.2, 12.2),
            pair_name='TON/BTC',
            created_at=datetime.now() - timedelta(hours=1),
        ),
        BetResponse(
            bet_id=UUID('d692a8f3-4de1-47e9-8a1b-328fa42f2430'),
            amount=10.2,
            vector=(2.5, 32.1),
            pair_name='TON/ETH',
            created_at=datetime.now() - timedelta(minutes=20, ),
        ),
    ],
)


@app.get('/user/bets')
async def get_user_bets() -> UserBetsResponse:
    return bets


class PlaceBetRequest(BaseModel):
    pair_id: UUID
    amount: float
    predicted_vector: tuple[float, float]


class CancelBetRequest(BaseModel):
    bet_id: UUID


class PairResponse(BaseModel):
    pair_id: UUID
    name: str


pairs = [
    PairResponse(
        pair_id=UUID('10fb4f3f-a2ed-4e2e-8127-10d3df9914b5'),
        name='TON/BTC',
    ),
    PairResponse(
        pair_id=UUID('4b30e509-9715-4432-a132-80c49bfe87bb'),
        name='TON/ETH',
    ),
]


@app.post('/bet')
async def place_bet(
        place_request: PlaceBetRequest, ) -> None:
    pair = list(filter(lambda x: x.pair_id == place_request.pair_id, pairs))[0]
    bets.bets.append(
        BetResponse(
            bet_id=uuid4(),
            amount=place_request.amount,
            vector=place_request.predicted_vector,
            pair_name=pair.name,
            created_at=datetime.now(),
        )
    )


@app.post('/bet/cancel')
async def cancel_bet(
        req: CancelBetRequest, ) -> None:
    bet = filter(lambda x: x.bet_id == req.bet_id, bets.bets)
    bets.bets.remove(bet)
    return


@app.get('/pairs')
async def get_pairs() -> list[PairResponse]:
    return pairs


@app.get('/time')
async def get_time():
    return TimeResponse(
        server_time=datetime.now(),
        block_duration_seconds=BLOCK_DURATION,
        current_block=current_block,
        remaining_time_in_block=(
                (block_started_at + timedelta(seconds=BLOCK_DURATION)) - datetime.now()
        ).seconds,  # cache for 1 second i guess
    )


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
