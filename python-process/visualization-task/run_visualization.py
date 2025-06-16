import argparse
import json
import base64
import os
import multiprocessing
import logging
import traceback
import time
from processor.execution.data_processor import DataProcessor
from processor.execution.file_processor_thread import FileProcessorThread
from processor.execution.segment_barrier import SegmentBarrier
from processor.util.s3_util import get_project_info_key, read_json_from_path
from processor.model.visualization_model import FileMetadata, Credential
from mqtt.mqtt_client_singleton import get_mqtt_client



# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("RunVisualization")

def parse_time(ts: str):
    """시간 파싱 - 예외 처리 강화"""
    import datetime
    try:
        return datetime.datetime.strptime(ts, "%Y:%m:%d:%H:%M:%S:%f")
    except ValueError as e:
        logger.error(f"⚠️ 시간 파싱 실패: '{ts}' - {e}")
        raise


def prepare_relative_offsets(json_path, files, credential):
    """파일 상대 오프셋 준비 - 최적화 + 예외처리 강화"""
    logger.info(f"📋 프로젝트 정보 로딩 시작: {json_path}")
    start_time = time.time()

    try:
        data = read_json_from_path(json_path, credential.access_key, credential.secret_key,
                                   credential.region_name, credential.bucket_name)
        load_time = time.time() - start_time
        logger.info(f"✅ 프로젝트 정보 로딩 완료: {load_time:.3f}초")

    except Exception as e:
        logger.error(f"❌ 프로젝트 정보 로딩 실패: {e}")
        logger.error(f"📄 JSON 경로: {json_path}")
        logger.error(f"🔑 크리덴셜 정보: region={credential.region_name}, bucket={credential.bucket_name}")
        # 모든 파일을 오프셋 0으로 처리
        logger.warning("🔄 모든 파일 오프셋을 0으로 설정하여 계속 진행")
        return {file.upload_file_path: 0 for file in files}

    sensor_list = data.get("RecordedSensorList", [])
    if not sensor_list:
        logger.warning("⚠️ RecordedSensorList가 비어있음 - 모든 파일 오프셋 0으로 설정")
        return {file.upload_file_path: 0 for file in files}

    logger.info(f"📊 센서 목록: {len(sensor_list)}개 센서 발견")

    # ✅ 핵심 최적화: 해시맵으로 파일명 매칭 속도 향상
    file_name_to_path = {os.path.basename(file.upload_file_path): file.upload_file_path
                         for file in files}
    logger.debug(f"🗂️ 처리할 파일명: {list(file_name_to_path.keys())}")

    file_start_times = {}
    failed_sensors = []

    for i, sensor in enumerate(sensor_list):
        sensor_name = sensor.get("Name", f"Sensor_{i}")
        sensor_files = sensor.get("Files", [])
        start_str = sensor.get("ActualStartTime")

        if not start_str:
            logger.warning(f"⚠️ 센서 '{sensor_name}': ActualStartTime이 없음")
            continue

        if not sensor_files:
            logger.warning(f"⚠️ 센서 '{sensor_name}': 파일 목록이 없음")
            continue

        try:
            start_time_parsed = parse_time(start_str)
            matched_files = []

            # 해시맵 룩업으로 빠른 매칭
            for file_name in sensor_files:
                if file_name in file_name_to_path:
                    file_start_times[file_name] = start_time_parsed
                    matched_files.append(file_name)

            if matched_files:
                logger.info(f"✅ 센서 '{sensor_name}': {len(matched_files)}개 파일 매칭 (시작시간: {start_str})")
                logger.debug(f"   📁 매칭된 파일: {matched_files}")
            else:
                logger.warning(f"⚠️ 센서 '{sensor_name}': 매칭되는 파일 없음")
                logger.debug(f"   📁 센서 파일 목록: {sensor_files}")

        except Exception as e:
            failed_sensors.append(sensor_name)
            logger.error(f"❌ 센서 '{sensor_name}' 처리 실패: {e}")
            continue

    if failed_sensors:
        logger.warning(f"⚠️ 실패한 센서들: {failed_sensors}")

    if not file_start_times:
        logger.warning("⚠️ 모든 파일의 시작 시간을 찾을 수 없음 - 오프셋 0으로 설정")
        return {file.upload_file_path: 0 for file in files}

    # 기준 시간 계산
    base_time = max(file_start_times.values())
    logger.info(f"⏰ 기준 시간 설정: {base_time}")

    file_relative_offsets = {}
    matched_count = 0
    unmatched_files = []

    for file in files:
        file_path = file.upload_file_path
        file_name = os.path.basename(file_path)

        if file_name in file_start_times:
            actual_time = file_start_times[file_name]
            relative_us = int((actual_time - base_time).total_seconds() * 1_000_000)
            file_relative_offsets[file_path] = relative_us
            matched_count += 1
            logger.debug(f"📄 {file_name}: 오프셋 {relative_us:,}μs")
        else:
            relative_us = 0
            file_relative_offsets[file_path] = relative_us
            unmatched_files.append(file_name)

    logger.info(f"✅ 오프셋 계산 완료: {matched_count}/{len(files)}개 파일 매칭")
    if unmatched_files:
        logger.warning(f"⚠️ 시간 정보 없는 파일들 (오프셋 0): {unmatched_files}")

    return file_relative_offsets


