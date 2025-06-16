from typing import Callable
from dataclasses import dataclass
import struct
import cantools
import time
from processor.util.s3_util import open_s3_stream


@dataclass
class OptimizedGeneralSignalData:
    """최적화된 신호 데이터 (필수 필드만)"""
    message_id: int
    time_delta: int
    payload: bytes


class RiffReader:
    def __init__(self, server_url: str, riff_path: str, dbc_file_path: str, selected_signals, relative_us, credential):
        self.server_url = server_url
        self.riff_path = riff_path
        self.relative_us = relative_us
        self.credential = credential
        self.packet_handler: Callable[[int, str, float], None] = None

        # ✅ 최적화 1: DBC 파일 한 번만 로드 + 메시지 맵 캐싱
        print("DBC 파일 로딩 중...")
        self.db = cantools.db.load_file(dbc_file_path)
        self.message_map = {msg.frame_id: msg for msg in self.db.messages}

        # ✅ 최적화 2: allowed_signals를 딕셔너리로 변환 (O(1) 검색)
        self.allowed_signals_dict = {}
        for sel in selected_signals:
            msg_name = sel["message_name"]
            for sig_name in sel["signal_names"]:
                key = (msg_name, sig_name)
                self.allowed_signals_dict[key] = True

        # ✅ 최적화 3: 관심 있는 메시지 ID만 필터링
        self.target_message_ids = set()
        for sel in selected_signals:
            msg_name = sel["message_name"]
            for msg in self.db.messages:
                if msg.name == msg_name:
                    self.target_message_ids.add(msg.frame_id)
                    break

        print(f"RIFF 최적화 설정:")
        print(f"  - 관심 메시지 ID: {len(self.target_message_ids)}개")
        print(f"  - 관심 신호: {len(self.allowed_signals_dict)}개")

        # ✅ 최적화 4: 신호별 100ms 제한
        self.signal_last_logged = {}  # {signal_name: timestamp_us}
        self.throttle_interval_us = 100_000  # 100ms

        # ✅ 최적화 5: 배치 처리를 위한 버퍼
        self.signal_batch = []
        self.batch_size = 100
        self.last_flush_time = time.time()
        self.flush_interval = 0.1  # 100ms

        # ✅ 최적화 6: 헤더 정보 캐싱
        self.timestamp_offset = 0
        self.crc16_checksum = 0

        # 성능 통계
        self.total_messages_read = 0
        self.target_messages_found = 0
        self.signals_received = 0
        self.signals_logged = 0
        self.signals_throttled = 0

    def read(self):
        """완전 최적화된 RIFF 읽기"""
        start_time = time.time()

        with open_s3_stream(self.riff_path, self.credential) as f:
            # 헤더 읽기
            self._read_header_optimized(f)

            first_timestamp_us = None

            # ✅ 최적화된 메인 루프
            while True:
                signal_data = self._read_signal_data_fast(f)
                if signal_data is None:
                    break

                self.total_messages_read += 1

                # ✅ 관심 없는 메시지 ID는 즉시 스킵
                if signal_data.message_id not in self.target_message_ids:
                    continue

                self.target_messages_found += 1

                timestamp_us = self.timestamp_offset + signal_data.time_delta
                if first_timestamp_us is None:
                    first_timestamp_us = timestamp_us

                sensor_relative_us = timestamp_us - first_timestamp_us + self.relative_us

                # ✅ 배치에 추가
                self.signal_batch.append((sensor_relative_us, signal_data))

                # 배치 처리 조건 체크
                if (len(self.signal_batch) >= self.batch_size or
                        time.time() - self.last_flush_time > self.flush_interval):
                    self._process_signal_batch()

            # 남은 배치 처리
            if self.signal_batch:
                self._process_signal_batch()

        # 성능 통계 출력
        elapsed = time.time() - start_time
        print(f"\n📊 RIFF 처리 완료 ({elapsed:.2f}초):")
        print(f"  - 전체 메시지: {self.total_messages_read:,}개")
        print(
            f"  - 관심 메시지: {self.target_messages_found:,}개 ({self.target_messages_found / max(1, self.total_messages_read) * 100:.1f}%)")
        print(f"  - 신호 수신: {self.signals_received:,}개")
        print(f"  - 신호 로깅: {self.signals_logged:,}개")
        print(
            f"  - 신호 제한: {self.signals_throttled:,}개 ({self.signals_throttled / max(1, self.signals_received) * 100:.1f}%)")


    def _read_header_optimized(self, f):
        """최적화된 헤더 읽기"""
        # RIFF 헤더 (12 bytes)
        riff_header = f.read(12)
        riff, file_size, riff_type = struct.unpack('<4sI4s', riff_header)

        if riff != b'RIFF':
            raise ValueError(f"잘못된 RIFF 헤더: {riff}")

        # Chunk 헤더 스킵
        f.read(8)

        # 타임스탬프와 체크섬
        self.timestamp_offset = struct.unpack('<Q', f.read(8))[0]
        self.crc16_checksum = struct.unpack('<H', f.read(2))[0]

        # LIST 헤더 스킵
        f.read(12)


    def _read_signal_data_fast(self, f):
        """고속 신호 데이터 읽기"""
        # Chunk 헤더
        chunk_header = f.read(8)
        if len(chunk_header) < 8:
            return None

        chunk_id, chunk_size = struct.unpack('<II', chunk_header)

        # GeneralSignalData가 아니면 스킵
        if chunk_id != 0x69676973:  # "sig"
            f.read(chunk_size)
            return None

        # ✅ 필요한 데이터만 읽기 (type, flags 스킵)
        signal_header = f.read(18)
        message_id, _, _, time_delta = struct.unpack('<IHIQ', signal_header)

        # 페이로드 읽기
        message_length = struct.unpack('<I', f.read(4))[0]
        payload = f.read(message_length)

        # 패딩 스킵
        if message_length % 2 != 0:
            f.read(1)

        return OptimizedGeneralSignalData(message_id, time_delta, payload)


    def _process_signal_batch(self):
        """신호 배치 처리 (100ms 제한 포함)"""
        if not self.signal_batch:
            return

        # ✅ 배치 단위로 디코딩 및 100ms 제한 적용
        for sensor_relative_us, signal_data in self.signal_batch:
            try:
                # 메시지 디코딩 (캐싱된 message_map 사용)
                msg = self.message_map.get(signal_data.message_id)
                if msg is None:
                    continue

                decoded = msg.decode(signal_data.payload)
                message_name = msg.name

                # 신호별 처리
                for signal_name, value in decoded.items():
                    # 관심 신호 체크
                    if (message_name, signal_name) not in self.allowed_signals_dict:
                        continue

                    self.signals_received += 1

                    # ✅ 100ms 제한 체크
                    last_logged_time = self.signal_last_logged.get(signal_name, 0)

                    if sensor_relative_us - last_logged_time < self.throttle_interval_us:
                        # 100ms 이내면 스킵
                        self.signals_throttled += 1
                        continue

                    # ✅ 100ms 이상 지났으면 로깅
                    self.signal_last_logged[signal_name] = sensor_relative_us
                    self.signals_logged += 1

                    # 핸들러 호출
                    if self.packet_handler:
                        self.packet_handler(sensor_relative_us, signal_name, value)

            except Exception as e:
                # 디코딩 오류 무시
                continue

        self.signal_batch.clear()
        self.last_flush_time = time.time()


    def set_data_handler(self, handler: Callable[[int, str, float], None]):
        self.packet_handler = handler
