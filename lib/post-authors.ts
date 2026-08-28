const prefixes=['好运','民间','老街','金牌','旺财','真心','稳当','实在','热心','顺风','鸿运','福气','开心','如意','吉祥','平安','富贵','贴心','诚心','大众','老牌','新锐','南山','北海','东城','西门','春风','秋实','夏雨','冬雪','青松','红梅','金秋','满仓','丰收','百顺','万福','长乐','清风','明月','高山','流水','阳光','朴实','厚道','邻家','乡里','一心','同心','常胜'];
const roles=['老哥','高手','神算','师傅','大叔','大姐','老师','先生','达人','行家','能手','老手','掌柜','老板','朋友','乡亲','邻居','大哥','小哥','大伯','大妈','阿姨','叔叔','姑娘','小妹','阿公','阿婆','表哥','表姐','堂哥','堂姐','班长','队长','村长','店长','馆主','楼主','群主','站长','主任','顾问','参谋','管家','助手','向导','明白','稳手','好手','帮手','熟手'];

const scopes=['pingte','pingte2','tema1','tema3','tema8','tema10','tema18','zodiac1','zodiac3','zodiac6','zodiac9','fushi22','fushi33','fushi2x','fushi3x','danshuang','wave','wuxing','jiaye','killcode','killanimal','killtail','killhead','killwave','size','tail','head'] as const;
type AuthorScope=(typeof scopes)[number];
const scopeStart:Record<AuthorScope,number>={'pingte':0,'pingte2':20,'tema1':100,'tema3':120,'tema8':170,'tema10':220,'tema18':270,'zodiac1':300,'zodiac3':310,'zodiac6':330,'zodiac9':360,'fushi22':400,'fushi33':410,'fushi2x':420,'fushi3x':440,'danshuang':460,'wave':490,'wuxing':520,'jiaye':550,'killcode':570,'killanimal':590,'killtail':610,'killhead':630,'killwave':650,'size':670,'tail':685,'head':700};
const lotterySlot:Record<string,number>={'1':0,'5':1,'8':2};

/** 每个彩种、板块和公式编号都对应一个全站唯一且长期固定的中文笔名。 */
export function postAuthor(type:string,scope:AuthorScope,index:number){
  const serial=(lotterySlot[type]??1)*800+scopeStart[scope]+Math.max(0,index);
  const prefixIndex=serial%prefixes.length;
  const roleIndex=(Math.floor(serial/prefixes.length)+prefixIndex)%roles.length;
  return `${prefixes[prefixIndex]}${roles[roleIndex]}`;
}
