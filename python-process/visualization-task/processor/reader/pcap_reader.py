from typing import Callable
import struct
from processor.util.s3_util import open_s3_stream


class PcapReader:
    def __init__(self, file_path, relative_us, credential):
        self.file_path = file_path
        self.packet_handler: Callable[[int, int, bytes], None] = None
        self.link_type = None
        self.relative_us = relative_us
        self.credential = credential

    def set_data_handler(self, handler: Callable[[int, int, bytes], None]):
        self.packet_handler = handler

    def read(self):
        first_timestamp_us = None

        with open_s3_stream(self.file_path, self.credential) as f:
            # 1. Global Header (24 bytes)
            global_header = f.read(24)
            if len(global_header) != 24:
                raise ValueError("Invalid pcap global header")

            magic_number = struct.unpack("<I", global_header[0:4])[0]
            is_little_endian = magic_number in (0xa1b2c3d4, 0xa1b23c4d)
            endian = "<" if is_little_endian else ">"
            self.link_type = struct.unpack(endian + "I", global_header[20:24])[0]

            while True:
                pkt_header = f.read(16)
                if len(pkt_header) < 16:
                    break  # EOF

                ts_sec, ts_usec, incl_len, orig_len = struct.unpack(endian + "IIII", pkt_header)
                pkt_data = f.read(incl_len)
                if len(pkt_data) < incl_len:
                    break

                ts_us = ts_sec * 1_000_000 + ts_usec
                if first_timestamp_us is None:
                    first_timestamp_us = ts_us

                sensor_relative_us = ts_us - first_timestamp_us + self.relative_us

                try:
                    payload = self._extract_udp_payload(pkt_data)

                    if payload is None:
                        continue

                    if self._is_gps_packet(payload):
                        self.packet_handler(sensor_relative_us, self.relative_us, payload)
                    elif self._is_lidar_packet(payload):
                        self.packet_handler(sensor_relative_us, self.relative_us, payload)
                    else:
                        print("[Reader] Unknown UDP payload structure")
                except Exception as e:
                    print(f"[PcapReader] packet error: {e}")

    def _is_gps_packet(self, payload: bytes) -> bool:
        return b"$GPRMC" in payload or b"$GNRMC" in payload

    def _is_lidar_packet(self, payload: bytes) -> bool:
        return len(payload) == 1206 or len(payload) == 1248

    def _extract_udp_payload(self, pkt_data: bytes) -> bytes | None:
        if self.link_type == 1:  # Ethernet
            if pkt_data[12:14] not in [b'\x08\x00', b'\x81\x00']:  # IPv4 or VLAN
                return None
            ip_offset = 14 if pkt_data[12:14] == b'\x08\x00' else 18  # VLAN인 경우 더 offset
            ip_header = pkt_data[ip_offset:]
            ip_proto = ip_header[9]
            if ip_proto != 17:
                return None
            ip_header_len = (ip_header[0] & 0x0F) * 4
            return ip_header[ip_header_len + 8:]

        elif self.link_type == 0:  # Loopback
            af = int.from_bytes(pkt_data[:4], "little")
            if af != 2:
                return None
            ip = pkt_data[4:]
            ip_proto = ip[9]
            if ip_proto != 17:
                return None
            ip_header_len = (ip[0] & 0x0F) * 4
            return ip[ip_header_len + 8:]

        else:
            print(f"[Reader] ❌ Unsupported linktype: {self.link_type}")
            return None