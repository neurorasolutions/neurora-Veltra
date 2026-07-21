import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => { 
    const type = msg.type();
    if (type === 'error' || type === 'warning') errors.push(`[${type}] ${msg.text()}`); 
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

  // Override the supabase module before the app loads
  await page.addInitScript(() => {
    // Create a fake session in localStorage with proper format
    const ref = 'acquvpgmitvkykdppbkv';
    const fakeSession = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInN1YiI6ImNlNTdmMzYwLWVhYzMtNDI1YS1iYTY2LTRmMzgyZWM2Yzc0MCIsImVtYWlsIjoidGVzdEBuZXVyb3JhLmRldiIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYXVkIjoiYXV0aGVudGljYXRlZCJ9.fake',
      refresh_token: 'fake',
      expires_in: 999999999,
      expires_at: 999999999,
      token_type: 'bearer',
      user: {
        id: 'ce57f360-eac3-425a-ba66-4f382ec6c740',
        aud: 'authenticated',
        email: 'test@neurora.dev',
        role: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Test User' },
        created_at: new Date().toISOString(),
      },
    };
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(fakeSession));
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(6000);
  console.log('URL after load:', page.url());
  console.log('Body text snippet:', (await page.textContent('body')).slice(0, 200));

  await page.goto('http://localhost:5173/#/impostazioni');
  await page.waitForTimeout(6000);
  console.log('\nURL after nav:', page.url());
  console.log('Body text snippet:', (await page.textContent('body')).slice(0, 300));

  const allButtons = await page.$$('button');
  console.log('\nButtons:');
  for (const btn of allButtons) {
    const text = (await btn.textContent()).trim();
    if (text.length < 50) console.log(`  "${text}"`);
  }

  console.log('\nErrors:', errors.slice(0, 5));
  await page.screenshot({ path: '/tmp/impostazioni_test.png', fullPage: true });
  await browser.close();
}

main().catch(console.error);
