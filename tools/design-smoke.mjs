import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.audioNotes=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.audioNotes++;window.testAudio=this;return original.call(this);};});
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({environment:'dev'})}));await page.goto(server.resolvedUrls.local[0]);
 await page.evaluate(async()=>{
  const {UI}=await import('/src/ui.ts');const {installLearningTools}=await import('/src/learning.ts');const {newGame}=await import('/src/state.ts');const {scenes}=await import('/src/content.ts');const {Engine}=await import('/src/engine.ts');
  const root=document.querySelector('#app');const ui=new UI(root);const state=newGame('Александра','f');installLearningTools(root,()=>state);ui.setBackground('hero-room');
  window.design={ui,state,scenes,Engine};
 });
 await page.locator('[data-setting=still]').click();
 for(const passed of [true,false]){
  await page.evaluate(passed=>{const {ui,state,scenes,Engine}=window.design;state.flags.testPassed=passed;const scene=scenes.get('test');window.outroDone=false;void new Engine(ui,state).playNode(scene.nodes.find(n=>n.id==='outro'),scene).then(()=>window.outroDone=true);},passed);
  const text=await page.locator('.panel__line').textContent();assert.equal(text.includes('Даже если не получилось'),!passed);if(passed)assert.ok(text.includes('прошла') || text.includes('справилась'));
  await page.locator('.panel').click();await page.waitForFunction(()=>window.outroDone);
 }
 await page.evaluate(async()=>{const {runResume}=await import('/src/screens/resume.ts');const {ui,state,scenes}=window.design;void runResume(ui,state,scenes.get('resume').nodes.find(n=>n.form).form);});
 const school=page.locator('[data-field=school]');await school.waitFor({state:'visible'});assert.equal(await school.inputValue(),'ГБПОУ «Челябинский радиотехнический техникум»');
 await school.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/education-desktop.png'});
 await page.setViewportSize({width:390,height:900});await page.waitForFunction(()=>{const e=document.querySelector('[data-field=school]');return e.scrollHeight<=e.clientHeight+2;});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await school.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/education-mobile.png'});
 await page.locator('[data-field=specialty]').selectOption('dev');await page.getByRole('button',{name:'Сохранить',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{void window.design.ui.achievement('🏅','Первый рабочий день','Пройти первый рабочий день и справиться с задачами команды');});
 await page.getByRole('heading',{name:'Первый рабочий день',exact:true}).waitFor({state:'visible'});assert.equal(await page.locator('.reward__medal').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.locator('[data-setting=still]').click();assert.equal(await page.locator('.reward__medal').evaluate(e=>getComputedStyle(e).animationName),'medal-float');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.reward__medal').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.screenshot({path:'/tmp/achievement-new.png'});await page.getByRole('button',{name:'Здорово! Продолжить',exact:true}).click();
 await page.evaluate(()=>{void window.design.ui.card('📘','Основы трудового договора');});await page.screenshot({path:'/tmp/knowledge-new.png'});await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.evaluate(async()=>{const {runCompare}=await import('/src/screens/labor.ts');const {scenes,ui}=window.design;const node=scenes.get('labor').nodes.find(n=>n.screen==='compare');void runCompare(ui,node.columns,node.summary);});
 await page.locator('[data-folder="0"]').click();await page.locator('[data-folder="1"]').click();await page.screenshot({path:'/tmp/contracts-new.png'});assert.equal(await page.locator('[data-done]').isEnabled(),true);await page.locator('[data-done]').click();
 assert.equal(await page.evaluate(()=>window.audioNotes),0);await page.locator('[data-sound]').click();await page.waitForFunction(()=>window.audioNotes>=3);assert.equal(await page.evaluate(()=>window.testAudio.state),'running');
 await page.locator('.sound-settings summary').click();await page.locator('[data-volume]').evaluate(e=>{e.value='25';e.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.evaluate(()=>localStorage.getItem('ya-specialist/volume')),'0.25');await page.locator('[data-music]').uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('ya-specialist/music')),'false');await page.locator('[data-sound]').click();await page.waitForFunction(()=>window.testAudio.state==='suspended');await page.locator('.sound-settings summary').click();
 await page.evaluate(async()=>{const {runFinal}=await import('/src/screens/final.ts');const {ui,state}=window.design;state.learning.final=4;state.learning.finalForm='transfer-v2';state.achievements=['first-day','informed-choice'];window.finalDone=false;void runFinal(ui,state,'Итоги игры',[{label:'Карьера',value:'Специалист по рекламе в компании «Рекламист»'},{label:'Резюме',value:'Готово к первым откликам'},{label:'Навыки',value:'Ответственность и внимательность'},{label:'Финальный статус',value:'Начало пути'}],'Пройти заново').then(()=>window.finalDone=true);});
 await page.getByRole('heading',{name:'Итоги игры',exact:true}).waitFor({state:'visible'});const finalTitle=await page.getByRole('heading',{name:'Итоги игры',exact:true}).boundingBox();const bar=await page.locator('.learning-tools').boundingBox();assert.ok(finalTitle.y>=bar.y+bar.height);assert.equal(await page.locator('.final-stat').count(),4);assert.equal(await page.locator('.ach.is-earned').count(),2);await page.screenshot({path:'/tmp/final-new.png'});
 await page.setViewportSize({width:390,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/final-new-mobile.png'});
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();await page.locator('[data-vision-key=palette][data-value=dark]').click();assert.equal(await page.locator('.final-stat').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();await page.getByRole('button',{name:'Пройти заново',exact:true}).click();await page.waitForFunction(()=>window.finalDone);
 assert.deepEqual(errors,[]);console.log('PASS: conditional success/failure outro, full school text on mobile, rewards and reduced motion, contracts, opt-in audio/volume/music/mute, final cards and earned badges, high contrast and restart');
}finally{if(browser)await browser.close();await server.close();}
