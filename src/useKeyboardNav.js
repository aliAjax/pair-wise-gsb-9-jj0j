import { useCallback, useRef } from 'react';

// 键盘状态：搜索框 → 文献列表 → 详情面板之间的焦点移动。
// 只负责“焦点在哪、按键去哪”；选中哪篇文献由页面经 onSelect(id, after) 决定，
// 这样未保存笔记的确认逻辑可以统一拦在页面层。
export default function useKeyboardNav({ filtered, selected, onSelect }) {
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const detailRef = useRef(null);

  const focusPaper = useCallback((id) => {
    listRef.current?.querySelector(`[data-paper-id="${id}"]`)?.focus();
  }, []);

  const focusDetail = useCallback(() => {
    detailRef.current?.focus();
  }, []);

  // 搜索框：↓ 进入文献列表（优先落在当前选中文献，否则第一篇）
  const onSearchKeyDown = (e) => {
    if (e.key !== 'ArrowDown' || !filtered.length) return;
    e.preventDefault();
    const target = filtered.some(p => p.id === selected) ? selected : filtered[0].id;
    onSelect(target, () => focusPaper(target));
  };

  // 列表：↑/↓ 换文献，Home/End 跳首尾，Enter 看详情
  const onListKeyDown = (e) => {
    if (!filtered.length) return;
    const ids = filtered.map(p => p.id);
    const i = ids.indexOf(selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = i === -1 ? 0 : e.key === 'ArrowDown'
        ? Math.min(i + 1, ids.length - 1)
        : Math.max(i - 1, 0);
      onSelect(ids[next], () => focusPaper(ids[next]));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const id = e.key === 'Home' ? ids[0] : ids[ids.length - 1];
      onSelect(id, () => focusPaper(id));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const id = Number(document.activeElement?.dataset.paperId);
      onSelect(id || selected, focusDetail);
    }
  };

  // 详情：Esc 回列表
  const onDetailKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      focusPaper(selected);
    }
  };

  return { searchRef, listRef, detailRef, onSearchKeyDown, onListKeyDown, onDetailKeyDown };
}
