
from pydantic import BaseModel

class Instrument(BaseModel):
    instrument_code: str
    name: str
    type_id: int
    supplier_id: int
    location: str
    status: str = "Active"
    
class Calibration(BaseModel):
    asset_id: int
    calibration_date: str
    frequency_months: int
    result: str

class Certificate(BaseModel):
    asset_id: int
    certificate_number: str
    file_path: str = ""
class WorkOrder(BaseModel):
    asset_id: int
    description: str


class ImpactAssessment(BaseModel):
    calibration_event_id: int
    findings: str
    action_taken: str