def run_visualization(server_url, user_id, project_id, blueprints, credentials):
    """메인 시각화 실행 함수 - 예외처리 강화"""
    logger.info(f"🚀 시각화 프로세스 시작")
    logger.info(f"👤 User ID: {user_id}")
    logger.info(f"📁 Project ID: {project_id}")
    logger.info(f"🌐 Server URL: {server_url}")

    start_time = time.time()

    try:
        # 입력 데이터 디코딩
        logger.info("📋 입력 데이터 파싱 중...")
        blueprints_json = base64.b64decode(blueprints).decode("utf-8")
        credential_json = base64.b64decode(credentials).decode("utf-8")

        files = [FileMetadata(**f) for f in json.loads(blueprints_json)]
        credential = Credential(**json.loads(credential_json))

        logger.info(f"📊 처리할 파일: {len(files)}개")
        for i, file in enumerate(files):
            logger.info(
                f"  {i + 1}. {file.entity_name} ({file.parser_name}): {os.path.basename(file.upload_file_path)}")

    except Exception as e:
        logger.error(f"❌ 입력 데이터 파싱 실패: {e}")
        logger.error(f"📊 Blueprints 길이: {len(blueprints) if blueprints else 'None'}")
        logger.error(f"🔑 Credentials 길이: {len(credentials) if credentials else 'None'}")
        raise

    try:
        # 저장 경로 준비
        save_path = f"/data/rrd/{user_id}/{project_id}"
        os.makedirs(save_path, exist_ok=True)
        logger.info(f"💾 저장 경로: {save_path}")

        # 큐 및 프로세서 준비
        queue = multiprocessing.Queue(maxsize=500)
        logger.info("📮 큐 생성 완료 (크기: 20)")

        mqtt_topic = f"{user_id}/{project_id}"
        logger.info(f"📡 MQTT 토픽: {mqtt_topic}")

        processor = DataProcessor(
            server_url=server_url,
            user_id=user_id,
            project_id=project_id,
            save_path=save_path,
            files=files,
            mqtt=get_mqtt_client(mqtt_topic),
            segment_duration_us=60_000_000,
            queue=queue,
        )
        processor.start()
        logger.info("⚙️ 데이터 프로세서 시작됨")

    except Exception as e:
        logger.error(f"❌ 프로세서 초기화 실패: {e}")
        logger.error(traceback.format_exc())
        raise

    try:
        # 배리어 및 상대 오프셋 준비
        barrier = SegmentBarrier()
        logger.info("🚧 세그먼트 배리어 생성 완료")

        project_info_path = get_project_info_key(files[0].upload_file_path)
        logger.info(f"📋 프로젝트 정보 경로: {project_info_path}")

        # ✅ 최적화된 오프셋 계산
        file_relative_offsets = prepare_relative_offsets(project_info_path, files, credential)

    except Exception as e:
        logger.error(f"❌ 오프셋 준비 실패: {e}")
        logger.error(traceback.format_exc())
        logger.warning("🔄 모든 파일 오프셋을 0으로 설정하여 계속 진행")
        file_relative_offsets = {file.upload_file_path: 0 for file in files}

    # 파일 처리 스레드 시작
    threads = []
    failed_threads = []

    logger.info(f"🔄 파일 처리 스레드 생성 시작 ({len(files)}개)")

    for i, file in enumerate(files):
        try:
            relative_us = file_relative_offsets.get(file.upload_file_path, 0)

            dbc_path = f"/data/dbc/{user_id}/{file.dbc_file_name}" if file.dbc_file_name else None
            if dbc_path and not os.path.exists(dbc_path):
                logger.warning(f"⚠️ DBC 파일 없음: {dbc_path}")

            thread = FileProcessorThread(
                server_url=server_url,
                file_path=file.upload_file_path,
                parser_name=file.parser_name,
                entity_name=file.entity_name,
                dbc_file_path=dbc_path,
                selected_signals=file.selected_signals or [],
                user_project_key=f"{user_id}_{project_id}",
                queue=queue,
                barrier=barrier,
                segment_duration_us=60_000_000,
                relative_us=relative_us,
                credential=credential
            )

            thread.start()
            threads.append(thread)

            logger.info(f"✅ 스레드 {i + 1}/{len(files)} 시작: {file.entity_name} (오프셋: {relative_us:,}μs)")

        except Exception as e:
            failed_threads.append(f"{file.entity_name}: {e}")
            logger.error(f"❌ 스레드 생성 실패 ({i + 1}/{len(files)}): {file.entity_name} - {e}")
            continue

    if failed_threads:
        logger.error(f"❌ 실패한 스레드들: {failed_threads}")

    if not threads:
        logger.error("❌ 시작된 스레드가 없음 - 프로세스 종료")
        if processor.is_alive():
            processor.terminate()
        raise RuntimeError("No threads started successfully")

    logger.info(f"🎯 성공적으로 시작된 스레드: {len(threads)}/{len(files)}개")

    # 프로세서 완료 대기
    try:
        logger.info("⏳ 데이터 프로세서 완료 대기 중...")
        processor_start = time.time()
        processor.join()  # wait for rerun logging to finish
        processor_time = time.time() - processor_start

        logger.info(f"✅ 데이터 프로세서 완료: {processor_time:.2f}초")

    except Exception as e:
        logger.error(f"❌ 프로세서 대기 중 오류: {e}")
        if processor.is_alive():
            logger.warning("⚠️ 프로세서 강제 종료")
            processor.terminate()
        raise

    # 전체 처리 시간 출력
    total_time = time.time() - start_time
    logger.info(f"🎉 시각화 프로세스 완료!")
    logger.info(f"⏱️ 총 처리 시간: {total_time:.2f}초")
    logger.info(f"📊 처리 통계: {len(threads)}개 파일, 평균 {total_time / len(files):.2f}초/파일")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CODA 시각화 프로세스")
    parser.add_argument("--user-id", required=True, help="사용자 ID")
    parser.add_argument("--project-id", required=True, help="프로젝트 ID")
    parser.add_argument("--blueprints", required=True, help="블루프린트 JSON (Base64)")
    parser.add_argument("--credential", required=True, help="크리덴셜 JSON (Base64)")
    parser.add_argument("--server-url", required=True, help="서버 URL")
    parser.add_argument("--log-level", default="INFO",
                        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                        help="로그 레벨 설정")

    args = parser.parse_args()

    # 로그 레벨 설정
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    logger.info(f"🔧 로그 레벨 설정: {args.log_level}")

    try:
        run_visualization(
            server_url=args.server_url,
            user_id=args.user_id,
            project_id=args.project_id,
            blueprints=args.blueprints,
            credentials=args.credential
        )
        logger.info("✅ 프로그램 정상 종료")

    except KeyboardInterrupt:
        logger.warning("⚠️ 사용자에 의한 프로그램 중단 (Ctrl+C)")

    except Exception as e:
        logger.error(f"💥 프로그램 실행 중 치명적 오류: {e}")
        logger.error("📋 상세 오류 정보:")
        logger.error(traceback.format_exc())
        exit(1)