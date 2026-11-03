import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    saved_trains = relationship("SavedTrain", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")


class SavedTrain(Base):
    __tablename__ = "saved_trains"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    train_number = Column(String(10), nullable=False, index=True)
    train_name = Column(String(255), nullable=True)
    nickname = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="saved_trains")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    search_type = Column(String(50), nullable=False)  # train, station
    search_query = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="search_history")


class TrainObservation(Base):
    __tablename__ = "train_observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    train_number = Column(String(10), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    location_type = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    delay = Column(Integer, default=0)
    current_station = Column(String(100), nullable=True)
    observed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    fetched_at = Column(DateTime(timezone=True), default=utc_now)
    freshness = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    is_simulated = Column(Boolean, default=False)


class ProviderMetric(Base):
    __tablename__ = "provider_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_name = Column(String(50), nullable=False, index=True)
    capability = Column(String(50), nullable=False)
    response_time_ms = Column(Float, nullable=False)
    success = Column(Boolean, nullable=False)
    error_code = Column(String(50), nullable=True)
    recorded_at = Column(DateTime(timezone=True), default=utc_now, index=True)


class SubscriptionUsage(Base):
    __tablename__ = "subscription_usage"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    plan = Column(String(50), default="free")
    monthly_quota = Column(Integer, default=500)
    current_usage = Column(Integer, default=0)
    reset_date = Column(DateTime(timezone=True), default=utc_now)
    status = Column(String(50), default="active")
