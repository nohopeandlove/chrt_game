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
 const result=await page.evaluate(async()=>{
  const {UI}=await import('/src/ui.ts');
  const {installLearningTools}=await import('/src/learning.ts');
  const {characters}=await import('/src/content.ts');
  const {renderPortrait}=await import('/src/render/portrait.ts');
  const emotions=['neutral','smile','joy','worry','stern'];
  const images=new Map();let frames=0;
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
  }
  for(const [id,url] of images){
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const corner=ctx.getImageData(0,0,1,1).data[3];
   if(corner!==0)throw Error('Opaque portrait background: '+id);
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
 await page.getByRole('button',{name:'Версия для слабовидящих',exact:true}).click();
 await page.locator('[data-vision-key=images][data-value=gray]').click();
 assert.equal(await page.locator('.stage__portrait').evaluate(e=>getComputedStyle(e).filter),'grayscale(1)');
 await page.locator('[data-vision-key=images][data-value=hidden]').click();
 assert.equal(await page.locator('.stage__portrait').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 assert.equal(await page.locator('.panel__role').textContent(),'Наставник');
 assert.deepEqual(errors,[]);
 console.log('PASS: 7 transparent portraits, 35 distinct expression frames, name and role, mobile fit, grayscale and hidden images preserve speaker role');
}finally{if(browser)await browser.close();await server.close();}
