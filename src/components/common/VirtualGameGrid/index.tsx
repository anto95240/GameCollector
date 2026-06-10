import './VirtualGameGrid.css';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef } from 'react';

import GameCard from '@/components/common/GameCard';

export interface VirtualGameGridProps {
  games: any[];
  itemHeight?: number;
  colCount?: number;
  containerH?: number;
  containerW?: number;
  activeTab?: string;
  activeMenuIndex?: number;
  onToggleMenu?: (index: number, e: React.MouseEvent) => void;
  onDeleteRequest?: (game: any) => void;
  onToggleFavorite?: (game: any) => void;
  onAddGame?: () => void;
  t?: any;
  deletingId?: string | null;
}

const VirtualGameGrid: React.FC<VirtualGameGridProps> = ({
  games,
  itemHeight = 260,
  colCount = 4,
  containerH = 600,
  containerW = 1000,
  activeMenuIndex,
  onToggleMenu,
  onDeleteRequest,
  onToggleFavorite,
  onAddGame,
  t,
  deletingId,
}: any) => {
  // Add a virtual "add" card at the end
  const allItems = [...games, { __isAddCard: true }];
  const rowCount = Math.ceil(allItems.length / colCount);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: containerH,
        width: containerW,
        overflow: 'auto', // Permet le scroll vertical
      }}
      className="vgrid-container custom-scrollbar"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * colCount;
          const rowItems = allItems.slice(startIndex, startIndex + colCount);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              {rowItems.map((item, idxInRow) => {
                const idx = startIndex + idxInRow;

                return (
                  <div
                    key={idx}
                    className={`vgrid-cell ${deletingId === item.id ? 'deleting' : ''}`}
                    style={{ width: `${100 / colCount}%` }}
                    data-id={String(item.id)}
                  >
                    {item.__isAddCard ? (
                      <GameCard variant="add" t={t} onClick={onAddGame} />
                    ) : (
                      <GameCard
                        game={item}
                        index={idx}
                        variant="list"
                        isActive={false}
                        activeMenuIndex={activeMenuIndex}
                        onToggleMenu={onToggleMenu}
                        onDeleteRequest={onDeleteRequest}
                        onToggleFavorite={onToggleFavorite}
                        t={t}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualGameGrid;
