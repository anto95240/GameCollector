import "./VirtualGameGrid.css";

import React from "react";
import { Grid } from "react-window";

import GameCard from "@/components/common/GameCard";
const CellComponent = ({
  columnIndex,
  rowIndex,
  style,
  // react-window v2 spreads cellProps directly as props (not nested under `data`)
  allItems,
  colCount,
  activeMenuIndex,
  onToggleMenu,
  onDeleteRequest,
  onToggleFavorite,
  onAddGame,
  t,
  deletingId,
}) => {

  const idx = rowIndex * colCount + columnIndex;
  if (idx >= allItems.length) return <div style={style} />;

  const item = allItems[idx];

  if (item.__isAddCard) {
    return (
      <div style={style} className="vgrid-cell">
        <GameCard variant="add" t={t} onClick={onAddGame} />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`vgrid-cell ${deletingId === item.id ? "deleting" : ""}`}
      data-id={String(item.id)}
    >
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
    </div>
  );
};
const VirtualGameGrid = ({
  games,
  itemHeight = 260,
  colCount = 4,
  containerH = 600,
  containerW = 1000,
  activeTab,
  activeMenuIndex,
  onToggleMenu,
  onDeleteRequest,
  onToggleFavorite,
  onAddGame,
  t,
  deletingId,
}) => {
  // Add a virtual "add" card at the end
  const allItems = [...games, { __isAddCard: true }];
  const rowCount = Math.ceil(allItems.length / colCount);
  const colWidth = containerW / colCount;

  // cellProps passes data to CellComponent (react-window v2 API)
  const cellProps = {
    allItems,
    colCount,
    activeMenuIndex,
    onToggleMenu,
    onDeleteRequest,
    onToggleFavorite,
    onAddGame,
    t,
    deletingId,
  };

  return (
    <Grid
      key={`${activeTab}-${colCount}`}
      className="vgrid-container tab-content-anim"
      cellComponent={CellComponent}
      cellProps={cellProps}
      columnCount={colCount}
      columnWidth={colWidth}
      height={containerH}
      rowCount={rowCount}
      rowHeight={itemHeight}
      width={containerW}
      overscanCount={2}
    />
  );
};

export default React.memo(VirtualGameGrid);
