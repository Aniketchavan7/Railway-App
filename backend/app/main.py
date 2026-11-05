import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.cache.redis_client import cache
from app.config import settings
from app.db.base import Base
import app.db.models  # Register all models with Base.metadata
from app.db.session import engine
from app.routers import ai, alerts, details, live, pnr, search, system, ws

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("railpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RailPulse Backend Services...")
    # Initialize DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")

    # Initialize Cache
    await cache.initialize()
    logger.info("Cache layer initialized successfully.")

    yield

    logger.info("Shutting down RailPulse Backend Services...")
    await cache.close()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RailPulse — AI-Powered Indian Railway Tracking SaaS Engine",
    lifespan=lifespan,
)

# CORS Middleware
cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://railpulse.pages.dev",
    "https://railpulse-01i.pages.dev",
]
for origin in settings.CORS_ORIGINS:
    if "*" not in origin and origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else cors_origins,
    allow_origin_regex=r"^https://.*\.pages\.dev$" if settings.ENVIRONMENT != "development" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # The default handler echoes the rejected input, and crashes when that is infinity or NaN.
    detail = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/")
async def root():
    return {"message": "RailPulse API is online", "status": "OK"}

# Include Routers with /api/v1 and /v1 aliases
app.include_router(system.router)

for pfx in [settings.API_V1_STR, "/v1"]:
    app.include_router(live.router, prefix=f"{pfx}/trains")
    app.include_router(live.router, prefix=f"{pfx}/train")
    app.include_router(details.router, prefix=f"{pfx}/trains")
    app.include_router(details.router, prefix=f"{pfx}/train")
    app.include_router(search.router, prefix=pfx)
    app.include_router(pnr.router, prefix=f"{pfx}/pnr")
    app.include_router(alerts.router, prefix=pfx)
    app.include_router(ai.router, prefix=pfx)

app.include_router(ws.router)
