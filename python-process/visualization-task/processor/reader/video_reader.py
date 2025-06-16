import av
import cv2
import boto3
import time


class VideoReader:
    """완전 수정된 비디오 리더 (버그 수정)"""

    def __init__(self, file_path, relative_us, credential):
        self.file_path = file_path
        self.credential = credential
        self.relative_us = relative_us
        self.frame_handler = None

        # ✅ 5fps + 품질 유지 설정
        self.target_fps = 5
        self.resize_factor = 0.35  # 35% 크기
        self.jpeg_quality = 75  # 75 품질

        # URL 캐싱
        self._cached_url = None
        self._url_cache_time = 0

    def set_data_handler(self, handler):
        self.frame_handler = handler

    def read(self):
        """완전 수정된 비디오 읽기"""
        try:
            url = self._get_presigned_url()
            container = av.open(url, options={
                'timeout': '10000000',
                'reconnect': '1',
                'buffer_size': '65536',
            })

            video_stream = next(s for s in container.streams if s.type == 'video')
            if not video_stream:
                raise RuntimeError("❌ 비디오 스트림이 존재하지 않습니다")

            source_fps = float(video_stream.average_rate) or 30
            frame_interval = max(1, int(source_fps / self.target_fps))

            print(f"📹 비디오 처리 시작: {source_fps}fps → {self.target_fps}fps (1/{frame_interval} 처리)")
            print(f"🎨 품질 설정: 크기 {int(self.resize_factor * 100)}%, JPEG 품질 {self.jpeg_quality}")

            first_pts_us = None
            processed_count = 0  # ✅ 여기서 변수 정의

            for i, frame in enumerate(container.decode(video_stream)):
                # 5fps에 맞는 프레임 간격
                if i % frame_interval != 0:
                    continue

                # 타임스탬프 계산
                pts_time = float(frame.pts * video_stream.time_base)
                ts_us = int(pts_time * 1_000_000)
                if first_pts_us is None:
                    first_pts_us = ts_us

                sensor_relative_us = ts_us - first_pts_us + self.relative_us
                if sensor_relative_us < 0:
                    continue

                # ✅ 프레임 처리 (processed_count 전달)
                jpeg_data = self._process_frame_safe(frame, processed_count)

                if jpeg_data is not None and self.frame_handler:
                    self.frame_handler(sensor_relative_us, jpeg_data)
                    processed_count += 1

            container.close()
            print(f"✅ 비디오 처리 완료: {processed_count}프레임")

        except av.PyAVCallbackError as e:
            print(f"❌ AV 라이브러리 오류: {e}")
        except Exception as e:
            print(f"❌ 비디오 처리 오류: {e}")

    def _process_frame_safe(self, frame, frame_count):
        """안전한 프레임 처리"""
        try:
            # 1단계: 원본 크기 확인
            original_width = frame.width
            original_height = frame.height

            # 2단계: 새 크기 계산
            new_width = max(200, int(original_width * self.resize_factor))
            new_height = max(150, int(original_height * self.resize_factor))

            # 3단계: PyAV로 리사이즈
            resized_frame = frame.reformat(
                width=new_width,
                height=new_height,
                format='rgb24'
            )

            # 4단계: NumPy 배열로 변환
            img_array = resized_frame.to_ndarray()

            # 5단계: RGB → BGR 변환
            bgr_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # 6단계: JPEG 압축
            encode_params = [
                cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality,
                cv2.IMWRITE_JPEG_OPTIMIZE, 1,
                cv2.IMWRITE_JPEG_PROGRESSIVE, 0,
            ]

            success, jpeg_data = cv2.imencode('.jpg', bgr_array, encode_params)

            if success:
                return jpeg_data
            else:
                print(f"❌ 프레임 {frame_count}: JPEG 인코딩 실패")
                return None

        except Exception as e:
            print(f"❌ 프레임 {frame_count} 처리 오류: {e}")
            return None

    def _get_presigned_url(self, expires=3600):
        """Presigned URL 생성"""
        current_time = time.time()

        if (self._cached_url is None or
                current_time - self._url_cache_time > 3000):
            access_key = self.credential.access_key
            secret_key = self.credential.secret_key
            region_name = self.credential.region_name
            bucket_name = self.credential.bucket_name

            endpoint = f"https://s3.{region_name}.wasabisys.com"
            s3 = boto3.client(
                "s3",
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region_name,
                endpoint_url=endpoint
            )

            self._cached_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': self.file_path},
                ExpiresIn=expires
            )
            self._url_cache_time = current_time
            print(f"🔗 새로운 Presigned URL 생성")

        return self._cached_url