import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CardDescription = ({ card, onDescriptionChange, canEdit, hasChanged = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(card.description || '');

  const handleSave = () => {
    onDescriptionChange(description);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(card.description || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-surface/50 rounded-xl p-4 sm:p-6 border border-border/30 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon name="AlignLeft" size={14} className="text-primary sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-text-primary">Description</h3>
        </div>
        {hasChanged && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-md flex-shrink-0">
            <Icon name="Edit" size={12} />
            <span className="hidden sm:inline">Modified</span>
            <span className="sm:hidden">•</span>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3 sm:space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a more detailed description..."
            className="w-full min-h-[120px] sm:min-h-[140px] p-3 sm:p-4 border-2 border-border/30 rounded-lg resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-surface text-sm sm:text-base"
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
        <div className="pl-1 sm:pl-2">
          {card.description ? (
            <div
              className={`text-text-primary whitespace-pre-wrap leading-relaxed text-sm sm:text-base ${canEdit ? 'cursor-pointer hover:bg-muted/50 rounded-lg p-2 sm:p-3 -m-2 sm:-m-3 transition-colors' : ''}`}
              onClick={() => canEdit && setIsEditing(true)}
            >
              {card.description}
            </div>
          ) : (
            <div
              className={`text-text-secondary italic py-6 sm:py-8 text-center border-2 border-dashed border-border/30 rounded-lg ${canEdit ? 'cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-colors' : ''}`}
              onClick={() => canEdit && setIsEditing(true)}
            >
              <Icon name="Plus" size={18} className="mx-auto mb-2 text-text-secondary sm:w-5 sm:h-5" />
              <p className="text-sm sm:text-base">Add a more detailed description...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardDescription;