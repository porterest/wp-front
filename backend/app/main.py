from fastapi import FastAPI

from middlewares import check_for_auth

app = FastAPI()

# FastAPI.middleware is a decorator to add function-based middlewares,
# but I guess it's quite ugly in terms of architecture - outers shouldn't be coupled with inners (right?)
app.middleware('http')(check_for_auth)
