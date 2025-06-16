
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SelectedSignal:
    message_name: str
    signal_name: List[str]


@dataclass
class FileMetadata:
    upload_file_path: str
    parser_name: str
    entity_name: str
    dbc_file_name: Optional[str]
    selected_signals: List[SelectedSignal]


@dataclass
class Credential:
    access_key: str
    secret_key: str
    region_name: str
    bucket_name: str