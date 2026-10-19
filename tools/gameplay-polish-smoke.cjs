const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 try {
  const page=await browser.newPage();await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  const startJobs=async specialty=>page.evaluate(async sp=>{
   const {UI}=await import('/src/ui.ts');const {newGame}=await import('/src/state.ts');const {runJobs}=await import('/src/screens/jobs.ts');
   window.state=newGame('Тест','f');window.state.specialty=sp;window.ui=new UI(document.querySelector('#app'));window.jobsDone=false;
   void runJobs(window.ui,window.state).then(()=>window.jobsDone=true);
  },specialty);
  await startJobs('ads');
  for(const id of ['remote-scam','easy-money']) {
   await page.locator(`[data-open="${id}"]`).click();
   assert.equal(await page.locator('[data-scam-warning]').isVisible(),false);
   const input=page.locator('[data-scam-field]').first();assert.equal(await input.isEnabled(),true);
   await input.focus();assert.match(await page.locator('[data-scam-warning]').innerText(),/Опасно: это мошенники/);
   await page.keyboard.insertText('123456');assert.equal(await input.inputValue(),'');
   await page.locator('[data-back]').last().click();await page.getByRole('heading',{name:'Вакансии',exact:true}).waitFor();
   await page.locator(`[data-open="${id}"]`).click();await page.locator('[data-back]').first().click();
   await page.getByRole('heading',{name:'Вакансии',exact:true}).waitFor();
  }
  const all=await page.evaluate(async()=>{const {vacancies}=await import('/src/content.ts');return vacancies.filter(v=>v.kind==='real')});
  for(const sp of ['ads','dev','infosec','netadmin'])assert.ok(all.filter(v=>v.specialties.includes(sp)).length>=2);
  for(const v of all) {
   await startJobs(v.specialties[0]);await page.locator(`[data-open="${v.id}"]`).click();
   await page.locator('[data-letter]').fill(`Здравствуйте! ${v.secretWord}`);await page.getByRole('button',{name:'Откликнуться',exact:true}).click();
   await page.locator('[data-next]').click();await page.waitForFunction(()=>window.jobsDone);
   assert.equal(await page.evaluate(()=>window.state.job.id),v.id);
  }
  const endings=await page.evaluate(async()=>{
   const {fill}=await import('/src/text.ts');const {newGame}=await import('/src/state.ts');const {scenes}=await import('/src/content.ts');
   return ['dev','infosec','netadmin','ads'].map(sp=>['m','f'].map(g=>{const s=newGame('Тест',g);s.specialty=sp;return fill(scenes.get('first-day').nodes.find(n=>n.id==='evening').text,s)}));
  });
  assert.equal(new Set(endings.map(a=>a[0])).size,4);
  for(const pair of endings)for(const text of pair){assert.ok(!text.includes('{'));assert.equal(text.split('Первый день позади.').length,2)}
  assert.ok(!endings[3].some(t=>t.includes('код')));assert.ok(endings[3][1].includes('разобралась'));
  const rows=await page.evaluate(async()=>{
   const {summarizeScene}=await import('/src/screens/scene-summary.ts');const {newGame}=await import('/src/state.ts');const state=newGame('Тест','f');const start={...state.scales};state.scales.mood=1;let result;
   await summarizeScene({table:async(_title,r)=>{result=r}},state,{title:'Тест'},start);return result;
  });assert.deepEqual(rows,[{label:'Настроение',value:'Было: 0 → Стало: 1\nЗа сцену: +1'}]);
  await page.evaluate(async()=>{
   const {runFinal}=await import('/src/screens/final.ts');window.state.learning.final=3;window.state.learning.finalForm='transfer-v2';void runFinal(window.ui,window.state,'Итоги',[],'Заново');
  });
  await page.getByRole('heading',{name:'Итоги',exact:true}).waitFor();
  assert.ok(!(await page.locator('.final').innerText()).includes('Выберите действие после игры'));
  console.log('PASS: scam warning on focus without collecting card data, both exit buttons, all eight real vacancies accept matching specialty/secret word, unique gender-aware endings, clean scene and final results');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
