const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 try{
  const page=await browser.newPage();await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
   Math.random=()=>0;const {UI}=await import('/src/ui.ts');window.ui=new UI(document.querySelector('#app'));
   window.picked=null;void window.ui.choice({options:['Первый исходный','Второй исходный','Третий исходный']}).then(i=>window.picked=i);
  });
  assert.deepEqual(await page.locator('.choices .choice').evaluateAll(nodes=>nodes.map(n=>n.dataset.index)),['1','2','0']);
  assert.deepEqual(await page.locator('.choices .choice__num').allTextContents(),['1','2','3']);
  await page.keyboard.press('1');await page.waitForFunction(()=>window.picked!==null);assert.equal(await page.evaluate(()=>window.picked),1);
  await page.evaluate(async()=>{
   const {Engine}=await import('/src/engine.ts');const {newGame}=await import('/src/state.ts');window.state=newGame('Тест','f');window.done=false;
   const engine=new Engine(window.ui,window.state);void engine.playNode({id:'shuffle',type:'choice',options:[{text:'Положительный',effects:{confidence:1},score:1},{text:'Отрицательный',effects:{confidence:-1},score:-1}]},{id:'interview'}).then(()=>window.done=true);
  });
  await page.locator('.choices .choice').first().click();await page.waitForFunction(()=>window.done);
  assert.equal(await page.evaluate(()=>window.state.scales.confidence),-1);assert.equal(await page.evaluate(()=>window.state.interview.bad),1);
  await page.evaluate(async()=>{
   const {tests}=await import('/src/content.ts');const {runTest}=await import('/src/screens/test.ts');window.state.specialty=tests.sets[0].specialty;
   window.correct=tests.sets[0].questions.map(q=>q.correct);window.done=false;void runTest(window.ui,window.state).then(()=>window.done=true);
  });
  for(const correct of await page.evaluate(()=>window.correct)){
   const order=await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.dataset.answer));assert.deepEqual(order,Array.from({length:order.length-1},(_,i)=>String(i+1)).concat('0'));
   await page.locator(`[data-answer="${correct}"]`).click();
   assert.deepEqual(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.dataset.answer)),order);
   assert.equal(await page.locator(`[data-answer="${correct}"].is-right`).count(),1);
   await page.locator('[data-next]').click();
  }
  assert.equal(await page.evaluate(()=>window.state.analytics.outcomes.at(-1).earned),4);
  assert.ok((await page.locator('.curtain').innerText()).includes('Верных ответов: 4 из 4'));
  await page.locator('[data-next]').click();await page.waitForFunction(()=>window.done);
  for(const answer of [2,0]){
   await page.evaluate(async()=>{
    const {runQuiz}=await import('/src/screens/labor.ts');window.quizResult=null;window.answer=null;
    void runQuiz(window.ui,[{text:'Вопрос',options:['Ошибка','Другой ответ','Верный ответ'],correct:2}],[{when:'1/1',hint:'успех'},{when:'0',hint:'ошибка'}],(correct)=>window.quizScore=correct,(_q,picked)=>window.answer=picked).then(r=>window.quizResult=r);
   });
   assert.deepEqual(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.dataset.answer)),['1','2','0']);
   await page.locator(`[data-answer="${answer}"]`).click();assert.equal(await page.evaluate(()=>window.answer),answer);
   assert.equal(await page.locator('[data-answer="2"].is-right').count(),1);
   await page.locator('[data-next]').click();await page.waitForFunction(()=>window.quizResult!==null);assert.equal(await page.evaluate(()=>window.quizScore),answer===2?1:0);
  }
  await page.evaluate(async()=>{const {assessment}=await import('/src/learning.ts');void assessment(window.ui,window.state,'baseline')});
  for(const [i,correct] of [1,2,0].entries()){
   assert.deepEqual(await page.locator(`[name=q${i}]`).evaluateAll(nodes=>nodes.map(n=>n.value)),['1','2','0']);
   await page.locator(`[name=q${i}][value="${correct}"]`).check();
  }
  await page.getByRole('button',{name:'Проверить ответы',exact:true}).click();await page.getByRole('heading',{name:'Результат: 3 из 3',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.state.learning.baseline),3);
  console.log('PASS: shuffled display positions and numbering, keyboard/click mapping, correct story effects, stable test review order, test/quiz scoring and callbacks, diagnostic scoring');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
