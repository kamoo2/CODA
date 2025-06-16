# 🔧 1단계: Build stage
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app
COPY --chown=gradle:gradle . .
RUN gradle build -x test

# ✅ 2단계: Runtime stage
FROM eclipse-temurin:17-jdk

WORKDIR /app

# ✅ Docker CLI 설치 (Optional)
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/build/libs/*.jar app.jar

# ✅ 디버그용 ENTRYPOINT
ENTRYPOINT ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]
