// Chromium regression checks for dialogue bounds and save lifecycle.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const context=await browser.newContext();const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
 assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),0);
 await page.locator('[name=playerName]').fill('Гость');await page.getByRole('button',{name:'Начать',exact:true}).click();
 await page.getByRole('heading',{name:'Что такое «Я — специалист»?'}).waitFor();await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Удалить сохранение',exact:true}).count(),1);
 // A real saved step survives HTTP cache clearing; game data is separate.
 await page.evaluate(()=>{const key='ya-specialist/save/v1';const s=JSON.parse(localStorage.getItem(key));s.nodeIndex=2;localStorage.setItem(key,JSON.stringify(s));});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.clearBrowserCache');await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),1);
 await page.getByRole('button',{name:'Удалить сохранение',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ya-specialist/save/v1')),null);
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.getByRole('button',{name:'Продолжить',exact:true}).count(),0);
 console.log('PASS: fresh menu, name-only save, HTTP cache separation, explicit deletion and reload');
 // Render actual dialogue with the longest character label in multiple viewports.
 await page.evaluate(async()=>{
  const {UI}=await import('/src/ui.ts');const {characters}=await import('/src/content.ts');
  document.querySelector('#app').remove();const root=document.createElement('div');root.id='app';document.body.append(root);
  window.ui=new UI(root);document.documentElement.classList.add('a11y-still');
  window.director=characters.get('director-college');
  void window.ui.say({kind:'say',who:window.director,name:window.director.name,text:'Теперь вы готовы к взрослой жизни. Успехов вам в профессии и в жизни!'});
 });
 for(const size of [{width:1440,height:900},{width:792,height:303},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(size);
  for(const large of [false,true]){
   await page.evaluate(l=>document.documentElement.classList.toggle('a11y-large',l),large);
   const positions=await page.locator('.panel').evaluate(p=>{const b=p.getBoundingClientRect();return [...p.querySelectorAll('.panel__speaker,.panel__line,.panel__hint')].map(el=>{const r=el.getBoundingClientRect();return {name:el.className,inside:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};});});
   assert.ok(positions.every(p=>p.inside),JSON.stringify({size,large,positions}));
   const dock=await page.locator('.dock').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));assert.ok(dock.scroll<=dock.client+1,JSON.stringify({size,dock}));
  }
 }

 // Very long line must expand the panel and scroll the dock, without overflowing the bubble.
 await page.evaluate(()=>{void window.ui.say({kind:'say',who:window.director,name:window.director.name,text:'Длинная учебная реплика. '.repeat(70)});});
 const long=await page.locator('.panel').evaluate(p=>({scroll:p.scrollHeight,client:p.clientHeight}));assert.ok(long.scroll<=long.client+1,JSON.stringify(long));
 assert.deepEqual(errors,[]);console.log('PASS: labels, text and next indicator inside dialogue at 4 viewport sizes, both font settings and long text');
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
