from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
import uuid, datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)
    is_active = Column(Boolean, default=True)

class Pond(Base):
    __tablename__ = "ponds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    location = Column(String)

class WaterLog(Base):
    __tablename__ = "water_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("ponds.id"))
    temperature = Column(Float)
    ph = Column(Float)
    dissolved_oxygen = Column(Float)
    ammonia = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
