from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum
from datetime import datetime

class SystemType(str, Enum):
    POWER = "P"
    LIGHTING = "L"
    CONTROL = "C"
    FIRE = "F"
    NAVIGATION = "N"
    AUTOMATION = "A"
    SIGNAL = "S"
    UNKNOWN = "U"

class CableBase(BaseModel):
    cable_name: str = Field(..., description="Unique Circuit Identifier (e.g., P2811)")
    cable_type: str = Field(..., description="Normalized Cable Specification (e.g., DPYC-2.5)")
    from_room: str = Field("", description="Origin Compartment")
    from_equip: str = Field("", description="Origin Equipment")
    to_room: str = Field("", description="Destination Compartment")
    to_equip: str = Field("", description="Destination Equipment")
    length: Optional[float] = Field(None, description="Physical Length (m)")

    @validator('cable_name')
    def validate_name(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Cable name must be at least 3 characters')
        return v.upper()

class ExtractedCable(CableBase):
    page_number: int
    raw_text: str
    confidence_score: float = Field(1.0, ge=0.0, le=1.0)

    def to_frontend_format(self, system_code: str = "") -> dict:
        """
        Converts to the frontend 'Cable' interface format found in types.ts
        """
        return {
            "id": self.cable_name, # Use name as ID for now
            "name": self.cable_name,
            "type": self.cable_type,
            "od": 0, # Default, will be filled by CableType lookup in frontend
            "length": 0, # Default
            "system": system_code or self.cable_name[0],
            "fromDeck": "", # TODO: Map room to deck
            "fromNode": "",
            "fromRoom": self.from_room,
            "toDeck": "",
            "toNode": "",
            "toRoom": self.to_room,
            "page": str(self.page_number)
        }
    
class ExtractionSummary(BaseModel):
    total_count: int
    system_distribution: dict
    potential_misses: List[str]
    processing_time_ms: float
    timestamp: datetime = Field(default_factory=datetime.now)
    ship_metadata: dict = Field(default_factory=dict, description="Extracted Ship Info (Hull No, Type)")
    cables: List[ExtractedCable] = Field(default_factory=list, description="List of extracted cables")

class ParseRequest(BaseModel):
    file_path: str
    revision: str = "R0"
