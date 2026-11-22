import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.E2E_URL||'http://localhost:5175/lightnook/#';
const browser=await chromium.launch({headless:true,...(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lightnook-offline-v1')));
 const add=async(id,name)=>{await page.locator('#'+id+'-input').fill(name);await page.locator('#'+id+'-input').press('Enter');};
 await page.goto(base);await page.getByRole('button',{name:'开始本机体验'}).click();
 await page.getByRole('button',{name:'自己做饭',exact:true}).click();
 for(const name of ['鸡蛋','红薯','豆腐','面条','西兰花','番茄','食用油','油麦菜'])await add('available-ingredients',name);
 await add('available-ingredients','油麦菜');assert.equal(await page.getByRole('button',{name:'移除常买得到的食材：油麦菜',exact:true}).count(),1);
 await page.getByRole('button',{name:'移除常买得到的食材：油麦菜',exact:true}).click();
 await page.getByRole('button',{name:'只用已选食材',exact:true}).click();await add('preferred-ingredients','豆腐');
 await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.querySelector('.page-main').scrollWidth>document.querySelector('.page-main').clientWidth),false);
 await page.getByRole('button',{name:'生成我的计划草案'}).click();await page.getByRole('button',{name:'启用这份计划'}).click();await page.getByText('今天的小目标').waitFor();
 let s=await store();const before=JSON.stringify(s.items);assert.equal(s.preferences.ingredientMode,'only');assert.deepEqual(s.preferences.preferredIngredients,['豆腐']);
 for(const item of s.items.filter(i=>i.slot!=='workout')){assert.equal(item.snapshot.kind,'HOME');for(const ingredient of item.snapshot.ingredients)assert(s.preferences.availableIngredients.includes(ingredient.name));}
 await page.goto(base+'/eat?slot=lunch');await page.getByRole('button',{name:'随机一个',exact:true}).click();await page.getByRole('button',{name:'帮我随机选一份'}).click();await page.locator('dialog').waitFor();
 s=await store();assert(s.draws.length);const draw=s.draws.at(-1),pool=s.pools.find(p=>p.id===draw.poolId);assert(pool.candidates.every(m=>m.ingredients.every(i=>s.preferences.availableIngredients.includes(i.name))));
 await page.goto(base+'/preferences');await page.getByRole('button',{name:'移除常买得到的食材：豆腐',exact:true}).click();
 await page.getByRole('button',{name:'保存偏好',exact:true}).click();await page.waitForURL('**/profile');
 s=await store();assert.equal(JSON.stringify(s.items),before);assert(!s.preferences.availableIngredients.includes('豆腐'));
 await page.goto(base+'/eat?slot=lunch');await page.getByText('暂时没有合适的组合。',{exact:true}).waitFor();assert(await page.getByRole('link',{name:'调整食材与偏好'}).count());
 await page.goto(base+'/preferences');await page.getByRole('button',{name:'优先使用',exact:true}).click();await page.getByRole('button',{name:'保存偏好',exact:true}).click();await page.waitForURL('**/profile');
 await page.goto(base+'/eat?slot=lunch');await page.locator('.meal-card').first().waitFor();assert((await page.locator('.meal-card').count())>0);
 // Simulate an existing v1 browser record with no newly introduced fields.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lightnook-offline-v1'));delete s.preferences.availableIngredients;delete s.preferences.preferredIngredients;delete s.preferences.ingredientMode;localStorage.setItem('lightnook-offline-v1',JSON.stringify(s));});
 await page.goto(base+'/preferences');await page.locator('#available-ingredients-input').waitFor();assert(await page.getByRole('button',{name:'优先使用',exact:true}).getAttribute('aria-pressed')==='true');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.context().setOffline(true);await page.reload();await page.locator('#available-ingredients-input').waitFor();assert.equal((await store()).items.length,JSON.parse(before).length);
 assert.deepEqual(errors,[]);console.log('PASS: custom ingredients, duplicate handling, strict plan + random, retained history, no-match recovery, 320px layout, legacy data and offline reload');
}finally{await browser.close();}
