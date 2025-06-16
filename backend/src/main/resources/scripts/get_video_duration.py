import sys
import cv2

def get_video_duration(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("ERROR")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = frame_count / fps if fps > 0 else 0

    cap.release()
    print(duration)  # 초 단위로 출력


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python get_duration.py <video_path>")
    else:
        get_video_duration(sys.argv[1])