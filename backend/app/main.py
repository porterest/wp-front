from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from dependencies.services.chain import get_chain_service
from middlewares import check_for_auth
from routes import (
    bet_router,
    block_router,
    pair_router,
    user_router,
    chain_router,
    deposit_router,
)
from settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    chain = get_chain_service()
    await chain.start_block_generation()

    yield

    chain.stop_block_generation()


app = FastAPI(lifespan=lifespan)

# FastAPI.middleware is a decorator to add function-based middlewares,
# but I guess it's quite ugly in terms of architecture - outers shouldn't be coupled with inners (right?)
app.middleware('http')(check_for_auth)

app.include_router(bet_router)
app.include_router(block_router)
app.include_router(pair_router)
app.include_router(user_router)
app.include_router(chain_router)
app.include_router(deposit_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_domains,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="WP Metaholder API",
        version="0.1.0",
        description="meow",
        routes=app.routes,
    )
    # Define the security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    # Apply the security scheme globally (optional, just for Swagger)
    openapi_schema["security"] = [{"bearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Assign custom OpenAPI schema
app.openapi = custom_openapi

# if __name__ == '__main__':
#     import uvicorn
#
#     uvicorn.run(app, host="0.0.0.0", port=8000)
