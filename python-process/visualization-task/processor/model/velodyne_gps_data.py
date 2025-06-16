from datetime import datetime
from enum import Enum


class PpsStatus(Enum):
    NO_PPS = "0"
    SYNCING = "1"
    LOCKED = "2"
    ERROR = "3"


class VelodyneGPSData:
    def __init__(self):
        self.timestamp: int = 0  # 상대 시간(us)
        self.utc_time: datetime = None

        self.latitude_deg: float = 0.0
        self.latitude_arc_min: float = 0.0
        self.latitude_direction: str = "N"  # or "S"

        self.longitude_deg: float = 0.0
        self.longitude_arc_min: float = 0.0
        self.longitude_direction: str = "E"  # or "W"

        self.speed: float = 0.0  # knots
        self.moving_direction: float = 0.0  # degrees
        self.magnetic_variation: float = 0.0
        self.magnetic_variation_direction: str = ""

        self.pps_status: str = "0"  # raw string
        # Optional: enum 변환
        # self.pps_status_enum = PpsStatus(self.pps_status)

    @property
    def latitude(self) -> float:
        value = self.latitude_deg + self.latitude_arc_min / 60
        return -value if self.latitude_direction == "S" else value

    @property
    def longitude(self) -> float:
        value = self.longitude_deg + self.longitude_arc_min / 60
        return -value if self.longitude_direction == "W" else value

    def to_dict(self) -> dict:
        return {
            "timestamp_us": self.timestamp,
            "utc_time": self.utc_time.isoformat() if self.utc_time else None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "speed_knots": self.speed,
            "direction_deg": self.moving_direction,
            "pps_status": self.pps_status,
            "magnetic_variation": self.magnetic_variation,
            "magnetic_variation_dir": self.magnetic_variation_direction
        }

    def __repr__(self):
        return f"<VelodyneGPSData {self.timestamp}us @ {self.latitude:.6f}, {self.longitude:.6f}>"
