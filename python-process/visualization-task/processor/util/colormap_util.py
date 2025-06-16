# colormap_utils.py
import numpy as np
from numba import njit


@njit
def process_lidar_points_batch(azimuths, elevations, distances, intensities):
    """라이다 포인트 배치 처리 - 좌표 변환과 컬러 매핑을 한 번에"""
    n = len(distances)
    positions = np.empty((n, 3), dtype=np.float32)
    colors = np.empty((n, 3), dtype=np.uint8)

    pi_div_180 = np.float32(np.pi / 180.0)

    for i in range(n):
        # 좌표 변환
        az = azimuths[i] * pi_div_180
        el = elevations[i] * pi_div_180
        r = distances[i]

        cos_el = np.cos(el)
        positions[i, 0] = r * cos_el * np.cos(az)  # x
        positions[i, 1] = r * cos_el * np.sin(az)  # y
        positions[i, 2] = r * np.sin(el)  # z

        # 컬러 매핑
        intensity = min(255, max(0, int(intensities[i])))
        v = intensity / 255.0

        if v < 0.25:
            colors[i, 0] = 0
            colors[i, 1] = int(4 * v * 255)
            colors[i, 2] = 255
        elif v < 0.5:
            colors[i, 0] = 0
            colors[i, 1] = 255
            colors[i, 2] = int((1 - 4 * (v - 0.25)) * 255)
        elif v < 0.75:
            colors[i, 0] = int(4 * (v - 0.5) * 255)
            colors[i, 1] = 255
            colors[i, 2] = 0
        else:
            colors[i, 0] = 255
            colors[i, 1] = int((1 - 4 * (v - 0.75)) * 255)
            colors[i, 2] = 0

    return positions, colors
