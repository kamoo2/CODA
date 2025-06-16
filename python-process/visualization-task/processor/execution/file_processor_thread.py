# visualization/processor/file_processor_thread.py
import threading
import numpy as np
import time
import logging
from typing import Callable
from processor.reader.pcap_reader import PcapReader
from processor.parser.pcap_gps_parser import PcapGpsParser  # 확장 가능
from processor.parser.pcap_lidar_parser import PcapLidarParser  # 확장 가능
from processor.parser.video_parser import VideoParser
from processor.model.velodyne_gps_data import VelodyneGPSData
from processor.enums.data_type_enum import ParserType, DataType
from processor.reader.video_reader import VideoReader
from processor.reader.riff_reader import RiffReader
from processor.parser.riff_parser import RiffParser
from processor.util.colormap_util import process_lidar_points_batch

# --- Logger 설정 ---
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("FileThread")


DEG2RAD = np.float32(np.pi / 180.0)  # ✅ 상수로 한 번만 계산


def resolve_parser_class(name: str) -> Callable:
    return {
        ParserType.PCAP_GPS.value: PcapGpsParser,
        ParserType.PCAP_LIDAR.value: PcapLidarParser,
        ParserType.VIDEO.value: VideoParser,
        ParserType.RIFF.value: RiffParser
    }.get(name) or (lambda: (_ for _ in ()).throw(ValueError(f"Unsupported parser name: {name}")))


class FileProcessorThread(threading.Thread):
    def __init__(
            self,
            server_url: str,
            file_path: str,
            parser_name: str,
            entity_name: str,
            dbc_file_path: str,
            selected_signals,
            user_project_key: str,
            queue,
            barrier,
            segment_duration_us: int,
            relative_us: int,
            credential
    ):
        super().__init__(daemon=True)
        self.server_url = server_url
        self.file_path = file_path
        self.parser_name = parser_name
        self.entity_name = entity_name
        self.dbc_file_path = dbc_file_path
        self.selected_signals = selected_signals
        self.user_project_key = user_project_key
        self.queue = queue
        self.barrier = barrier
        self.segment_duration_us = segment_duration_us
        self.segment_index = 0
        self.relative_us = relative_us
        self.credential = credential

        self.parser = resolve_parser_class(parser_name)()
        self._init_reader_and_parser()

    def _log(self, message):
        logger.info(f"[{self.user_project_key}] [{self.entity_name}] {message}")

    def _init_reader_and_parser(self):
        if self.parser_name == ParserType.PCAP_GPS.value:
            self.reader = PcapReader(self.file_path, self.relative_us, self.credential)
            self.reader.set_data_handler(self.parser.parse)
            self.parser.set_parsed_data_handler(self._handle_gps_data)

        elif self.parser_name == ParserType.PCAP_LIDAR.value:
            self.reader = PcapReader(self.file_path, self.relative_us, self.credential)
            self.reader.set_data_handler(self.parser.parse)
            self.parser.set_parsed_data_handler(self._handle_lidar_data)

        elif self.parser_name == ParserType.VIDEO.value:
            self.reader = VideoReader(self.file_path, self.relative_us, self.credential)
            self.reader.set_data_handler(self.parser.parse)
            self.parser.set_parsed_data_handler(self._handle_video_data)

        elif self.parser_name == ParserType.RIFF.value:
            self.reader = RiffReader(self.server_url,self.file_path, self.dbc_file_path, self.selected_signals, self.relative_us,
                                     self.credential)
            self.reader.set_data_handler(self.parser.parse)
            self.parser.set_parsed_data_handler(self._handle_signal_data)

    def run(self):
        self._log("📂 파일 처리 시작")
        self.barrier.register(self.entity_name)

        start = time.time()
        self.reader.read()  # 전체 읽기 → parser 통해 처리
        elapsed = (time.time() - start) * 1000

        self._log(f"✅ 전체 파일 처리 완료: ⏱ {elapsed:.2f}ms")
        self.barrier.deregister(self.entity_name)
        self.queue.put("STOP")

    def _wait_if_needed(self, timestamp):
        while timestamp > (self.segment_index + 1) * self.segment_duration_us:
            self._log(f"⏸ Segment {self.segment_index} 도달 → 동기화 대기")
            self.barrier.wait(self.entity_name)
            self.segment_index += 1
            self._log(f"▶ Segment {self.segment_index} 통과 → 로깅 계속")

    def _handle_gps_data(self, gps: VelodyneGPSData):
        timestamp = gps.timestamp
        self._wait_if_needed(timestamp)

        lat = gps.latitude_deg + gps.latitude_arc_min / 60
        lon = gps.longitude_deg + gps.longitude_arc_min / 60

        self.queue.put({
            "type": DataType.GPS,
            "timestamp": timestamp,
            "entity_name": self.entity_name,
            "latitude": lat,
            "longitude": lon
        })

    # ✅ _handle_lidar_data 메서드 최적화
    def _handle_lidar_data(self, lidar):
        timestamp = lidar.timestamp
        self._wait_if_needed(timestamp)

        # ✅ 1단계 최적화: 유효한 데이터만 가져오기 (리스트 변환 없음)
        azimuths, elevations, distances, intensities = lidar.get_valid_data()

        # ✅ 2단계 최적화: 배치 처리로 좌표 변환과 컬러 매핑을 한 번에
        positions, colors = process_lidar_points_batch(azimuths, elevations, distances, intensities)

        self.queue.put({
            "type": DataType.LIDAR,
            "timestamp": timestamp,
            "entity_name": self.entity_name,
            "positions": positions,
            "colors": colors
        })

    def _handle_video_data(self, timestamp: int, jpeg_bytes: bytes):
        self._wait_if_needed(timestamp)
        self.queue.put({
            "type": DataType.VIDEO,
            "timestamp": timestamp,
            "entity_name": self.entity_name,
            "jpeg_bytes": jpeg_bytes
        })

    def _handle_signal_data(self, timestamp: int, signal_name: str, value):
        self._wait_if_needed(timestamp)
        self.queue.put({
            "type": DataType.RIFF,
            "timestamp": timestamp,
            "entity_name": self.entity_name,
            "signal_name": signal_name,
            "value": value
        })
