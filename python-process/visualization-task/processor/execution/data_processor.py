import multiprocessing
from queue import Empty
import rerun as rr
import rerun.blueprint as rrb
import logging
import time
from processor.enums.data_type_enum import DataType
import random
import os
import json

def _random_color():
    # RGB 랜덤 0~255
    return [random.randint(0, 255) for _ in range(3)]

def format_mmss(seconds: float):
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02}:{s:02}"

def to_public_rrd_url(server_url: str,local_path: str) -> str:
    # 윈도우 경로 구분자 `\` → `/` 변환
    relative_path = os.path.relpath(local_path, "/data/rrd").replace("\\", "/")
    return f"{server_url}/rrd/{relative_path}"


def analyze_sensors(files):
    """센서 구성 분석"""
    sensor_counts = {'lidar': 0, 'video': 0, 'gps': 0, 'riff': 0}
    entities = {'lidar': [], 'video': [], 'gps': [], 'riff': []}

    for file in files:
        if file.parser_name == "PcapLidarParser":
            sensor_counts['lidar'] += 1
            entities['lidar'].append(file.entity_name)
        elif file.parser_name == "VideoParser":
            sensor_counts['video'] += 1
            entities['video'].append(file.entity_name)
        elif file.parser_name == "PcapGpsParser":
            sensor_counts['gps'] += 1
            entities['gps'].append(file.entity_name)
        elif file.parser_name == "RiffParser":
            sensor_counts['riff'] += 1
            entities['riff'].append(file.entity_name)

    return sensor_counts, entities


def create_optimal_blueprint(sensor_counts, entities):
    """센서 구성에 따른 최적 blueprint 생성"""

    # 메인 컨테이너
    main_contents = []

    # 상단: 3D LiDAR + GPS Map (50% 높이)
    top_contents = []
    top_column_shares = []

    # LiDAR 3D 뷰 (좌측)
    if sensor_counts['lidar'] > 0:
        lidar_views = []
        for i, entity in enumerate(entities['lidar'][:2]):  # 최대 2개
            lidar_views.append(
                rrb.Spatial3DView(
                    name=f"[LIDAR] {entity}",
                    origin=f"/world/{entity}",
                    background=[20,25,30]
                )
            )

        if len(lidar_views) == 1:
            top_contents.append(lidar_views[0])
        else:
            top_contents.append(rrb.Vertical(contents=lidar_views))
        top_column_shares.append(3)

    # GPS Map 뷰 (우측)
    if sensor_counts['gps'] > 0:
        gps_views = []
        for entity in entities['gps'][:1]:  # 하나만 표시
            gps_views.append(
                rrb.MapView(
                    name=f"[GPS] {entity}",
                    origin=f"/world/{entity}",
                )
            )

        if gps_views:
            top_contents.append(gps_views[0])
            top_column_shares.append(2)

    # 상단 레이아웃
    if top_contents:
        if not top_column_shares:
            top_column_shares = [1] * len(top_contents)

        main_contents.append(
            rrb.Horizontal(
                contents=top_contents,
                column_shares=top_column_shares
            )
        )

    # 하단: 비디오 그리드 + 신호 차트 (50% 높이)
    bottom_contents = []
    bottom_column_shares = []

    # 비디오 그리드 (좌측)
    if sensor_counts['video'] > 0:
        video_views = []
        for entity in entities['video'][:6]:  # 최대 6개
            video_views.append(
                rrb.Spatial2DView(
                    name=f"[VIDEO] {entity}",
                    origin=f"/world/{entity}"
                )
            )

        # 비디오가 많으면 그리드로 배치
        if len(video_views) <= 2:
            video_layout = rrb.Horizontal(contents=video_views)
        elif len(video_views) <= 4:
            # 2x2 그리드
            top_row = rrb.Horizontal(contents=video_views[:2])
            bottom_row = rrb.Horizontal(contents=video_views[2:4] if len(video_views) > 2 else [])
            video_layout = rrb.Vertical(contents=[top_row, bottom_row] if video_views[2:4] else [top_row])
        else:
            # 3x2 그리드
            top_row = rrb.Horizontal(contents=video_views[:3])
            bottom_row = rrb.Horizontal(contents=video_views[3:6])
            video_layout = rrb.Vertical(contents=[top_row, bottom_row])

        bottom_contents.append(video_layout)
        bottom_column_shares.append(3)

        # ✅ 개선된 신호 차트 + 대시보드 영역 (우측)
        if sensor_counts['riff'] > 0:
            signal_views = []

            for entity in entities['riff'][:2]:  # 최대 2개 entity
                # 좌측: TimeSeriesView (차트) - 65%
                chart_view = rrb.TimeSeriesView(
                    name=f"[SIGNALS] {entity}",
                    origin=f"/{entity}/charts"
                )

                # 우측: TextDocumentView (개선된 대시보드) - 35%
                dashboard_view = rrb.TextDocumentView(
                    name=f"[DASHBOARD] {entity}",
                    origin=f"/{entity}/dashboard"
                )

                # 가로로 배치 (차트 65% + 대시보드 35% - 대시보드 비중 증가)
                entity_layout = rrb.Horizontal(
                    contents=[chart_view, dashboard_view],
                    column_shares=[65, 35]  # 대시보드 영역 확대
                )

                signal_views.append(entity_layout)

            if signal_views:
                if len(signal_views) == 1:
                    signal_layout = signal_views[0]
                else:
                    signal_layout = rrb.Vertical(contents=signal_views)

                bottom_contents.append(signal_layout)
                bottom_column_shares.append(2)

    # 하단 레이아웃
    if bottom_contents:
        if not bottom_column_shares:
            bottom_column_shares = [1] * len(bottom_contents)

        main_contents.append(
            rrb.Horizontal(
                contents=bottom_contents,
                column_shares=bottom_column_shares
            )
        )

    # 전체 높이 비율 설정
    row_shares = []
    if len(main_contents) == 2:
        row_shares = [3, 2]  # 상단 60%, 하단 40%
    elif len(main_contents) == 1:
        row_shares = [1]

    # 최종 blueprint
    if main_contents:
        main_layout = rrb.Vertical(
            contents=main_contents,
            row_shares=row_shares
        ) if len(main_contents) > 1 else main_contents[0]
    else:
        # 기본 레이아웃
        main_layout = rrb.Spatial3DView(
            name="🌍 Overview",
            origin="/world",
            background=[20,25,30]
        )

    return rrb.Blueprint(
        main_layout,
        rrb.BlueprintPanel(expanded=False),  # 접힌 상태
        rrb.SelectionPanel(expanded=False),  # 접힌 상태
        rrb.TimePanel(expanded=False)  # 접힌 상태
    )

