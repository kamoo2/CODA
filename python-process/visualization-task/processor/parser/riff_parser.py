class RiffParser:
    def __init__(self):
        self.handler = None

    def set_parsed_data_handler(self, handler):
        self.handler = handler

    def parse(self, relative_us, signal_name, value):
        if self.handler:
            self.handler(relative_us, signal_name, value)