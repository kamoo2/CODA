# Dockerfile
FROM python:3.10-slim

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 복사 및 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 전체 소스 복사
COPY . .

# 기본 실행 명령 설정
ENTRYPOINT ["python", "run_visualization.py"]
