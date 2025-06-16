import threading


class SegmentBarrier:
    def __init__(self):
        self.condition = threading.Condition()
        self.active_threads = set()
        self.waiting = 0

    def register(self, thread_id):
        with self.condition:
            self.active_threads.add(thread_id)

    def deregister(self, thread_id):
        with self.condition:
            self.active_threads.discard(thread_id)
            if self.waiting >= len(self.active_threads):
                self.waiting = 0
                self.condition.notify_all()

    def wait(self, thread_id):
        with self.condition:
            self.waiting += 1
            if self.waiting >= len(self.active_threads):
                self.waiting = 0
                self.condition.notify_all()
            else:
                self.condition.wait()
