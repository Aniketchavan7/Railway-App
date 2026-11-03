import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.cache.redis_client import cache
from app.config import settings
from app.db.base import Base
import app.db.models  # Register all models with Base.metadata
from app.db.session import engine
from app.routers import ai, details, live, pnr, search, system, ws

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system.router)
app.include_router(live.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(details.router, prefix=settings.API_V1_STR)
app.include_router(pnr.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)
