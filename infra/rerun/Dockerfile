FROM python:3.10-slim

# rerun SDK 설치 (시각화 기능 포함)
RUN pip install rerun-sdk==0.23.3

# rerun 실행용 포트 노출
EXPOSE 9876

# 기본 명령은 entrypoint.sh를 따름
ENTRYPOINT ["bash", "/rerun/entrypoint.sh"]