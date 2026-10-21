# =============================================================
#  EstateFlow — Backend runtime from a PREBUILT executable JAR.
#
#  The Docker build context for this image is a folder that
#  contains ONLY the compiled jar (staged as app.jar by
#  build-release.ps1). No source code, no Maven, no downloads.
# =============================================================

FROM eclipse-temurin:17-jre-jammy

# Run as an unprivileged user, never root.
RUN useradd --system --create-home --uid 1001 estateflow \
    && mkdir -p /app \
    && chown estateflow:estateflow /app

WORKDIR /app
USER estateflow

COPY app.jar app.jar

EXPOSE 8081

# Secrets (DB_PASSWORD, JWT_SECRET, CORS_ALLOWED_ORIGINS) are
# injected as environment variables at run time by
# docker-compose.prod.yml — never baked into the image.
ENTRYPOINT ["java", "-jar", "app.jar"]
