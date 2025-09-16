import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import TaskCard from './TaskCard';

const BoardColumn = ({
  column,
  cards,
  onCardMove,
  onCardClick,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  members,
  canCreateCards = true,
  canEditColumns = true,
  canDeleteColumns = true,
  canDragCards = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);

  const [{ isOver }, drop] = useDrop({
    accept: 'card',
    drop: (item) => {
      if (item.columnId !== column.id) {
        onCardMove(item.id, item.columnId, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleTitleSave = () => {
    if (columnTitle.trim() && columnTitle !== column.title) {
      onEditColumn(column.id, { title: columnTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setColumnTitle(column.title);
      setIsEditing(false);
    }
  };

  // const getColumnColor = () => {
  //   const colors = {
  //     'todo': 'border-slate-300 bg-slate-50',
  //     'in-progress': 'border-blue-300 bg-blue-50',
  //     'review': 'border-amber-300 bg-amber-50',
  //     'done': 'border-emerald-300 bg-emerald-50'
  //   };
  //   return colors[column.status] || 'border-slate-300 bg-slate-50';
  // };

  return (
    <div
      ref={drop}
      className={`flex flex-col w-72 min-w-72 bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all duration-200 ${
        isOver
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg transform scale-[1.02]'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
      }`}
    >
      {/* Enhanced Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-t-xl">
        <div className="flex items-center space-x-3 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyPress}
              className="flex-1 px-3 py-2 text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          ) : (
            <h3
              className={`text-sm font-semibold text-gray-900 dark:text-white transition-colors ${
                canEditColumns ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : 'cursor-default'
              }`}
              onClick={canEditColumns ? () => setIsEditing(true) : undefined}
            >
              {column.title}
            </h3>
          )}
          <span className="px-2.5 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full min-w-[24px] text-center">
            {cards.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {canCreateCards && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddCard(column.id)}
              className="h-6 w-6"
            >
              <Icon name="Plus" size={14} />
            </Button>
          )}
          {canDeleteColumns && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteColumn(column.id)}
              className="h-6 w-6 text-destructive hover:text-destructive"
            >
              <Icon name="Trash2" size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Cards Container */}
      <div className="flex-1 p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            members={members}
            canDrag={canDragCards}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Icon name="Plus" size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-3">No tasks yet</p>
            {canCreateCards && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddCard(column.id)}
                className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Add first card
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;