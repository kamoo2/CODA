import { useEffect, useState } from 'react';
import styles from './index.module.scss';

interface CommonCheckboxListProps<T> {
  items: T[];
  selectedIds?: string[];
  onSelectionChange: (selectedItems: T[]) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getBadge?: (item: T) => { text: string; color: string };
  maxHeight?: string;
}

function CommonCheckboxList<T>({
  // 표기할 아이템 리스트
  items,
  // 선택된 항목 id들
  selectedIds = [],
  // 선택이 변경되었을때 핸들러
  onSelectionChange,
  // 항목의 id를 가져오는 함수
  getId,
  // 항목의 label text를 가져오는 함수
  getLabel,
  // 항목의 뱃지를 가져오는 함수 ({text:string, color:string})
  getBadge,
  maxHeight,
}: CommonCheckboxListProps<T>) {
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>(selectedIds);

  const filteredItems = items.filter((item) => getLabel(item).toLowerCase().includes(search.toLowerCase()));
  const filteredIds = filteredItems.map(getId);
  const isAllFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => checkedIds.includes(id));

  const handleCheckboxChange = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAllToggle = () => {
    setCheckedIds((prev) => {
      if (isAllFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      } else {
        const newIds = [...prev];
        filteredIds.forEach((id) => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      }
    });
  };

  useEffect(() => {
    const selectedItems = items.filter((item) => checkedIds.includes(getId(item)));
    onSelectionChange(selectedItems);
  }, [checkedIds, items]);

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.selectAll}>
        <label>
          <input type="checkbox" checked={isAllFilteredSelected} onChange={handleSelectAllToggle} /> 전체 선택 / 해제
        </label>
      </div>

      <div className={styles.checkListContainer} style={{ maxHeight }}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyMessage}>결과가 없습니다.</div>
        ) : (
          filteredItems.map((item) => {
            const id = getId(item);
            const label = getLabel(item);
            const badge = getBadge?.(item);

            return (
              <label key={id} className={styles.listItem}>
                <input type="checkbox" checked={checkedIds.includes(id)} onChange={() => handleCheckboxChange(id)} />
                <span className={styles.itemName}>{label}</span>
                {badge && (
                  <span className={styles.itemBadge} style={{ backgroundColor: badge.color }}>
                    {badge.text}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CommonCheckboxList;
