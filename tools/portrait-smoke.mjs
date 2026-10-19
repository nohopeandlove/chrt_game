import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{port:0,host:'127.0.0.1'}});await server.listen();
const base=server.resolvedUrls.local[0];let browser;
try {
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_NO_SANDBOX==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({environment:'dev',appEnv:'dev'})}));
 await page.goto(base);
 await page.locator('.hero__art .illustrated-portrait').first().waitFor({state:'visible'});
 await page.screenshot({path:'/tmp/hero-menu-fixed.png'});
 const result=await page.evaluate(async()=>{
  const {UI}=await import('/src/ui.ts');
  const {installLearningTools}=await import('/src/learning.ts');
  const {characters}=await import('/src/content.ts');
  const {renderPortrait}=await import('/src/render/portrait.ts');
  const emotions=['neutral','smile','joy','worry','stern'];
  const images=new Map();const frameBoxes=new Map();let frames=0;
  for(const who of characters.values()) {
   const boxes=[];
   for(const emotion of emotions){
    const html=renderPortrait(who.portrait,emotion,{characterId:who.id,label:who.name});
    const node=new DOMParser().parseFromString(html,'image/svg+xml').documentElement;
    if(node.getAttribute('data-character')!==who.id)throw Error('Missing illustrated portrait '+who.id);
    if(node.getAttribute('data-emotion')!==emotion)throw Error('Wrong emotion');
    boxes.push(node.getAttribute('viewBox'));
    const href=node.querySelector('image').getAttribute('href');images.set(who.id,href);frames++;
   }
   if(new Set(boxes).size!==5)throw Error('Expressions share same viewport');
   frameBoxes.set(who.id,boxes.map(box=>box.split(' ').map(Number)));
  }
  for(const [id,url] of images){
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const corner=ctx.getImageData(0,0,1,1).data[3];
   if(corner!==0)throw Error('Opaque portrait background: '+id);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   for(const [index,box] of frameBoxes.get(id).entries()) {
    const [x,top,width,height]=box;
    for(const edge of id==='hr' ? [Math.ceil(x),Math.floor(x+width)-1] : [Math.ceil(x)+3,Math.floor(x+width)-4]) {
     let opaque=0;
     for(let y=Math.ceil(top);y<Math.min(canvas.height,top+height*(id==='hr'?1:.7));y++)if(pixels[(y*canvas.width+edge)*4+3]>200)opaque++;
     if(opaque>(id==='hr'?0:height*.05))throw Error(`Cropped shoulder at frame edge: ${id}, expression ${index}`);
    }
   }

  }
  for(const [id,emotion] of [['hero-f','smile'],['hero-m','joy']]) {
   const who=characters.get(id);
   const svg=new DOMParser().parseFromString(renderPortrait(who.portrait,emotion,{characterId:id,plate:true}),'image/svg+xml').documentElement;
   const url=svg.querySelector('image').getAttribute('href');
   const blob=await (await fetch(url)).blob();
   const dataUrl=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
   svg.querySelector('image').setAttribute('href',dataUrl);svg.setAttribute('width','180');svg.setAttribute('height','216');
   const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));await image.decode();
   const canvas=document.createElement('canvas');canvas.width=180;canvas.height=216;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   for(const x of [1,178]){const side=ctx.getImageData(x,0,1,216).data;for(let i=3;i<side.length;i+=4)if(side[i]!==0)throw Error('Neighbor expression leaks into menu: '+id);}
  }
  const root=document.querySelector('#app');const ui=new UI(root);installLearningTools(root,()=>null);
  window.portraitTest={ui,characters};
  void ui.say({kind:'say',who:characters.get('mentor'),text:'Пойдём, познакомлю с остальными. У нас обед без галстуков — общаемся, шутим, обсуждаем проекты.'});
  ui.setBackground('kitchen');return {frames,characters:images.size};
 });
 assert.deepEqual(result,{frames:35,characters:7});
 assert.equal(await page.locator('.panel__role').textContent(),'Наставник');
 assert.equal(await page.locator('.panel__name').textContent(),'Индира Ринатовна');
 await page.locator('[data-setting=still]').click();
 await page.screenshot({path:'/tmp/portraits-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/portraits-mobile.png'});
 assert.equal(await page.locator('.panel__name').evaluate(e=>getComputedStyle(e).fontSize),await page.locator('.panel__role').evaluate(e=>getComputedStyle(e).fontSize));
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.locator('[data-vision-key=images][data-value=gray]').click();
 assert.equal(await page.locator('.stage__portrait').evaluate(e=>getComputedStyle(e).filter),'grayscale(1)');
 await page.locator('[data-vision-key=images][data-value=hidden]').click();
 assert.equal(await page.locator('.stage__portrait').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 assert.equal(await page.locator('.panel__role').textContent(),'Наставник');
 await page.locator('[data-vision-key=images][data-value=color]').click();
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.evaluate(async()=>{
  const {summarizeScene}=await import('/src/screens/scene-summary.ts');
  const {newGame}=await import('/src/state.ts');
  const {scenes}=await import('/src/content.ts');
  const state=newGame('Проверка','f');const start={...state.scales};state.scales.energy+=2;state.scales.mood+=1;
  void summarizeScene(window.portraitTest.ui,state,scenes.get('prologue'),start);
 });
 await page.getByRole('heading',{name:'Выпускной позади',exact:true}).waitFor({state:'visible'});
 assert.equal(await page.locator('.scene-metric').count(),2);
 const recapTitle=await page.locator('#recap-title').boundingBox();const toolbar=await page.locator('.learning-tools').boundingBox();assert.ok(recapTitle.y>=toolbar.y+toolbar.height);
 assert.equal(await page.locator('.scene-metric__change strong').first().textContent(),'+2');
 assert.ok((await page.locator('.scene-metric__total').first().textContent()).includes('Стало'));
 await page.screenshot({path:'/tmp/scene-recap-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1440,height:900});
 await page.screenshot({path:'/tmp/scene-recap-desktop.png'});
 await page.getByRole('button',{name:'Продолжить историю',exact:true}).click();
 assert.equal(await page.locator('.overlay--summary').count(),0);
 await page.evaluate(()=>{const {ui,characters}=window.portraitTest;ui.setBackground('laptop');void ui.say({kind:'say',who:characters.get('hr'),emotion:'smile',text:'Здравствуйте! Давайте познакомимся.'});});
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.stage image')].map(async node=>{const image=new Image();image.src=node.getAttribute('href');await image.decode();}));await new Promise(requestAnimationFrame);});
 await page.screenshot({path:'/tmp/hr-portrait-fixed.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: 7 transparent portraits, 35 expression frames with transparent side margins, clipped menu frames, consistent name and role, mobile fit, grayscale and hidden images preserve speaker role, scene recap metrics and continuation');
}finally{if(browser)await browser.close();await server.close();}
