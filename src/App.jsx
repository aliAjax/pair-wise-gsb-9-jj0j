import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadLibrary, saveLibrary } from './library.js';
import { filterPapers, describeFilter } from './filter.js';
import useKeyboardNav from './useKeyboardNav.js';

export default function App() {
  const [items, setItems] = useState(loadLibrary);
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [announce, setAnnounce] = useState('');
  const [form, setForm] = useState({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });

  const cur = items.find(x => x.id === selected) || items[0];

  // 笔记草稿：保存前不写入书目；pending 为“放弃修改”后要执行的跳转
  const [draft, setDraft] = useState(cur.notes || '');
  const [pending, setPending] = useState(null);
  const notesRef = useRef(null);
  const keepRef = useRef(null);
  const notesDirty = draft !== (cur.notes || '');

  useEffect(() => saveLibrary(items), [items]);

  // 切换文献后，草稿重置为该文献已保存的笔记
  useEffect(() => {
    setDraft((items.find(x => x.id === selected) || items[0]).notes || '');
  }, [selected]);

  // 筛选变化后读屏播报篇数和条件（稍作防抖，避免逐字播报）
  const filtered = useMemo(() => filterPapers(items, { query, tag }), [items, tag, query]);
  useEffect(() => {
    const t = setTimeout(() => setAnnounce(describeFilter(filtered.length, { query, tag })), 400);
    return () => clearTimeout(t);
  }, [query, tag, filtered.length]);

  // 提示条自动消失
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // 未保存提示打开时，焦点落在“继续编辑”上
  useEffect(() => {
    if (pending) keepRef.current?.focus();
  }, [pending]);

  // 切换文献：笔记有未保存修改时先询问，否则直接跳转（鼠标点击也走这里）
  const requestSelect = (id, after) => {
    const go = () => { setSelected(id); if (after) after(); };
    if (id !== selected && notesDirty) setPending(() => go);
    else go();
  };
  const keepEditing = () => { setPending(null); notesRef.current?.focus(); };
  const discardChanges = () => {
    const go = pending;
    setPending(null);
    setDraft(cur.notes || ''); // 恢复上次保存的文本
    if (go) go();
  };

  const { searchRef, listRef, detailRef, onSearchKeyDown, onListKeyDown, onDetailKeyDown } =
    useKeyboardNav({ filtered, selected, onSelect: requestSelect });

  const tags = ['全部', ...new Set(items.flatMap(x => x.tags))];
  const update = (k, v) => setItems(items.map(x => x.id === cur.id ? { ...x, [k]: v } : x));

  const saveNotes = () => {
    if (!notesDirty) return;
    update('notes', draft);
    setNotice('笔记已保存');
  };
  const onNotesKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNotes(); }
  };

  const add = () => {
    if (!form.title) return;
    const p = { ...form, id: Date.now(), year: +form.year, tags: form.tags.split(',').map(x => x.trim()).filter(Boolean), status: '待读', cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.` };
    setItems([...items, p]);
    requestSelect(p.id);
    setForm({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });
    setShow(false);
    setNotice('文献已加入研究库');
  };
  const bib = () => { navigator.clipboard?.writeText(cur.cite); setNotice('引用文本已复制'); };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([items.map(x => x.cite).join('\n')], { type: 'text/plain' }));
    a.download = 'references.txt';
    a.click();
    setNotice('引用列表已导出');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> LITERATURE</div>
        <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
        <nav>
          <button className="active">▤ <span>所有文献</span><b>{items.length}</b></button>
          <button>▥ <span>待读</span><b>{items.filter(x => x.status === '待读').length}</b></button>
          <button>✓ <span>已读</span></button>
          <button>☆ <span>收藏</span></button>
        </nav>
        <div className="side-tags"><small>标签</small>{tags.slice(1, 5).map(t => <button onClick={() => setTag(t)} key={t}># {t}</button>)}</div>
        <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
      </aside>
      <main>
        <header>
          <div><span className="crumb">RESEARCH / LIBRARY</span><h1>所有文献</h1></div>
          <div className="actions">
            <button className="outline" onClick={download}>↓ 导出引用</button>
            <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
          </div>
        </header>
        <div className="toolbar">
          <div className="search">⌕
            <input
              ref={searchRef}
              onKeyDown={onSearchKeyDown}
              aria-label="搜索文献，按下方向键进入列表"
              placeholder="搜索标题、作者或摘要…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button aria-label="清除搜索" onClick={() => setQuery('')}>×</button>}
          </div>
          <div className="tag-filter">{tags.map(t => <button className={tag === t ? 'on' : ''} aria-pressed={tag === t} onClick={() => setTag(t)} key={t}>{t}</button>)}</div>
        </div>
        <p className="sr-only" role="status">{announce}</p>
        <div className="body">
          <section
            className="paper-list"
            role="listbox"
            aria-label="文献列表：方向键切换，回车查看详情"
            ref={listRef}
            onKeyDown={onListKeyDown}
          >
            {filtered.map(p => (
              <button
                role="option"
                aria-selected={selected === p.id}
                tabIndex={selected === p.id ? 0 : -1}
                data-paper-id={p.id}
                className={'paper ' + (selected === p.id ? 'selected' : '')}
                onClick={() => requestSelect(p.id)}
                key={p.id}
              >
                <div className="paper-year">{p.year}</div>
                <div className="paper-copy">
                  <h3>{p.title}</h3>
                  <p>{p.authors}</p>
                  <div>{p.tags.map(t => <span key={t}>#{t}</span>)}</div>
                </div>
                <small className={'status ' + p.status}>{p.status}</small>
              </button>
            ))}
            {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
          </section>
          <section
            className="detail"
            ref={detailRef}
            tabIndex={-1}
            onKeyDown={onDetailKeyDown}
            aria-label="文献详情，按 Esc 返回列表"
          >
            {cur && <>
              <div className="detail-top">
                <span className="status reading">{cur.status}</span>
                <button onClick={() => setNotice('已加入收藏')}>☆ 收藏</button>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>
              <div className="cite-actions">
                <button onClick={bib}>▣ 复制引用</button>
                <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>{cur.status === '已读' ? '标记为待读' : '标记为已读'}</button>
              </div>
              <div className="detail-section">
                <h4>摘要 <span>ABSTRACT</span></h4>
                <p>{cur.abstract}</p>
              </div>
              <div className="detail-section">
                <h4>出版信息 <span>PUBLICATION</span></h4>
                <div className="pub-grid">
                  <div><small>出版物</small><strong>{cur.venue}</strong></div>
                  <div><small>年份</small><strong>{cur.year}</strong></div>
                </div>
              </div>
              <div className="detail-section">
                <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                <div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div>
              </div>
              <div className="detail-section">
                <div className="notes-head">
                  <h4>我的笔记 <span>PRIVATE</span></h4>
                  <div className="notes-tools">
                    <small className={notesDirty ? 'dirty' : ''}>{notesDirty ? '● 未保存' : '已保存'}</small>
                    <button onClick={saveNotes} disabled={!notesDirty}>保存笔记</button>
                  </div>
                </div>
                <textarea
                  className="notes"
                  ref={notesRef}
                  aria-label="我的笔记"
                  placeholder="记录你的阅读想法…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onNotesKeyDown}
                />
              </div>
            </>}
          </section>
        </div>
      </main>
      {show && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>×</button>
            <span className="crumb">NEW REFERENCE</span>
            <h2>添加一篇文献</h2>
            <label>标题<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="论文或书籍标题" /></label>
            <label>作者<input value={form.authors} onChange={e => setForm({ ...form, authors: e.target.value })} /></label>
            <div className="two">
              <label>年份<input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></label>
              <label>出版物<input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
            </div>
            <label>关键词<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" /></label>
            <label>摘要<textarea rows="3" value={form.abstract} onChange={e => setForm({ ...form, abstract: e.target.value })} /></label>
            <button className="primary full" onClick={add}>保存文献</button>
          </div>
        </div>
      )}
      {pending && (
        <div className="modal-bg">
          <div
            className="modal confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
            aria-describedby="unsaved-desc"
            onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); keepEditing(); } }}
          >
            <span className="crumb">UNSAVED NOTES</span>
            <h2 id="unsaved-title">笔记尚未保存</h2>
            <p id="unsaved-desc">当前文献的笔记有未保存的修改。继续编辑，还是放弃修改并恢复上次保存的文本？</p>
            <div className="confirm-actions">
              <button className="outline" ref={keepRef} onClick={keepEditing}>继续编辑</button>
              <button className="primary" onClick={discardChanges}>放弃修改</button>
            </div>
          </div>
        </div>
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
