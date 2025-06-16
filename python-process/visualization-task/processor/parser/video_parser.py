class VideoParser:
    def __init__(self):
        self.handler = None

    def set_parsed_data_handler(self, handler):
        self.handler = handler

    def parse(self, timestamp, jpeg_bytes):
        if self.handler:
            self.handler(timestamp, jpeg_bytes)