// 筛选规则：纯函数，页面渲染和读屏播报共用同一份结果
export function filterItems(items,{query,tag}){
  const q=query.trim().toLowerCase();
  return items.filter(x=>(tag==='全部'||x.tags.includes(tag))&&(!q||`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(q)));
}

// 筛选变化后的播报文本：报出篇数和当前条件
export function describeFilter({query,tag},count){
  const cond=[];
  if(tag!=='全部')cond.push(`标签“${tag}”`);
  if(query.trim())cond.push(`关键词“${query.trim()}”`);
  if(!cond.length)return`显示全部文献，共 ${count} 篇`;
  return`筛选出 ${count} 篇文献，条件：${cond.join('，')}`;
}
