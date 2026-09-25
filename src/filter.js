// 筛选规则：标签 + 关键词
export function filterPapers(items, { query, tag }) {
  const q = query.trim().toLowerCase();
  return items.filter(x =>
    (tag === '全部' || x.tags.includes(tag)) &&
    (!q || `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(q))
  );
}

// 供读屏播报的筛选结果描述：篇数 + 生效条件
export function describeFilter(count, { query, tag }) {
  const conds = [];
  if (tag !== '全部') conds.push(`标签「${tag}」`);
  if (query.trim()) conds.push(`关键词「${query.trim()}」`);
  return `找到 ${count} 篇文献` + (conds.length ? `，条件：${conds.join('，')}` : '，无筛选条件');
}