class DataProcessor(multiprocessing.Process):
    def __init__(self, server_url, user_id, project_id, save_path, files,mqtt, segment_duration_us=60 * 1_000_000, queue=None):
        super().__init__(daemon=True)
        self.server_url = server_url
        self.user_id = user_id
        self.project_id = project_id
        self.user_project_key = f"{user_id}_{project_id}"
        self.save_path = save_path
        self.segment_duration_us = segment_duration_us
        self.files = files
        self.queue = queue
        self.segment_index = 0
        self.ego_trajectory_lat_lon = []
        self.initialized_signal = {}
        self.last_elapsed_time = 0
        self.mqtt = mqtt
        self.segment_start_time = time.time()
        self.process_start_time = time.time()

        # 센서 분석 결과 저장
        self.sensor_analysis = None
        self.blueprint = None

        # ✅ 신호별 정보 저장 (동적 처리용)
        self.signal_colors = {}  # 신호별 랜덤 색상 저장
        self.signal_dashboards = {}  # entity별 대시보드 텍스트 저장

        os.makedirs(save_path, exist_ok=True)

    def _log(self, message):
        logging.info(f"[{self.user_project_key}] {message}")


    def run(self):
        self.mqtt.loop_start()
        self._log("🚀 시각화 프로세스 시작")

        # rerun 초기화
        rr.init(self.user_project_key)

        # 센서 분석 및 최적 blueprint 적용
        sensor_counts, entities = analyze_sensors(self.files)
        self._log(
            f"📊 센서 구성: LiDAR={sensor_counts['lidar']}, Video={sensor_counts['video']}, GPS={sensor_counts['gps']}, RIFF={sensor_counts['riff']}")

        self.blueprint = create_optimal_blueprint(sensor_counts, entities)
        rr.send_blueprint(self.blueprint)
        self._log("🎨 최적화된 Blueprint 적용 완료")

        # RRD 저장 시작
        self._save_rrd_segment()

        # 좌표계 설정
        rr.log("world", rr.ViewCoordinates.RIGHT_HAND_Z_UP)

        stop_count = 0 # STOP 메시지 개수 Count

        self.segment_start_time = time.time()
        self.process_start_time = time.time()
        # ✅ 데이터 수신 루프
        while True:
            try:
                data = self.queue.get(timeout=1)
            except Empty:
                continue

            if data == "STOP":
                stop_count += 1
                if stop_count == len(self.files):
                    self._send_segment_done(self.last_elapsed_time)
                    self._send_process_complete()
                    break
                else:
                    continue

            self._handle_data(data)

        self.mqtt.loop_stop()
        self.mqtt.disconnect()
        self._log("🛑 MQTT 연결 종료")
        self._log("✅ DataProcessor 종료")

    def _save_rrd_segment(self):
        self.current_save_path = f"{self.save_path}/{self.segment_index}.rrd"
        rr.save(self.current_save_path)

        # ✅ 새 세그먼트 시작할 때마다 Blueprint 재적용
        if self.blueprint is not None:
            rr.send_blueprint(self.blueprint)
            self._log(f"🎨 Segment {self.segment_index}: Blueprint 재적용 완료")

        self._log(f"📁 Segment {self.segment_index} 저장 시작 → {self.current_save_path}")

    def _send_segment_done(self, elapsed_time_us):
        start_s = self.segment_duration_us * self.segment_index * 1e-6
        end_s = elapsed_time_us * 1e-6
        segment_name = f"{format_mmss(start_s)} ~ {format_mmss(end_s)}"

        topic = f"visualization/backend/progress/{self.user_id}/{self.project_id}"
        payload = json.dumps({
            "status": "PROGRESSING",
            "segment_index": self.segment_index,
            "file_path": to_public_rrd_url(self.server_url, self.current_save_path),
            "segment_name": segment_name
        })
        self.mqtt.publish(topic, payload, qos=1).wait_for_publish()
        duration = time.time() - self.segment_start_time
        self._log(f"✅ Segment {self.segment_index} 완료 → 범위: {segment_name} | 소요 시간: {duration:.2f}s")

    def _send_process_complete(self):
        topic = f"visualization/backend/complete/{self.user_id}/{self.project_id}"
        payload = json.dumps({"status": "COMPLETE"})
        self.mqtt.publish(topic, payload, qos=1).wait_for_publish()
        total_duration = time.time() - self.process_start_time
        self._log(f"🎉 모든 파일 로깅 완료 | 전체 소요 시간: {total_duration:.2f}s")


    def _handle_data(self, data):
        elapsed_time = data["timestamp"]
        self.last_elapsed_time = elapsed_time

        if elapsed_time > self.segment_duration_us * (self.segment_index + 1):
            self._send_segment_done(self.segment_duration_us * (self.segment_index + 1))
            self.segment_index += 1
            self._save_rrd_segment()
            self.segment_start_time = time.time()
            self._log(f"🆕 Segment {self.segment_index} 로깅 시작")

        rr.set_time("timeline", duration=elapsed_time * 1e-6)
        self._log_data(data)

    def _log_data(self, data):
        if data["type"] == DataType.GPS:
            self._log_gps(data)
        elif data["type"] == DataType.LIDAR:
            self._log_lidar(data)
        elif data["type"] == DataType.VIDEO:
            self._log_video(data)
        elif data["type"] == DataType.RIFF:
            self._log_signal(data)

    def _log_video(self,data):
        rr.log(f"world/{data['entity_name']}",
               rr.EncodedImage(contents=data['jpeg_bytes'], media_type="image/jpeg"))

    def _log_gps(self, data):
        self.ego_trajectory_lat_lon.append([data["latitude"], data["longitude"]])
        rr.log(f"world/{data['entity_name']}",
               rr.GeoPoints(lat_lon=[data["latitude"], data["longitude"]], radii=rr.Radius.ui_points(8.0),
                            colors=0xFF0000FF))
        rr.log(f"world/{data['entity_name']}/trajectory",
               rr.GeoLineStrings(lat_lon=self.ego_trajectory_lat_lon, radii=rr.Radius.ui_points(1.5),
                                 colors=0xFF0000FF))

    def _log_lidar(self, data):
        rr.log(f"world/{data['entity_name']}",
               rr.Points3D(positions=data["positions"], colors=data["colors"],
                           radii=rr.Radius.ui_points(1)))

    def _log_signal(self, data):
        """✅ 신호 로깅: 차트 + 색상 매칭 대시보드"""
        signal_name = data["signal_name"]
        value = data["value"]
        entity_name = data['entity_name']

        # 1️⃣ 차트용 로깅
        chart_path = f"{entity_name}/charts/{signal_name}"

        if chart_path not in self.initialized_signal:
            # ✅ 신호별 랜덤 색상 생성 및 저장 (한 번만)
            if signal_name not in self.signal_colors:
                self.signal_colors[signal_name] = _random_color()

            color = self.signal_colors[signal_name]

            rr.log(chart_path, rr.SeriesLine(
                name=signal_name,
                color=color,
                width=2.0
            ))
            self.initialized_signal[chart_path] = True

        rr.log(chart_path, rr.Scalar(value))

        # 2️⃣ 색상 매칭된 간단한 대시보드 업데이트
        self._update_dashboard(entity_name, signal_name, value)

    def _generate_dashboard_text(self, entity_name):
        """✅ 이모지 제거, 깔끔한 텍스트 대시보드"""
        if entity_name not in self.signal_dashboards:
            return "*No signals*"

        signals = self.signal_dashboards[entity_name]

        dashboard_lines = []

        # 신호들을 이름순으로 고정 정렬
        sorted_signals = sorted(signals.items(), key=lambda x: x[0].lower())

        for signal_name, value in sorted_signals:
            # 값 포맷팅
            if isinstance(value, (int, float)):
                if abs(value) >= 100:
                    formatted_value = f"{value:.1f}"
                elif abs(value) >= 10:
                    formatted_value = f"{value:.2f}"
                elif abs(value) >= 1:
                    formatted_value = f"{value:.3f}"
                else:
                    formatted_value = f"{value:.4f}"
            else:
                formatted_value = str(value)

            # 간단한 텍스트 형태로 표시 (이모지 없음)
            dashboard_lines.append(f"**{signal_name}**: `{formatted_value}`")

        return "\n".join(dashboard_lines)

    def _generate_dashboard_text(self, entity_name):
        """✅ 각 신호 뒤에 한 줄 띄우기 적용"""
        if entity_name not in self.signal_dashboards:
            return "*No signals*"

        signals = self.signal_dashboards[entity_name]

        dashboard_lines = []

        # 신호들을 이름순으로 고정 정렬
        sorted_signals = sorted(signals.items(), key=lambda x: x[0].lower())

        for signal_name, value in sorted_signals:
            # 값 포맷팅
            if isinstance(value, (int, float)):
                if abs(value) >= 100:
                    formatted_value = f"{value:.1f}"
                elif abs(value) >= 10:
                    formatted_value = f"{value:.2f}"
                elif abs(value) >= 1:
                    formatted_value = f"{value:.3f}"
                else:
                    formatted_value = f"{value:.4f}"
            else:
                formatted_value = str(value)

            # 각 신호 뒤에 빈 줄 추가
            dashboard_lines.append(f"**{signal_name}**: `{formatted_value}`")
            dashboard_lines.append("")  # 빈 줄 추가

        # 마지막 빈 줄 제거
        if dashboard_lines and dashboard_lines[-1] == "":
            dashboard_lines.pop()

        return "\n".join(dashboard_lines)

    def _update_dashboard(self, entity_name, signal_name, value):
        """✅ 간단한 대시보드 업데이트 (한 줄 띄우기 적용)"""
        # entity별 대시보드 딕셔너리 초기화
        if entity_name not in self.signal_dashboards:
            self.signal_dashboards[entity_name] = {}

        # 현재 신호 값 업데이트
        self.signal_dashboards[entity_name][signal_name] = value

        # 한 줄 띄우기가 적용된 대시보드 텍스트 생성
        dashboard_text = self._generate_dashboard_text(entity_name)

        # Markdown 형태로 대시보드에 로깅
        rr.log(f"{entity_name}/dashboard",
               rr.TextDocument(text=dashboard_text, media_type=rr.MediaType.MARKDOWN))