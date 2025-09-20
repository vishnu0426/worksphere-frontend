import React, { useState, useRef, useEffect } from 'react';
import realApiService from '../../utils/realApiService';

const MentionTextarea = ({ 
  value, 
  onChange, 
  placeholder = "Add a comment...", 
  cardId,
  className = "",
  rows = 3,
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounce search to avoid too many API calls
  const searchTimeoutRef = useRef(null);

  const fetchMentionSuggestions = async (searchTerm) => {
    if (!cardId) return;
    
    try {
      setLoading(true);
      const response = await realApiService.cards.getMentionAutocomplete(cardId, searchTerm);
      if (response.success && response.data) {
        setSuggestions(response.data);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching mention suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Check for @ mentions
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      const startPos = cursorPos - mentionMatch[0].length;
      
      setMentionStartPos(startPos);
      setMentionSearch(searchTerm);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
      
      // Debounce the search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        fetchMentionSuggestions(searchTerm);
      }, 300);
    } else {
      setShowSuggestions(false);
      setMentionStartPos(-1);
      setMentionSearch('');
      setSuggestions([]);
    }
  };

  const insertMention = (member) => {
    if (mentionStartPos === -1) return;
    
    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(mentionStartPos + mentionSearch.length + 1); // +1 for @
    const mentionText = `@${member.primary_username}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    onChange(newValue);
    
    // Close suggestions
    setShowSuggestions(false);
    setMentionStartPos(-1);
    setMentionSearch('');
    setSuggestions([]);
    
    // Focus back to textarea and position cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        textareaRef.current && 
        !textareaRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
      />
      
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((member, index) => (
              <div
                key={member.id}
                onClick={() => insertMention(member)}
                className={`px-4 py-2 cursor-pointer text-sm hover:bg-gray-100 ${
                  index === selectedSuggestionIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {member.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      @{member.primary_username} • {member.email}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No members found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
