import { shutdown } from '../observability/opentelemetry-setup';

export function attachShutdownHandlers() {
  const doShutdown = async () => {
    try {
      await shutdown();
    } catch (_e) {
      // ignore
    }
  };

  process.on('exit', () => { void doShutdown(); });
  process.on('SIGINT', async () => { await doShutdown(); process.exit(0); });
  process.on('SIGTERM', async () => { await doShutdown(); process.exit(0); });
}

export default attachShutdownHandlers;
