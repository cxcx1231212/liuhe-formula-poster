const regions=[
 '广东','广州','深圳','珠海','佛山','东莞','中山','惠州','江门','肇庆','汕头','湛江','茂名','梅州','韶关','清远','潮州','揭阳','云浮','阳江','河源','顺德','南海','番禺','花都','增城','从化','龙岗','宝安','惠阳',
 '福建','福州','厦门','泉州','漳州','莆田','三明','南平','龙岩','宁德','晋江','石狮','福清','长乐','闽侯','连江','罗源','平潭','安溪','永春',
 '广西','南宁','桂林','柳州','梧州','北海','防城','钦州','贵港','玉林','百色','贺州','河池','来宾','崇左','横州','宾阳','武鸣','灵山','浦北',
 '湖南','长沙','株洲','湘潭','衡阳','邵阳','岳阳','常德','张家','益阳','郴州','永州','怀化','娄底','浏阳','宁乡','醴陵','湘乡','韶山','耒阳',
 '江西','南昌','景德','萍乡','九江','新余','鹰潭','赣州','吉安','宜春','抚州','上饶','瑞金','丰城','樟树','高安','井冈','乐平','贵溪','南康',
 '海南','海口','三亚','三沙','儋州','琼海','文昌','万宁','东方','五指','定安','屯昌','澄迈','临高','白沙','昌江','乐东','陵水','保亭','琼中',
];
const nickChars=Array.from('强明辉军勇龙平安福顺发胜诚乐祥春生海山林峰杰豪成康建国华荣昌兴旺财宝金银亮超刚伟芳英兰梅霞燕红丽玲珍凤莲香云');
const surnames=Array.from('赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌');
const maleNames=Array.from('强明辉军勇龙平安福顺发胜诚乐祥春生海山林峰杰豪成康建国华荣昌兴旺财宝金银亮超刚伟');
const femaleNames=Array.from('芳英兰梅霞燕红丽玲珍凤莲香云');
const nicknames=[...new Set([
 ...nickChars.map(name=>`阿${name}`),...nickChars.map(name=>`小${name}`),...surnames.map(name=>`老${name}`),
 ...maleNames.flatMap(name=>Array.from('哥叔伯爷仔').map(suffix=>`${name}${suffix}`)),
 ...femaleNames.flatMap(name=>Array.from('姐姨嫂妹').map(suffix=>`${name}${suffix}`)),
 ...surnames.flatMap(surname=>nickChars.map(name=>`${surname}${name}`)),
])];

const scopes=['pingte','pingte2','tema1','tema3','tema8','tema10','tema18','zodiac1','zodiac3','zodiac6','zodiac9','fushi22','fushi33','fushi2x','fushi3x','danshuang','wave','wuxing','jiaye','killcode','killanimal','killtail','killhead','killwave','size','tail','head'] as const;
type AuthorScope=(typeof scopes)[number];
const lotterySlot:Record<string,number>={'1':0,'5':1,'8':2};
const scopeCapacity:Record<AuthorScope,number>={pingte:300,pingte2:300,tema1:600,tema3:600,tema8:600,tema10:600,tema18:600,zodiac1:11000,zodiac3:1000,zodiac6:800,zodiac9:600,fushi22:1000,fushi33:1000,fushi2x:1000,fushi3x:1000,danshuang:11000,wave:5500,wuxing:23000,jiaye:300,killcode:300,killanimal:300,killtail:300,killhead:300,killwave:300,size:300,tail:300,head:300};
const scopeStart=Object.fromEntries(scopes.map((scope,index)=>[scope,scopes.slice(0,index).reduce((sum,item)=>sum+scopeCapacity[item],0)])) as Record<AuthorScope,number>;
const LOTTERY_CAPACITY=scopes.reduce((sum,scope)=>sum+scopeCapacity[scope],0);

/** 每个彩种、板块和公式编号都对应一个全站唯一且长期固定的中文笔名。 */
export function postAuthor(type:string,scope:AuthorScope,index:number){
  const safeIndex=Math.max(0,Math.trunc(index));
  const serial=(lotterySlot[type]??1)*LOTTERY_CAPACITY+scopeStart[scope]+safeIndex;
  // A reversible permutation keeps every pen name unique while preventing
  // neighbouring formulas from looking like the same person in different cities.
  let value=(serial*7919)%(regions.length*nicknames.length);
  const region=regions[value%regions.length];value=Math.floor(value/regions.length);
  const nickname=nicknames[value%nicknames.length];
  return `${region}${nickname}`;
}
