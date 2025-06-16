from enum import Enum


class ParserType(Enum):
    PCAP_GPS = "PcapGpsParser"
    PCAP_LIDAR = "PcapLidarParser"
    VIDEO = "VideoParser"
    RIFF = "RiffParser"


class DataType(Enum):
    GPS = "GPS"
    LIDAR = "LIDAR"
    VIDEO = "VIDEO"
    RIFF = "RIFF"
