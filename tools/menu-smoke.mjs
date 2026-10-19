import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();let browser;
try {
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({environment:'dev'})}));
 await page.goto(server.resolvedUrls.local[0]);await page.locator('.menu__entry').waitFor();await page.locator('[data-setting=still]').click();
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.hero__art image')].map(async e=>{const i=new Image();i.src=e.getAttribute('href');await i.decode();}));});
 for(const [width,height] of [[1440,1000],[1024,768],[768,1024],[390,844],[320,700]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.evaluate(()=>document.querySelector('.overlay').scrollTop=0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.menu').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`Menu overflow at ${width}`);
  const title=await page.locator('.menu__title').boundingBox();const toolbar=await page.locator('.learning-tools').boundingBox();assert.ok(title.y>=toolbar.y+toolbar.height,`Title hidden at ${width}`);const intro=await page.locator('.menu__intro').boundingBox();assert.ok(await page.locator('.menu__title').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`Clipped title at ${width}`);assert.ok(title.x>=intro.x && title.x+title.width<=intro.x+intro.width+1);
  const campus=await page.locator('.menu__campus').evaluate(e=>getComputedStyle(e).backgroundImage);assert.ok(campus.includes('crt-campus'));
  const url=campus.match(/url\("?([^"\)]+)/)[1];assert.equal((await page.request.get(url)).status(),200);
  if(width===1440)await page.screenshot({path:'/tmp/menu-new-desktop.png'});
  if(width===390){await page.screenshot({path:'/tmp/menu-new-mobile-cover.png'});await page.locator('.menu__entry').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/menu-new-mobile-form.png'});}
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Начать',exact:true}).click();await page.locator('.menu__error').waitFor();assert.equal(await page.locator('[name=playerName]').evaluate(e=>document.activeElement===e),true);
 const castHeight=await page.locator('.heroes').evaluate(e=>e.getBoundingClientRect().height);
 assert.equal(await page.locator('[data-character="hero-f"]').getAttribute('data-emotion'),'joy');
 assert.equal(await page.locator('[data-character="hero-m"]').getAttribute('data-emotion'),'neutral');
 await page.locator('.hero').nth(1).click();assert.equal(await page.locator('[name=gender][value=m]').isChecked(),true);
 assert.equal(await page.locator('[data-character="hero-f"]').getAttribute('data-emotion'),'neutral');
 assert.equal(await page.locator('[data-character="hero-m"]').getAttribute('data-emotion'),'joy');
 const selectedArt=await page.locator('.hero:has(input:checked) .hero__art').boundingBox();const otherArt=await page.locator('.hero:not(:has(input:checked)) .hero__art').boundingBox();
 assert.ok(selectedArt.height>otherArt.height*1.2);assert.equal(await page.locator('.heroes').evaluate(e=>e.getBoundingClientRect().height),castHeight);

 await page.locator('[name=gender][value=m]').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('[name=gender][value=f]').isChecked(),true);assert.equal(await page.locator('[data-character="hero-f"]').getAttribute('data-emotion'),'joy');assert.equal(await page.locator('[data-character="hero-m"]').getAttribute('data-emotion'),'neutral');
 assert.equal(await page.locator('.menu').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();await page.locator('[data-vision-key=palette][data-value=dark]').click();
 assert.equal(await page.locator('.menu__intro').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');assert.equal(await page.locator('.menu__title span').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
 await page.locator('[data-vision-key=images][data-value=hidden]').click();assert.equal(await page.locator('.hero__art').first().evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await page.locator('.hero__label').first().isVisible(),true);
 await page.locator('[data-vision-key=palette][data-value=default]').click();await page.locator('[data-vision-key=images][data-value=color]').click();await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.locator('[name=playerName]').fill('Тестовый герой');await page.locator('[name=group]').fill('ТЕСТ-1');await page.getByRole('button',{name:'Начать',exact:true}).click();await page.getByRole('button',{name:'Перейти к истории',exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ya-specialist/save/v1')));assert.equal(saved.playerName,'Тестовый герой');assert.equal(saved.analytics.group,'ТЕСТ-1');
 await page.reload();await page.locator('.menu__saved').waitFor();
 await page.locator('[data-action=delete-save]').click();assert.equal(await page.locator('.menu__saved').count(),0);assert.equal(await page.locator('[name=playerName]').isVisible(),true);
 // Exercise the resume action independently of whether the real save has a chapter yet.
 await page.evaluate(async()=>{const {UI}=await import('/src/ui.ts');window.menuUI=new UI(document.querySelector('#app'));void window.menuUI.menu(true,true,'Собеседование').then(r=>window.menuResult=r);});
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.waitForFunction(()=>window.menuResult==='continue');
 assert.deepEqual(errors,[]);console.log('PASS: illustrated landing at 5 widths, campus asset, keyboard character selection, joy on selection, visible size difference without layout jumps, validation and game start, saved progress/delete/resume, reduced motion, high contrast and hidden images');
}finally{if(browser)await browser.close();await server.close();}
