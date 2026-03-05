"""Services package for rule-based models and storage"""

from .pond_service import (
    get_pond_by_id,
    compute_water_score,
    compute_disease_probability,
    compute_feed_efficiency,
)

# new multimodal services
from .fusion_engine import compute_fusion, FusionResult
from .suggestion_engine import generate_digital_twin, generate_suggestions, Suggestion
from .farmer_summary import compute_farmer_summary

