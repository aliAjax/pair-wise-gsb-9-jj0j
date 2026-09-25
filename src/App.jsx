import React,{useEffect,useMemo,useRef,useState}from'react';
import{loadItems,saveItems}from'./store';
import{filterItems,describeFilter}from'./filter';
import{useKeyboardNav}from'./useKeyboard';

export default function App(){
  const[items,setItems]=useState(loadItems);
  const[selected,setSelected]=useState(1);
  const[query,setQuery]=useState('');
  const[tag,setTag]=useState('全部');
  const[show,setShow]=useState(false);
  const[notice,setNotice]=useState('');
  const[form,setForm]=useState({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});
  const[draft,setDraft]=useState(null);      // 未保存的笔记草稿 {id,text}
  const[confirm,setConfirm]=useState(false); // 离开前的“继续/放弃”提示
  const[announce,setAnnounce]=useState('');  // 读屏播报文本
  const pending=useRef(null);                // 被提示拦下的那次跳转

  useEffect(()=>saveItems(items),[items]);

  const tags=['全部',...new Set(items.flatMap(x=>x.tags))];
  const filtered=useMemo(()=>filterItems(items,{query,tag}),[items,tag,query]);
  const cur=items.find(x=>x.id===selected)||items[0];
  const index=filtered.findIndex(x=>x.id===cur?.id);

  // 筛选变化后向读屏播报篇数和条件（稍作防抖，避免逐字输入时打断）
  useEffect(()=>{
    const t=setTimeout(()=>setAnnounce(describeFilter({query,tag},filtered.length)),300);
    return()=>clearTimeout(t);
  },[query,tag,filtered.length]);

  const saved=cur?.notes||'';
  const notesValue=draft&&draft.id===cur?.id?draft.text:saved;
  const dirty=notesValue!==saved;
  useEffect(()=>{setDraft(null)},[cur?.id]); // 换文献时草稿不跟着走

  const update=(k,v)=>setItems(items.map(x=>x.id===cur.id?{...x,[k]:v}:x));

  // 切换文献：笔记未保存时先问“继续还是放弃”，放弃则恢复上次文本后再走
  const requestSelect=(id,after)=>{
    if(dirty&&id!==cur.id){
      pending.current=()=>{setSelected(id);after&&after()};
      setConfirm(true);
      return false;
    }
    setSelected(id);after&&after();
    return true;
  };

  const kb=useKeyboardNav({
    count:filtered.length,
    index,
    onMove:i=>requestSelect(filtered[i].id,()=>kb.focusItem(i)),
    onOpen:()=>kb.focusDetail(),
  });

  const saveNotes=()=>{if(!dirty)return;update('notes',notesValue);setDraft(null);setNotice('笔记已保存')};
  const keepEditing=()=>{setConfirm(false);pending.current=null;kb.focusNotes()};
  const discard=()=>{setConfirm(false);setDraft(null);const p=pending.current;pending.current=null;p&&p()};

  const add=()=>{if(!form.title)return;const p={...form,id:Date.now(),year:+form.year,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),status:'待读',cite:`${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};setItems([...items,p]);requestSelect(p.id);setForm({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});setShow(false);setNotice('文献已加入研究库')};
  const bib=()=>{navigator.clipboard?.writeText(cur.cite);setNotice('引用文本已复制')};
  const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([items.map(x=>x.cite).join('\n')],{type:'text/plain'}));a.download='references.txt';a.click();setNotice('引用列表已导出')};

  return <div className="app">
    <aside>
      <div className="logo"><span>∴</span> LITERATURE</div>
      <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
      <nav>
        <button className="active">▤ <span>所有文献</span><b>{items.length}</b></button>
        <button>▥ <span>待读</span><b>{items.filter(x=>x.status==='待读').length}</b></button>
        <button>✓ <span>已读</span></button>
        <button>☆ <span>收藏</span></button>
      </nav>
      <div className="side-tags"><small>标签</small>{tags.slice(1,5).map(t=><button onClick={()=>setTag(t)} key={t}># {t}</button>)}</div>
      <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
    </aside>
    <main>
      <header>
        <div><span className="crumb">RESEARCH / LIBRARY</span><h1>所有文献</h1></div>
        <div className="actions"><button className="outline" onClick={download}>↓ 导出引用</button><button className="primary" onClick={()=>setShow(true)}>＋ 添加文献</button></div>
      </header>
      <div className="toolbar">
        <div className="search">⌕
          <input ref={kb.searchRef} aria-label="搜索文献" placeholder="搜索标题、作者或摘要…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={kb.searchKeyDown}/>
          {query&&<button aria-label="清除搜索" onClick={()=>setQuery('')}>×</button>}
        </div>
        <div className="tag-filter">{tags.map(t=><button className={tag===t?'on':''} onClick={()=>setTag(t)} key={t}>{t}</button>)}</div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      <div className="body">
        <section className="paper-list" ref={kb.listRef} aria-label="文献列表" onKeyDown={kb.listKeyDown}>
          {filtered.map(p=><button data-paper className={'paper '+(selected===p.id?'selected':'')} aria-current={selected===p.id||undefined} onClick={()=>requestSelect(p.id)} key={p.id}>
            <div className="paper-year">{p.year}</div>
            <div className="paper-copy"><h3>{p.title}</h3><p>{p.authors}</p><div>{p.tags.map(t=><span key={t}>#{t}</span>)}</div></div>
            <small className={'status '+p.status}>{p.status}</small>
          </button>)}
          {!filtered.length&&<div className="no-result">没有找到匹配的文献</div>}
          <div className="kbd-hint">↑↓ 切换文献 · Enter 查看详情 · Esc 返回</div>
        </section>
        <section className="detail" ref={kb.detailRef} tabIndex={-1} aria-labelledby="detail-title" onKeyDown={kb.detailKeyDown}>
          {cur&&<>
            <div className="detail-top"><span className="status reading">{cur.status}</span><button onClick={()=>setNotice('已加入收藏')}>☆ 收藏</button></div>
            <h2 id="detail-title">{cur.title}</h2>
            <p className="authors">{cur.authors}</p>
            <div className="cite-actions">
              <button onClick={bib}>▣ 复制引用</button>
              <button onClick={()=>update('status',cur.status==='已读'?'待读':'已读')}>{cur.status==='已读'?'标记为待读':'标记为已读'}</button>
            </div>
            <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
            <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4><div className="pub-grid"><div><small>出版物</small><strong>{cur.venue}</strong></div><div><small>年份</small><strong>{cur.year}</strong></div></div></div>
            <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4><div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div></div>
            <div className="detail-section"><h4>我的笔记 <span>PRIVATE</span></h4>
              <textarea ref={kb.notesRef} className="notes" placeholder="记录你的阅读想法…（Ctrl/⌘+S 保存）" value={notesValue} onChange={e=>setDraft({id:cur.id,text:e.target.value})} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveNotes()}}}/>
              <div className="notes-bar">
                <small className={dirty?'dirty':''}>{dirty?'● 有未保存的修改':'已保存'}</small>
                <button onClick={saveNotes} disabled={!dirty}>保存笔记</button>
              </div>
            </div>
          </>}
        </section>
      </div>
    </main>
    {show&&<div className="modal-bg"><div className="modal"><button className="close" aria-label="关闭" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW REFERENCE</span><h2>添加一篇文献</h2><label>标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="论文或书籍标题"/></label><label>作者<input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label><div className="two"><label>年份<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>出版物<input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label></div><label>关键词<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="用逗号分隔"/></label><label>摘要<textarea rows="3" value={form.abstract} onChange={e=>setForm({...form,abstract:e.target.value})}/></label><button className="primary full" onClick={add}>保存文献</button></div></div>}
    {confirm&&<div className="modal-bg"><div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();keepEditing()}}}>
      <span className="crumb">UNSAVED NOTES</span>
      <h2 id="unsaved-title">笔记尚未保存</h2>
      <p className="confirm-copy">这篇文献的笔记有未保存的修改。继续编辑，还是放弃修改、恢复上次保存的文本？</p>
      <div className="confirm-actions">
        <button className="outline" autoFocus onClick={keepEditing}>继续编辑</button>
        <button className="primary" onClick={discard}>放弃修改</button>
      </div>
    </div></div>}
    {notice&&<div className="toast" role="status">{notice}</div>}
  </div>
}
