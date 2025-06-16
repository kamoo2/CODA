import re
import math
from datetime import datetime
from processor.model.velodyne_gps_data import VelodyneGPSData


class PcapGpsParser:
    def __init__(self):
        self.parsed_data_handler = None
        self.prev_data = None
        self.head_gps_timestamp_us = 0

        # RMC 문장 패턴: $GNRMC,...*hh
        self.rmc_pattern = re.compile(br"\$(..RMC,[^*]*\*[0-9A-Fa-f]{2})")

    def set_parsed_data_handler(self, handler):
        self.parsed_data_handler = handler

    def parse(self, ts_us: int,relative_us:int, payload: bytes):
        if self.head_gps_timestamp_us == 0:
            self.head_gps_timestamp_us = ts_us

        match = self.rmc_pattern.search(payload)

        if not match:
            print("[GPS Parser] No RMC sentence found")
            return

        rmc_bytes = match.group(1)
        try:
            rmc_str = rmc_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            print("[GPS Parser] ❌ RMC decode failed")
            return

        if not rmc_str.startswith("G"):
            print(f"[GPS Parser] ⚠️ Skipping malformed RMC: {rmc_str}")
            return

        fields = rmc_str.split(",")

        try:
            lat_deg, lat_min = self._parse_dmm(fields[3])
            lon_deg, lon_min = self._parse_dmm(fields[5])
            time_str = fields[1].split(".")[0]
            date_str = fields[9]
            parsed_time = datetime.strptime(date_str + time_str, "%d%m%y%H%M%S")
        except Exception as e:
            print(f"[GPS Parser] ❌ Field parse error: {e}")
            return

        if ts_us - self.head_gps_timestamp_us + relative_us < 0:
            return

        gps = VelodyneGPSData()
        gps.timestamp = ts_us - self.head_gps_timestamp_us + relative_us
        gps.utc_time = parsed_time
        gps.latitude_deg = -lat_deg if fields[4] == "S" else lat_deg
        gps.latitude_arc_min = lat_min
        gps.latitude_direction = fields[4]
        gps.longitude_deg = -lon_deg if fields[6] == "W" else lon_deg
        gps.longitude_arc_min = lon_min
        gps.longitude_direction = fields[6]
        gps.speed = float(fields[7]) if fields[7] else 0.0
        gps.moving_direction = float(fields[8]) if fields[8] else 0.0
        gps.magnetic_variation = float(fields[10]) if fields[10] else 0.0
        gps.magnetic_variation_direction = fields[11] if len(fields) > 11 else ""

        # 상태 필드 (PPS status 등) → payload에서 직접 파싱
        if len(payload) > 192:
            gps.pps_status = str(payload[192])  # 예시, 필요 시 enum 매핑

        # 중복 제거
        if self.prev_data is None or \
           self.prev_data.latitude_deg != gps.latitude_deg or \
           self.prev_data.longitude_deg != gps.longitude_deg or \
           self.prev_data.latitude_arc_min != gps.latitude_arc_min or \
           self.prev_data.longitude_arc_min != gps.longitude_arc_min:

            if self.parsed_data_handler:
                self.parsed_data_handler(gps)

            self.prev_data = gps

    def _parse_dmm(self, dmm_str):
        if not dmm_str or '.' not in dmm_str:
            return float('nan'), float('nan')
        try:
            dot_index = dmm_str.index('.')
            deg = float(dmm_str[:dot_index - 2])
            minutes = float(dmm_str[dot_index - 2:])
            return deg, minutes
        except Exception:
            return float('nan'), float('nan')
