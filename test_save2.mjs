import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true, executablePath: undefined,
const page = await browser.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

await page.goto('http://localhost:5173/');
await page.waitForTimeout(3000);

console.log('URL after load:', page.url());

await page.goto('http://localhost:5173/#/impostazioni');
await page.waitForTimeout(3000);
console.log('URL after nav:', page.url());

const content = await page.content();
console.log('Has "Salva":', content.includes('Salva'));
console.log('Has "Verifica":', content.includes('Verifica salvataggio'));
console.log('Has "provider LLM":', content.includes('provider LLM'));
console.log('Has login form:', content.includes('Accedi') || content.includes('email'));

await page.screenshot({ path: '/tmp/impostazioni_test.png', fullPage: true });

console.log('Errors:', errors);
await browser.close();
