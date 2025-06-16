import struct
import numpy as np
from numba import njit
from processor.model.velodyne_lidar_frame import VelodyneLidarFrame
from processor.constant.velodyne_constant import Vlp16Constant, PuckMRConstant

SENSOR_TYPE_MAP = {
    34: "vlp16",
    40: "puck_mr",
}


# ✅ 2.5단계 최적화: 이중 포문을 Numba로 최적화
@njit
def parse_packet_data(payload_bytes, elevation_table, azimuth_offset_table,
                      use_azimuth_offset, max_lasers, ts_us, head_timestamp, relative_us,
                      azimuths_buffer, elevations_buffer, distances_buffer,
                      intensities_buffer, timestamps_buffer):
    """패킷 데이터 파싱을 Numba로 최적화"""
    point_count = 0
    last_azimuth = -1.0
    frame_boundary_detected = False

    for i in range(12):  # 12 firing blocks
        offset = i * 100

        # 플래그 검사
        if offset + 3 >= len(payload_bytes):
            break
        flag1 = payload_bytes[offset]
        flag2 = payload_bytes[offset + 1]
        if flag1 != 0xff or flag2 != 0xee:
            continue

        # 아지무스 추출 (리틀 엔디안)
        azimuth_raw = payload_bytes[offset + 2] + (payload_bytes[offset + 3] << 8)
        base_azimuth = azimuth_raw / 100.0

        # 프레임 경계 검사 (첫 번째 블록이 아니고 azimuth가 감소하면)
        if i > 0 and last_azimuth > 0 and base_azimuth < last_azimuth:
            frame_boundary_detected = True

        for j in range(32):
            base = offset + 4 + j * 3
            if base + 2 >= len(payload_bytes):
                break

            # 거리와 강도 추출
            dist_raw = payload_bytes[base] + (payload_bytes[base + 1] << 8)
            intensity = payload_bytes[base + 2]

            distance = dist_raw * 0.002
            elevation = elevation_table[j % max_lasers]
            azimuth = base_azimuth

            # 아지무스 오프셋 적용
            if use_azimuth_offset:
                azimuth += azimuth_offset_table[j]

            # 360도 경계 처리
            if azimuth < 0:
                azimuth += 360.0
            elif azimuth >= 360.0:
                azimuth -= 360.0

            sensor_relative_us = ts_us - head_timestamp + relative_us

            # 배열에 직접 할당
            azimuths_buffer[point_count] = azimuth
            elevations_buffer[point_count] = elevation
            distances_buffer[point_count] = distance
            intensities_buffer[point_count] = intensity
            timestamps_buffer[point_count] = sensor_relative_us
            point_count += 1

        last_azimuth = base_azimuth

    return point_count, last_azimuth, frame_boundary_detected


class PcapLidarParser:
    def __init__(self):
        self.sensor_type = None
        self._configured_sensor_type = None  # 캐시
        self.parsed_data_handler = None

        self.elevation_table = None
        self.azimuth_offset_table = None
        self.max_lasers = 0
        self.use_azimuth_offset = False

        self.current_frame = None
        self.last_azimuth = None
        self.head_timestamp = None

        self.packet_buffer_size = 384

        self.azimuths_buffer = np.empty(self.packet_buffer_size, dtype=np.float32)
        self.elevations_buffer = np.empty(self.packet_buffer_size, dtype=np.float32)
        self.distances_buffer = np.empty(self.packet_buffer_size, dtype=np.float32)
        self.intensities_buffer = np.empty(self.packet_buffer_size, dtype=np.uint8)
        self.timestamps_buffer = np.empty(self.packet_buffer_size, dtype=np.int64)

    def set_parsed_data_handler(self, handler):
        self.parsed_data_handler = handler

    def _configure_sensor(self, sensor_type_str):
        if sensor_type_str == self._configured_sensor_type:
            return  # 이미 설정된 경우 skip

        if sensor_type_str == "puck_mr":
            self.elevation_table = np.array(PuckMRConstant.LASER_ELEVATION_ANGLE_TABLE, dtype=np.float32)
            self.azimuth_offset_table = np.array(PuckMRConstant.LASER_AZIMUTH_OFFSET_TABLE, dtype=np.float32)
            self.max_lasers = 32
            self.use_azimuth_offset = True
        else:
            self.elevation_table = np.array(Vlp16Constant.LASER_ELEVATION_ANGLE_TABLE, dtype=np.float32)
            # ✅ None 대신 0으로 채운 배열 (Numba 호환성)
            self.azimuth_offset_table = np.zeros(32, dtype=np.float32)
            self.max_lasers = 16
            self.use_azimuth_offset = False

        self._configured_sensor_type = sensor_type_str

    def parse(self, ts_us: int, relative_us: int, payload: bytes):
        if len(payload) < 1206:
            return

        # ✅ 1. 센서 타입 자동 감지
        if self.sensor_type is None:
            sensor_type_code = struct.unpack_from("<B", payload, 1205)[0]
            sensor_type_str = SENSOR_TYPE_MAP.get(sensor_type_code, "vlp16")
            self._configure_sensor(sensor_type_str)

            # ✅ 2. Dual return 모드 감지 → 차단
            return_mode_code = struct.unpack_from("<B", payload, 1204)[0]
            if return_mode_code == 57:  # DUAL
                raise RuntimeError("Dual Return 모드는 지원하지 않습니다.")

        if self.current_frame is None:
            self.current_frame = VelodyneLidarFrame()
            self.head_timestamp = ts_us

        # ✅ 2.5단계 최적화: Numba로 파싱 루프 최적화
        payload_bytes = np.frombuffer(payload, dtype=np.uint8)

        point_count, packet_last_azimuth, frame_boundary_detected = parse_packet_data(
            payload_bytes,
            self.elevation_table,
            self.azimuth_offset_table,
            self.use_azimuth_offset,
            self.max_lasers,
            ts_us,
            self.head_timestamp,
            relative_us,
            self.azimuths_buffer,
            self.elevations_buffer,
            self.distances_buffer,
            self.intensities_buffer,
            self.timestamps_buffer
        )

        # 프레임 경계 검사 (Python 레벨에서 처리)
        if self.last_azimuth is not None and packet_last_azimuth < self.last_azimuth:
            if self.current_frame.point_count > 0:
                self._flush_current_frame()
                self.current_frame = VelodyneLidarFrame()

        self.last_azimuth = packet_last_azimuth

        # 유효한 포인트만 슬라이싱하여 프레임에 추가
        if point_count > 0:
            self.current_frame.append_data(
                self.azimuths_buffer[:point_count].copy(),
                self.elevations_buffer[:point_count].copy(),
                self.distances_buffer[:point_count].copy(),
                self.intensities_buffer[:point_count].copy(),
                self.timestamps_buffer[point_count - 1]  # 마지막 타임스탬프 사용
            )

    def _flush_current_frame(self):
        if self.parsed_data_handler and self.current_frame and self.current_frame.point_count > 0:
            self.parsed_data_handler(self.current_frame)
