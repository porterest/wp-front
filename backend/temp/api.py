from datetime import datetime, timedelta
from enum import Enum
from typing import Annotated, Optional, List
from uuid import uuid4, UUID
import asyncio


from fastapi import FastAPI, HTTPException, Request, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from requests import CheckProofRequest

# from tonutils.client import TonapiClient
# from tonutils

TON_API_KEY = "AF2YUOUVVZASO7AAAAAHSDOPWPGOF4LOYLDLZDUF7INN3A4IHORBAZAT3N2FHAAOHEGWCLQ"
# api = TonapiClient(api_key=TON_API_KEY)

# Initialize FastAPI app
app = FastAPI()

# TODO: move to main
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://589a-2a12-5940-76ab-00-2.ngrok-free.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*", "ngrok-skip-browser-warning"],
)


# Store active connection status
connections = {}

# SSE Queue to manage events
event_queue = asyncio.Queue()

USER_ID = UUID('2ad27b24-b77c-45d9-9752-4043575c4b5b')


# Utility to generate payload
def generate_payload(ttl: int) -> str:
    payload = bytearray(uuid4().bytes)
    ts = int(datetime.now().timestamp()) + ttl
    payload.extend(ts.to_bytes(8, 'big'))
    return payload.hex()


# Utility to verify payload
def verify_payload_and_signature(
        request: CheckProofRequest
) -> bool:
    """
    Verify the payload structure, expiration, and signature validity.

    Args:
        signed_payload (str): Payload signed by the user's wallet.
        payload_hex (str): The original payload in hexadecimal format.
        wallet_address (str): The user's wallet address.

    Returns:
        bool: True if the payload and signature are valid, False otherwise.
    """
    return True


class DisconnectRequest(BaseModel):
    address: str


# Generate a payload for connection
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


COOKIE_KEY = 'widepiper-token'


# Verify connection payload
@app.post("/auth/verify_payload")
async def verify_proof_payload(
        request: CheckProofRequest,
        response: Response,
):
    try:
        if verify_payload_and_signature(request):
            response.set_cookie(
                key=COOKIE_KEY,
                value="Bearer abc",
                httponly=True,
                secure=True,
                samesite='none',
            )
            return
        else:
            raise HTTPException(status_code=401, detail="Proof check failed. Are you a villain?")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'lol: {str(e)}')


@app.post('/auth/logout')
async def logout(
        response: Response,
):
    response.delete_cookie(COOKIE_KEY)
    return


@app.post('/auth/refresh')
async def refresh(
        response: Response,
        token: str = Cookie(alias=COOKIE_KEY, default=None),
):
    if not token:
        raise HTTPException(status_code=401, detail='Token not provided')
    if token == 'Bearer abc':
        response.set_cookie(COOKIE_KEY, 'Bearer abc')
    else:
        raise HTTPException(status_code=403, detail='Wrong token, fuck you!')


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
async def get_user_info(
        token: str = Cookie(alias=COOKIE_KEY, default=None),
) -> BalanceResponse:
    if not token:
        print('token is none')
        raise HTTPException(status_code=401, detail='Token not provided')
    if token == 'Bearer abc':
        return BalanceResponse(
            balances={
                'TON': 12.1,
                'USDT': 132.4,
            },
            at_risk=1323.7,
        )
    else:
        raise HTTPException(status_code=403, detail='Wrong token, fuck you!')


@app.get('/user/history')
async def get_tx_history(
        token: str = Cookie(alias=COOKIE_KEY, default=None),
) -> UserHistoryResponse:
    if not token:
        print('token is none')
        raise HTTPException(status_code=401, detail='Token not provided')
    if token == 'Bearer abc':
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
    else:
        raise HTTPException(status_code=403, detail='Wrong token, fuck you!')


@app.get('/user/bets')
async def get_user_bets(
        token: str = Cookie(alias=COOKIE_KEY, default=None),
) -> UserBetsResponse:
    if not token:
        print('token is none')
        raise HTTPException(status_code=401, detail='Token not provided')
    if token == 'Bearer abc':
        return UserBetsResponse(
            user_id=USER_ID,
            bets=[
                BetResponse(
                    bet_id=UUID('4063a32b-cd82-4577-a8ff-6ab705c580ea'),
                    amount=4.0,
                    vector=(10.2, 12.2, 1),
                    pair_name='TON/BTC',
                    created_at=datetime.now() - timedelta(hours=1),
                ),
                BetResponse(
                    bet_id=UUID('d692a8f3-4de1-47e9-8a1b-328fa42f2430'),
                    amount=10.2,
                    vector=(2.5, 32.1, 2),
                    pair_name='TON/ETH',
                    created_at=datetime.now() - timedelta(minutes=20, ),
                ),
            ],
        )
    else:
        raise HTTPException(status_code=403, detail='Wrong token, fuck you!')


class PlaceBetRequest(BaseModel):
    pair_id: UUID
    amount: float
    predicted_vector: tuple[float, float]


class CancelBetRequest(BaseModel):
    bet_id: UUID


@app.post('/bet')
async def place_bet(
        place_request: PlaceBetRequest,
        token: str = Cookie(alias=COOKIE_KEY, default=None),
) -> None:
    return


@app.post('/bet/cancel')
async def cancel_bet(
        # bet: PlaceBetRequest,
        token: str = Cookie(alias=COOKIE_KEY, default=None),
) -> None:
    if not token:
        print('token is none')
        raise HTTPException(status_code=401, detail='Token not provided')
    if token == 'Bearer abc':
        return
    else:
        raise HTTPException(status_code=403, detail='Wrong token, fuck you!')


# Mock event generator
async def generate_mock_event():
    """Simulate event generation for testing."""
    while True:
        await asyncio.sleep(600)  # Simulate periodic event generation
        user_bets = UserBetsResponse(
            user_id=USER_ID,
            bets=[
                BetResponse(
                    bet_id=UUID('4063a32b-cd82-4577-a8ff-6ab705c580ea'),
                    amount=4.0,
                    vector=(10.2, 12.2, 1),
                    pair_name='TON/BTC',
                    created_at=datetime.now() - timedelta(hours=1),
                )
            ],
        )
        event_data = {
            "event": "calculation_complete",
            "data": user_bets.model_dump(),
        }
        await event_queue.put(event_data)
        print("Mock event added to the queue.")


@app.get("/events")
async def sse_endpoint():
    """SSE endpoint to stream events to the client."""

    async def event_generator():
        while True:
            try:
                event = await event_queue.get()
                yield f"event: {event['event']}\ndata: {event['data']}\n\n"
            except asyncio.CancelledError:
                break

    return Response(event_generator(), media_type="text/event-stream")


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
