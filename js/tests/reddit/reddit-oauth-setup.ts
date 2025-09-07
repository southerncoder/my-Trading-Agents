/**
 * Reddit OAuth Setup Helper
 * 
 * This script helps you get a Reddit OAuth refresh token without needing your password.
 * Much more secure than username/password authentication!
 * 
 * Usage: npx vite-node tests/reddit/reddit-oauth-setup.ts
 */

import { createServer } from 'http';
import { parse } from 'url';
import crypto from 'crypto';

console.log('🔐 Reddit OAuth Setup Helper');
console.log('============================\n');

// Check current environment
console.log('📋 Current Environment Status:');
console.log(`   REDDIT_CLIENT_ID: ${process.env.REDDIT_CLIENT_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   REDDIT_CLIENT_SECRET: ${process.env.REDDIT_CLIENT_SECRET ? '✅ SET' : '❌ MISSING'}\n`);

if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  console.log('❌ ERROR: Missing Reddit app credentials');
  console.log('\n🛠️  Please ensure you have set:');
  console.log('   REDDIT_CLIENT_ID=your_client_id');
  console.log('   REDDIT_CLIENT_SECRET=your_client_secret');
  console.log('\n📱 Get these from: https://www.reddit.com/prefs/apps/');
  process.exit(1);
}

// OAuth configuration
const CLIENT_ID = process.env.REDDIT_CLIENT_ID!;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDDIT_REDIRECT_URI || 'http://localhost:5786/reddit/callback';
const SCOPE = 'read submit identity'; // Permissions we need
const STATE = crypto.randomBytes(16).toString('hex'); // CSRF protection
const SERVER_PORT = parseInt(process.env.REDDIT_CALLBACK_PORT || '5786');

console.log('🚀 Starting OAuth Flow Setup...\n');

// Create temporary server to handle OAuth callback
const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url!, true);
  
  if (parsedUrl.pathname === '/reddit/callback') {
    const { code, state, error } = parsedUrl.query;
    
    if (error) {
      console.log('❌ OAuth Error:', error);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>❌ OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Please close this window and try again.</p>
          </body>
        </html>
      `);
      return;
    }
    
    if (state !== STATE) {
      console.log('❌ Invalid state parameter (CSRF protection)');
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>❌ Invalid State</h1>
            <p>CSRF protection failed. Please try again.</p>
          </body>
        </html>
      `);
      return;
    }
    
    if (code) {
      console.log('✅ Authorization code received!');
      console.log('🔄 Exchanging code for refresh token...\n');
      
      try {
        // Exchange authorization code for refresh token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'TradingAgents:v1.0.0 (by /u/your_reddit_username)'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: REDIRECT_URI
          }).toString()
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(`Token error: ${tokenData.error} - ${tokenData.error_description}`);
        }
        
        const refreshToken = tokenData.refresh_token;
        const accessToken = tokenData.access_token;
        
        console.log('🎉 SUCCESS! OAuth tokens received');
        console.log('======================================\n');
        
        console.log('📝 Add this to your js/.env.local file:');
        console.log('==========================================');
        console.log(`REDDIT_REFRESH_TOKEN=${refreshToken}`);
        console.log('');
        console.log('# Comment out or remove these lines since we\'re using OAuth now:');
        console.log('# REDDIT_USERNAME=your_reddit_username');
        console.log('# REDDIT_PASSWORD=your_reddit_password_here');
        console.log('==========================================\n');
        
        console.log('🔍 Token Details:');
        console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
        console.log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`);
        console.log(`   Scope: ${tokenData.scope}`);
        console.log(`   Expires: ${tokenData.expires_in} seconds\n`);
        
        console.log('✅ Next Steps:');
        console.log('1. Copy the REDDIT_REFRESH_TOKEN line above');
        console.log('2. Add it to your js/.env.local file');
        console.log('3. Comment out REDDIT_USERNAME and REDDIT_PASSWORD');
        console.log('4. Test with: npx vite-node tests/reddit/test-reddit-auth-diagnostic.ts\n');
        
        // Success page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head>
              <title>Reddit OAuth Success</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .success { color: #28a745; }
                .token { background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; }
                .step { margin: 10px 0; }
              </style>
            </head>
            <body>
              <h1 class="success">🎉 Reddit OAuth Setup Complete!</h1>
              <p>Your refresh token has been generated successfully.</p>
              
              <h3>📝 Add this to your js/.env.local file:</h3>
              <div class="token">REDDIT_REFRESH_TOKEN=${refreshToken}</div>
              
              <h3>✅ Next Steps:</h3>
              <div class="step">1. Copy the token above to your .env.local file</div>
              <div class="step">2. Comment out REDDIT_USERNAME and REDDIT_PASSWORD</div>
              <div class="step">3. Test with: npx vite-node tests/reddit/test-reddit-auth-diagnostic.ts</div>
              
              <p><strong>You can now close this window.</strong></p>
              
              <script>
                // Auto-copy token to clipboard if possible
                navigator.clipboard.writeText('REDDIT_REFRESH_TOKEN=${refreshToken}').then(() => {
                  console.log('Token copied to clipboard!');
                }).catch(() => {
                  console.log('Could not copy token automatically');
                });
              </script>
            </body>
          </html>
        `);
        
        // Shutdown server after successful completion
        setTimeout(() => {
          console.log('🔐 OAuth setup complete. Server shutting down...');
          server.close();
          process.exit(0);
        }, 2000);
        
      } catch (error) {
        console.error('❌ Token exchange failed:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>❌ Token Exchange Failed</h1>
              <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
              <p>Please close this window and try again.</p>
            </body>
          </html>
        `);
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>❌ No Authorization Code</h1>
            <p>No authorization code received. Please try again.</p>
          </body>
        </html>
      `);
    }
  } else {
    // Default page
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>Reddit OAuth Helper</h1>
          <p>Waiting for OAuth callback...</p>
        </body>
      </html>
    `);
  }
});

// Start server
server.listen(SERVER_PORT, () => {
  console.log(`🌐 OAuth callback server started on http://localhost:${SERVER_PORT}`);
  
  // Generate authorization URL
  const authUrl = new URL('https://www.reddit.com/api/v1/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', STATE);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('duration', 'permanent'); // Get refresh token
  authUrl.searchParams.append('scope', SCOPE);
  
  console.log('\n🔗 Please open this URL in your browser:');
  console.log('==========================================');
  console.log(authUrl.toString());
  console.log('==========================================\n');
  
  console.log('📱 What happens next:');
  console.log('1. Browser opens Reddit authorization page');
  console.log('2. Log in with your Google-connected Reddit account');
  console.log('3. Click "Allow" to authorize the app');
  console.log('4. You\'ll be redirected back with your refresh token');
  console.log('5. Copy the token to your .env.local file\n');
  
  console.log('⏳ Waiting for authorization...\n');
  
  // Auto-open browser if possible
  const open = async (url: string) => {
    const { spawn } = await import('child_process');
    const start = process.platform === 'win32' ? 'start' : 
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', url]);
    } else {
      spawn(start, [url]);
    }
  };
  
  // Try to open browser automatically
  setTimeout(() => {
    open(authUrl.toString()).catch(() => {
      console.log('💡 Could not auto-open browser. Please copy the URL above manually.');
    });
  }, 1000);
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 OAuth setup cancelled by user');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 OAuth setup terminated');
  server.close();
  process.exit(0);
});