# =============================================================
#  EstateFlow — Backend (Spring Boot API)
#  Build:  docker build -t estateflow-api .
#  Run:    see docker-compose.yml (needs DB_PASSWORD + JWT_SECRET)
# =============================================================

# ---------- Stage 1: build the jar ----------
# Maven + JDK 17 in one image; keeps the final image small.
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy the build definition first and resolve dependencies.
# This layer is cached, so dependency downloads only re-run
# when pom.xml changes.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Copy the source and package it (tests are skipped; the app
# tests need a live Postgres — run them separately).
COPY src ./src
RUN mvn -B -q package -DskipTests \
    && mv target/*.jar app.jar

# ---------- Stage 2: minimal runtime ----------
FROM eclipse-temurin:17-jre-jammy AS runtime

# Run as an unprivileged user, never root.
RUN useradd --system --create-home --uid 1001 estateflow \
    && mkdir -p /app \
    && chown estateflow:estateflow /app

WORKDIR /app
USER estateflow

COPY --from=build --chown=estateflow:estateflow /app/app.jar app.jar

EXPOSE 8081

# Secrets (DB_PASSWORD, JWT_SECRET, CORS_ALLOWED_ORIGINS) are
# injected as environment variables at run time — never baked
# into the image.
ENTRYPOINT ["java", "-jar", "app.jar"]
