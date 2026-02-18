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
from sqlalchemy import Table, Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import registry, relationship
from datetime import datetime

mapper_registry = registry()
metadata = mapper_registry.metadata

pond_table = Table(
    "ponds",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String, nullable=False),
    Column("shape", String),
    Column("area", Float),
    Column("depth", Float),
    Column("created_at", DateTime, default=datetime.utcnow),
)

water_table = Table(
    "water_readings",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("pond_id", Integer, ForeignKey("ponds.id"), index=True),
    Column("ph", Float),
    Column("do", Float),
    Column("temperature", Float),
    Column("salinity", Float),
    Column("nh3", Float),
    Column("timestamp", DateTime, default=datetime.utcnow),
)

disease_log_table = Table(
    "disease_logs",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("pond_id", Integer, ForeignKey("ponds.id"), index=True),
    Column("predictions", JSON),
    Column("overall", String),
    Column("created_at", DateTime, default=datetime.utcnow),
)

feed_log_table = Table(
    "feed_logs",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("pond_id", Integer, ForeignKey("ponds.id"), index=True),
    Column("amount_kg", Float),
    Column("time", DateTime, default=datetime.utcnow),
    Column("notes", Text),
)

simulation_table = Table(
    "simulations",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("pond_id", Integer, ForeignKey("ponds.id"), index=True),
    Column("params", JSON),
    Column("results", JSON),
    Column("created_at", DateTime, default=datetime.utcnow),
)

# Lightweight ORM classes for easier use
class Pond:
    def __init__(self, name, shape, area, depth, created_at=None):
        self.name = name
        self.shape = shape
        self.area = area
        self.depth = depth
        self.created_at = created_at

class WaterReading:
    def __init__(self, pond_id, ph=None, do=None, temperature=None, salinity=None, nh3=None, timestamp=None):
        self.pond_id = pond_id
        self.ph = ph
        self.do = do
        self.temperature = temperature
        self.salinity = salinity
        self.nh3 = nh3
        self.timestamp = timestamp

class DiseaseLog:
    def __init__(self, pond_id, predictions, overall, created_at=None):
        self.pond_id = pond_id
        self.predictions = predictions
        self.overall = overall
        self.created_at = created_at

class FeedLog:
    def __init__(self, pond_id, amount_kg, time=None, notes=None):
        self.pond_id = pond_id
        self.amount_kg = amount_kg
        self.time = time
        self.notes = notes

class SimulationRun:
    def __init__(self, pond_id, params, results, created_at=None):
        self.pond_id = pond_id
        self.params = params
        self.results = results
        self.created_at = created_at

mapper_registry.map_imperatively(Pond, pond_table)
mapper_registry.map_imperatively(WaterReading, water_table)
mapper_registry.map_imperatively(DiseaseLog, disease_log_table)
mapper_registry.map_imperatively(FeedLog, feed_log_table)
mapper_registry.map_imperatively(SimulationRun, simulation_table)
