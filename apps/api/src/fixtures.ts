const ingredient = (name: string, quantity: number, basis = 'RAW', unit = 'g') => ({ name, quantity, basis, unit });
export const fixtures = [
  ['chicken-bowl', '鸡胸糙米碗', 'chicken', 20, 1800, [], ['lunch', 'dinner']],
  ['tomato-tofu', '番茄豆腐面', 'tofu', 15, 1500, ['soy', 'gluten'], ['lunch', 'dinner']],
  ['salmon-rice', '香煎三文鱼杂粮饭', 'salmon', 25, 2500, ['fish'], ['lunch', 'dinner']],
  ['salmon-broccoli-bowl', '三文鱼西兰花糙米碗', 'salmon', 25, 2800, ['fish'], ['lunch', 'dinner']],
  ['cod-vegetable', '清蒸鳕鱼时蔬饭', 'salmon', 25, 2600, ['fish'], ['lunch', 'dinner']],
  ['mushroom-chicken', '香菇鸡肉饭', 'chicken', 25, 1800, [], ['lunch', 'dinner']],
  ['vegetable-eggs', '杂蔬鸡蛋饭', 'tofu', 15, 1200, ['egg'], ['lunch', 'dinner']],
  ['beef-bowl', '时蔬牛肉饭', 'chicken', 20, 2300, [], ['lunch', 'dinner']],
  ['shrimp-rice', '西兰花鲜虾饭', 'salmon', 20, 2200, ['shellfish'], ['lunch', 'dinner']],
  ['pumpkin-tofu', '南瓜豆腐杂粮碗', 'tofu', 20, 1300, ['soy'], ['lunch', 'dinner']],
  ['lemon-chicken', '柠檬鸡肉意面', 'chicken', 25, 1900, ['gluten'], ['lunch', 'dinner']],
  ['steamed-fish', '清蒸鱼与时蔬饭', 'salmon', 30, 2400, ['fish'], ['lunch', 'dinner']],
  ['cabbage-tofu', '白菜豆腐烩饭', 'tofu', 20, 1200, ['soy'], ['lunch', 'dinner']],
  ['pepper-chicken', '彩椒鸡肉杂粮饭', 'chicken', 20, 1700, [], ['lunch', 'dinner']],
  ['yogurt-oats', '酸奶燕麦碗', 'breakfast', 5, 1000, ['milk'], ['breakfast']],
  ['banana-oats', '香蕉豆乳燕麦', 'breakfast', 10, 900, ['soy'], ['breakfast']],
  ['egg-toast', '鸡蛋全麦吐司', 'breakfast', 10, 1000, ['egg', 'gluten'], ['breakfast']],
  ['sweet-potato', '红薯鸡蛋早餐盘', 'breakfast', 15, 800, ['egg'], ['breakfast']],
  ['berry-yogurt', '莓果原味酸奶杯', 'breakfast', 5, 1200, ['milk'], ['breakfast']],
  ['millet-bowl', '小米粥与时蔬', 'breakfast', 20, 800, [], ['breakfast']],
].map(([slug, title, art, minutes, cost, allergens, slots]) => {
  const name=String(title);
  const ing = art === 'breakfast' ? (name.includes('鸡蛋')?[ingredient('鸡蛋',2,'RAW','个'),ingredient(name.includes('红薯')?'红薯':'全麦吐司',100)]:name.includes('小米')?[ingredient('小米',40),ingredient('蔬菜',100)]:[ingredient('燕麦',40),ingredient(name.includes('豆乳')?'豆乳':'原味酸奶',200,'READY'),ingredient('水果',80)]) : [ingredient(name.includes('豆腐')?'豆腐':name.includes('鸡蛋')?'鸡蛋':name.includes('牛肉')?'牛肉':name.includes('虾')?'鲜虾':name.includes('三文鱼')?'三文鱼':name.includes('鳕鱼')?'鳕鱼':name.includes('鱼')?'鱼肉':'鸡胸肉',150),ingredient(name.includes('面')?'面条':'糙米饭',150,'COOKED'),ingredient('西兰花',100),ingredient('番茄',80),ingredient('食用油',8)];
  const actualAllergens=[...new Set([...(allergens as string[]),...ing.flatMap(i=>i.name.includes('酸奶')?['milk']:i.name==='豆腐'||i.name==='豆乳'?['soy']:i.name==='鸡蛋'?['egg']:i.name==='面条'||i.name.includes('吐司')?['gluten']:[])])];
  return { slug: String(slug), title: String(title), art: String(art), minutes: Number(minutes), costCents: Number(cost), allergens: actualAllergens, slots: slots as string[], kind: 'HOME', allergenKnown: true,
    description: '一份刚刚好的满足，给忙碌的日子一点温度。', ingredients: ing,
    steps: ['按食材清单准备份量，蔬菜洗净，主食提前备好。', '将蛋白质食材烹饪至全熟，蔬菜煮熟或炒熟。', '搭配主食与蔬菜装盘，按实际食用情况记录。'], sources: [{ title: '查找相似做法', platform: '下厨房', url: 'https://m.xiachufang.com/recipe/103019440/' }], nutrition: { estimated: true, calories: art === 'breakfast' ? 380 : 500, protein: art === 'breakfast' ? 18 : 36, label: '本地示例，正式内容需审核' } };
});
for (const [slug, title, art, scene, cost] of [['convenience','饭团＋鸡蛋＋豆浆','breakfast','便利店',1800],['canteen','食堂的一荤两素','chicken','食堂',2000],['takeaway','时蔬鸡肉便当','chicken','外卖',2500]] as const) {
  fixtures.push({ slug, title, art, minutes: 5, costCents: cost, allergens: [], slots: ['lunch','dinner'], kind: 'OUTSIDE', allergenKnown: false,
    description: `${scene}搭配参考；选购前核对商品配料和过敏原。`, ingredients: [], steps: ['根据饥饿感与实际需求选择份量。','核对包装或商家提供的配料与过敏原信息。','记录实际吃的内容，营养以具体商品为准。'], sources: [], nutrition: { estimated: true, calories: null as any, protein: null as any, label: '以商品包装为准' } });
}
