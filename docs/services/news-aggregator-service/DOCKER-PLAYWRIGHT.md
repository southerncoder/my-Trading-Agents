Playwright in Docker

This service uses Playwright for robust scraping. Playwright requires browser binaries which must be installed inside the Docker image at build time.

What we changed

- The Dockerfile uses `node:18-bullseye-slim` and runs `npx playwright install --with-deps` during image build.

Notes for CI / production

- Ensure your CI pipeline rebuilds the Docker image after these changes so Playwright browsers are included.
- If you run containers locally and Playwright was added after the last build, rebuild the image:

```powershell
# from repository root
cd services/news-aggregator-service
docker build -t news-aggregator-service:latest .
```

- If you prefer to avoid installing browsers in the image during CI, you can run `npx playwright install` as part of your container startup, but this will slow container start times and is not recommended for production.

Security & size

- Playwright browsers increase image size. Consider a multi-stage build or keeping Playwright only in services that require it.
- The base image and installed packages may produce vulnerability notices from automated scanners. Keep base images updated and rebuild periodically.
