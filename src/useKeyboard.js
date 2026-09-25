import{useRef}from'react';

// 键盘查阅台：搜索框 ↓ 进列表，↑↓ 换文献，Enter 看详情，Esc 逐级返回。
// 只管焦点与按键，不懂筛选和保存；选中请求通过 onMove 交还页面裁决（可能被未保存提示拦下）。
export function useKeyboardNav({count,index,onMove,onOpen}){
  const searchRef=useRef(null);
  const listRef=useRef(null);
  const detailRef=useRef(null);
  const notesRef=useRef(null);

  const focusItem=i=>{listRef.current?.querySelectorAll('[data-paper]')[i]?.focus()};
  const focusSearch=()=>searchRef.current?.focus();
  const focusDetail=()=>detailRef.current?.focus();
  const focusNotes=()=>notesRef.current?.focus();

  // 请求移到第 i 篇；onMove 返回 false（被拦截）时不动焦点
  const tryMove=i=>{
    if(i<0){focusSearch();return}
    if(i>=count)return;
    if(onMove(i)!==false)focusItem(i);
  };

  const searchKeyDown=e=>{
    if(e.key==='ArrowDown'&&count>0){e.preventDefault();tryMove(index>=0?index:0)}
  };

  const listKeyDown=e=>{
    if(e.key==='ArrowDown'){e.preventDefault();tryMove(index+1)}
    else if(e.key==='ArrowUp'){e.preventDefault();tryMove(index-1)}
    else if(e.key==='Enter'){e.preventDefault();onOpen()}
    else if(e.key==='Escape'){e.preventDefault();focusSearch()}
  };

  const detailKeyDown=e=>{
    if(e.key==='Escape'){e.preventDefault();if(index>=0)focusItem(index);else focusSearch()}
  };

  return{searchRef,listRef,detailRef,notesRef,focusItem,focusSearch,focusDetail,focusNotes,searchKeyDown,listKeyDown,detailKeyDown};
}
