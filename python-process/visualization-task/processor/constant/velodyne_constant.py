
class Vlp16Constant:
    LASER_PER_FIRING = 32
    FIRING_PER_PKT = 12
    MAX_NUM_LASERS = 16
    LASER_ELEVATION_ANGLE_TABLE = [
        -15.0, 1.0, -13.0, 3.0,
        -11.0, 5.0, -9.0, 7.0,
        -7.0, 9.0, -5.0, 11.0,
        -3.0, 13.0, -1.0, 15.0
    ]
    TIME_BETWEEN_FIRING = 2.304
    TIME_TOTAL_CYCLE = 55.296


class PuckMRConstant:
    LASER_PER_FIRING = 32
    FIRING_PER_PKT = 12
    MAX_NUM_LASERS = 32
    LASER_ELEVATION_ANGLE_TABLE = [
        -25.0, -1.0, -1.667, -15.639,
        -11.31, 0.0, -0.667, -8.843,
        -7.254, 0.333, -0.333, -6.148,
        -5.333, 1.333, 0.667, -4.0,
        -4.667, 1.667, 1.0, -3.667,
        -3.333, 3.333, 2.333, -2.667,
        -3.0, 7.0, 4.667, -2.333,
        -2.0, 15.0, 10.333, -1.333
    ]
    LASER_AZIMUTH_OFFSET_TABLE = [
        140.0, -420.0, 140.0, -140.0,
        140.0, -140.0, 420.0, -140.0,
        140.0, -420.0, 140.0, -140.0,
        420.0, -140.0, 420.0, -140.0,
        140.0, -420.0, 140.0, -420.0,
        420.0, -140.0, 140.0, -140.0,
        140.0, -140.0, 140.0, -420.0,
        420.0, -140.0, 140.0, -140.0
    ]
    TIME_BETWEEN_FIRING = 2.304
    TIME_TOTAL_CYCLE = 55.296