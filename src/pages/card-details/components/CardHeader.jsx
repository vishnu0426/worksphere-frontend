import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CardHeader = ({ card, onTitleChange, onClose, onDelete, canEdit, canDelete, hasChanged = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);

  const handleSave = () => {
    onTitleChange(title);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-start justify-between p-6 sm:p-8 border-b border-border/50 bg-gradient-to-r from-surface to-muted/20">
      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
          <Icon name="Square" size={18} className="text-primary sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full text-xl sm:text-2xl font-bold bg-transparent border-2 border-primary/20 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-lg px-3 sm:px-4 py-2 sm:py-3 transition-all"
                autoFocus
              />
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Button size="sm" onClick={handleSave} className="px-4 sm:px-6">
                  <Icon name="Check" size={14} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Save</span>
                  <span className="sm:hidden">✓</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="px-4 sm:px-6">
                  <Icon name="X" size={14} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Cancel</span>
                  <span className="sm:hidden">✕</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <h1
                  className={`text-xl sm:text-2xl font-bold text-text-primary leading-tight break-words ${canEdit ? 'cursor-pointer hover:bg-muted/50 rounded-lg px-2 sm:px-3 py-1 sm:py-2 -mx-2 sm:-mx-3 -my-1 sm:-my-2 transition-colors' : ''}`}
                  onClick={() => canEdit && setIsEditing(true)}
                >
                  {card.title}
                </h1>
                {hasChanged && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-md flex-shrink-0">
                    <Icon name="Edit" size={12} />
                    <span className="hidden sm:inline">Modified</span>
                    <span className="sm:hidden">•</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Icon name="List" size={14} />
                  <span>in list <span className="font-semibold text-text-primary">{card.columnTitle}</span></span>
                </div>
                <span className="hidden sm:block w-1 h-1 bg-text-secondary rounded-full"></span>
                <div className="flex items-center gap-2">
                  <Icon name="Calendar" size={14} />
                  <span>Created {new Date(card.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2 ml-3 sm:ml-6 flex-shrink-0">
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2 sm:p-3"
            title="Delete card"
          >
            <Icon name="Trash2" size={16} className="sm:w-[18px] sm:h-[18px]" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 sm:p-3"
          title="Close"
        >
          <Icon name="X" size={18} className="sm:w-5 sm:h-5" />
        </Button>
      </div>
    </div>
  );
};

export default CardHeader;