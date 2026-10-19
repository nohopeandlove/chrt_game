const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 try {
 const page=await browser.newPage();
 await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5174');
 async function begin(){await page.evaluate(async()=>{
  const {UI}=await import('/src/ui.ts');const {newGame}=await import('/src/state.ts');const {runPortfolio}=await import('/src/screens/portfolio.ts');
  const root=document.querySelector('#app');window.student=newGame('Тест','f');window.ui=new UI(root);window.done=false;
  void runPortfolio(window.ui,window.student).then(()=>window.done=true);
 });}
 await begin();
 await page.locator('[data-submit]').click();assert.match(await page.locator('[data-verdict]').innerText(),/ровно три/);
 await page.locator('[data-work="case"]').dragTo(page.locator('[data-zone="selected"]'));
 assert.equal(await page.locator('[data-zone="selected"] [data-work]').count(),1);
 for(const id of ['team','practice'])await page.locator(`[data-toggle="${id}"]`).click();
 await page.locator('[data-toggle="claims"]').click();assert.equal(await page.locator('[data-zone="selected"] [data-work]').count(),3);
 await page.locator('[data-toggle="team"]').click();assert.equal(await page.locator('[data-zone="selected"] [data-work]').count(),2);
 await page.locator('[data-toggle="team"]').click();await page.locator('[data-submit]').click();
 assert.match(await page.locator('[data-verdict]').innerText(),/100%/);assert.equal(await page.locator('.work-feedback').count(),6);
 assert.equal(await page.evaluate(()=>window.student.analytics.outcomes[0].earned),3);
 await page.locator('[data-submit]').dblclick();assert.equal(await page.evaluate(()=>window.student.scales.confidence),1);
 await begin();for(const id of ['diploma','borrowed','claims'])await page.locator(`[data-toggle="${id}"]`).click();await page.locator('[data-submit]').click();
 assert.equal(await page.evaluate(()=>window.student.scales.confidence),-1);
 const summary=await page.evaluate(async()=>{
  const {summarizeScene}=await import('/src/screens/scene-summary.ts');let rows;
  await summarizeScene({table:async(title,r)=>{rows=r}},window.student,{id:'portfolio',title:'Портфолио'},Object.fromEntries(Object.keys(window.student.scales).map(k=>[k,0])));
  const {parseReport,makeReport,reportsCsv}=await import('/src/reporting.ts');
  return {rows,parsed:parseReport(JSON.stringify(makeReport(window.student,true))),csv:reportsCsv([makeReport(window.student,true)])};
 });
 assert.ok(summary.rows.some(r=>r.label==='Уверенность' && r.value.includes('За сцену: −1')));assert.ok(summary.parsed);assert.match(summary.csv,/Портфолио, %/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // The achievement follows the real gated comparison; the hasty reply cannot award it.
 await page.evaluate(async()=>{
  const {Engine}=await import('/src/engine.ts');const {scenes}=await import('/src/content.ts');const {newGame}=await import('/src/state.ts');
  window.student=newGame('Тест','f');window.awards=[];const ui={screen:window.ui.screen.bind(window.ui),achievement:async(_icon,title)=>window.awards.push(title)};
  const engine=new Engine(ui,window.student);const scene=scenes.get('labor');
  window.compareDone=false;void engine.playNode(scene.nodes.find(n=>n.screen==='compare'),scene).then(()=>window.compareDone=true);
 });
 assert.equal(await page.locator('[data-done]').isDisabled(),true);
 await page.locator('[data-folder="0"]').click();assert.equal(await page.locator('[data-done]').isDisabled(),true);
 await page.locator('[data-folder="1"]').click();await page.locator('[data-done]').click();await page.waitForFunction(()=>window.compareDone);
 assert.deepEqual(await page.evaluate(()=>window.student.achievements),['informed-choice']);
 const transitions=await page.evaluate(async()=>{
  const {Engine}=await import('/src/engine.ts');const {newGame}=await import('/src/state.ts');const {scenes}=await import('/src/content.ts');
  const state=newGame('Тест','f');const summaries=[];
  const ui={setBackground(){},say:async()=>{},choice:async()=>0,chapter:async()=>{},table:async(title,rows)=>summaries.push({title,rows})};
  const engine=new Engine(ui,state);const next=await engine.playScene(scenes.get('prologue'));
  const initial=summaries.splice(0);
  await engine.playScene({id:'check',title:'Проверка',nodes:[{id:'choice',type:'choice',options:[{text:'Выбор',effects:{confidence:-1}}]},{id:'result',type:'results',rows:[]},{id:'next',type:'goto',scene:'resume'}]});
  return {next,initial,summaries};
 });
 assert.equal(transitions.next,'portfolio');assert.equal(transitions.initial.length,1);
 assert.ok(transitions.initial[0].rows.some(r=>r.label==='Энергия' && r.value.includes('За сцену: +2')));
 assert.equal(transitions.summaries.length,1);assert.ok(transitions.summaries[0].rows.some(r=>r.label==='Уверенность' && r.value.includes('За сцену: −1')));
 console.log('PASS: scene transitions show actual deltas once, including existing results nodes');
 console.log('PASS: drag/drop, button fallback, selection limits, feedback, scoring, actual deltas, CSV, mobile layout and gated achievement');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
