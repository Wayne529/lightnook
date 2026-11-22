import {ingredientKey} from './domain';
export const ingredientGroups=[
 ['肉类',['鸡胸肉','鸡腿肉','牛肉','猪里脊','鸭肉']],
 ['鱼类',['鱼肉','鲈鱼','鳕鱼','三文鱼','鲫鱼','带鱼']],
 ['虾贝类',['鲜虾','虾仁','扇贝','蛤蜊']],
 ['蛋豆类',['鸡蛋','鸭蛋','豆腐','豆干','豆乳','黄豆']],
 ['蔬菜类',['西兰花','番茄','蔬菜','土豆','胡萝卜','南瓜','白菜','彩椒','黄瓜','菠菜','油麦菜']],
 ['菌菇类',['香菇','蘑菇','金针菇','杏鲍菇','木耳']],
 ['主食类',['糙米饭','米饭','面条','燕麦','全麦吐司','红薯','小米','玉米']],
 ['水果类',['水果','苹果','香蕉','蓝莓','草莓','橙子','猕猴桃']],
 ['奶制品类',['原味酸奶','牛奶','奶酪']],
 ['调味类',['食用油','盐','酱油','醋','黑胡椒']],
 ['其他',[]],
] as const;
export function ingredientCategory(name:string):string{
 const key=ingredientKey(name);
 const known=ingredientGroups.find(([,names])=>(names as readonly string[]).some(n=>ingredientKey(n)===key));if(known)return known[0];
 for(const [pattern,category] of [[/鱼/,'鱼类'],[/虾|贝|蛤|蟹/,'虾贝类'],[/菇|木耳/,'菌菇类'],[/奶|乳酪/,'奶制品类'],[/豆|蛋/,'蛋豆类'],[/肉|鸡|鸭|牛|猪|羊/,'肉类'],[/米|面|麦|薯|吐司/,'主食类'],[/菜|瓜|茄|萝卜|椒|笋/,'蔬菜类'],[/果|莓|蕉|橙|桃|梨/,'水果类'],[/油|盐|酱|醋|胡椒/,'调味类']] as const)if(pattern.test(key))return category;
 return '其他';
}
