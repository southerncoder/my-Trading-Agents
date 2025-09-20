// Manual test migrated from root: test-lmstudio-urls.js
// Purpose: Validate LM Studio URL construction helpers.

import { getLMStudioBaseUrl, getLMStudioAdminUrl } from '../../src/utils/docker-secrets.js';

console.log('🧪 LM Studio URL construction manual test');
console.log('Env Snapshot:');
['LM_STUDIO_BASE_URL','LM_STUDIO_ADMIN_URL','REMOTE_LM_STUDIO_HOST','REMOTE_LM_STUDIO_PORT']
  .forEach(v => console.log(`${v}:`, process.env[v]));

const baseUrl = getLMStudioBaseUrl();
const adminUrl = getLMStudioAdminUrl();
console.log('Base URL:', baseUrl);
console.log('Admin URL:', adminUrl);
console.log(baseUrl.includes('/v1') ? '✅ base /v1 suffix ok' : '❌ base missing /v1');
console.log(!adminUrl.includes('/v1') ? '✅ admin no /v1 suffix' : '❌ admin includes /v1');
console.log('✅ URL construction manual test complete');
