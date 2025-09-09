import { getLMStudioBaseUrl, getLMStudioAdminUrl } from './src/utils/docker-secrets.js';

console.log('🧪 Testing LM Studio URL construction...\n');

// Debug environment variables
console.log('Environment variables:');
console.log('LM_STUDIO_BASE_URL:', process.env.LM_STUDIO_BASE_URL);
console.log('LM_STUDIO_ADMIN_URL:', process.env.LM_STUDIO_ADMIN_URL);
console.log('REMOTE_LM_STUDIO_HOST:', process.env.REMOTE_LM_STUDIO_HOST);
console.log('REMOTE_LM_STUDIO_PORT:', process.env.REMOTE_LM_STUDIO_PORT);
console.log('');

console.log('Function results:');
console.log('LM Studio Base URL:', getLMStudioBaseUrl());
console.log('LM Studio Admin URL:', getLMStudioAdminUrl());

// Check if URLs have proper /v1 suffix
const baseUrl = getLMStudioBaseUrl();
const adminUrl = getLMStudioAdminUrl();

if (baseUrl.includes('/v1')) {
  console.log('✅ Base URL has /v1 suffix');
} else {
  console.log('❌ Base URL missing /v1 suffix');
}

if (!adminUrl.includes('/v1')) {
  console.log('✅ Admin URL correctly excludes /v1 suffix');
} else {
  console.log('❌ Admin URL incorrectly includes /v1 suffix');
}

console.log('\n🎉 URL construction test completed!');