# =============================================================
#  EstateFlow — Frontend runtime from a PREBUILT Vite bundle.
#
#  The Docker build context for this image is a folder that
#  contains ONLY the compiled dist/ output (staged by
#  build-release.ps1). No Node, no npm, no source code.
# =============================================================

FROM nginx:alpine

# SPA configuration: unknown paths fall back to index.html
# so React Router paths like /security or /visits work on
# refresh / direct entry.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
