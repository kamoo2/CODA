import numpy as np

class VelodyneLidarFrame:
    def __init__(self, initial_capacity=10000):
        self.timestamp = 0
        self.point_count = 0
        self.capacity = initial_capacity

        # numpy 배열로 직접 할당 (동적 확장 가능)
        self.azimuths = np.empty(initial_capacity, dtype=np.float32)
        self.elevations = np.empty(initial_capacity, dtype=np.float32)
        self.distances = np.empty(initial_capacity, dtype=np.float32)
        self.intensities = np.empty(initial_capacity, dtype=np.uint8)

    def append_data(self, azimuths, elevations, distances, intensities, timestamp):
        new_points = len(azimuths)

        # ✅ 필요시 배열 크기 확장
        if self.point_count + new_points > self.capacity:
            new_capacity = max(self.capacity * 2, self.point_count + new_points)
            self._resize_arrays(new_capacity)

        # ✅ 직접 배열 복사 (리스트 변환 없음)
        end_idx = self.point_count + new_points
        self.azimuths[self.point_count:end_idx] = azimuths
        self.elevations[self.point_count:end_idx] = elevations
        self.distances[self.point_count:end_idx] = distances
        self.intensities[self.point_count:end_idx] = intensities

        self.point_count = end_idx
        self.timestamp = timestamp

    def _resize_arrays(self, new_capacity):
        """배열 크기 확장"""
        self.azimuths = np.resize(self.azimuths, new_capacity)
        self.elevations = np.resize(self.elevations, new_capacity)
        self.distances = np.resize(self.distances, new_capacity)
        self.intensities = np.resize(self.intensities, new_capacity)
        self.capacity = new_capacity

    def get_valid_data(self):
        """유효한 데이터만 반환 (슬라이싱)"""
        return (
            self.azimuths[:self.point_count],
            self.elevations[:self.point_count],
            self.distances[:self.point_count],
            self.intensities[:self.point_count]
        )
