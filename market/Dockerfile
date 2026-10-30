# syntax=docker/dockerfile:1
# Multi-stage build for the Java market analysis service (mirrors the
# two-stage pattern of the predict and portal services).
#
# Stage 1: build the executable jar with Maven (deps cached separately).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -B package

# Stage 2: minimal JRE image, non-root user.
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app/target/market-api.jar ./market-api.jar
USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

ENTRYPOINT ["java", "-jar", "/app/market-api.jar"]
