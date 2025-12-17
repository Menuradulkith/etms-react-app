import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import './SearchableSelect.css';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  labelField = 'label',
  valueField = 'value',
  disabled = false,
  className = '',
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find the selected option to display
  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'object' ? opt[valueField] : opt;
    return optValue === value;
  });

  const selectedLabel = selectedOption
    ? (typeof selectedOption === 'object' ? selectedOption[labelField] : selectedOption)
    : '';

  // Filter options based on search term
  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'object' ? opt[labelField] : opt;
    return label?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (option) => {
    const optValue = typeof option === 'object' ? option[valueField] : option;
    onChange({
      target: {
        name: name,
        value: optValue
      }
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({
      target: {
        name: name,
        value: ''
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div 
      className={`searchable-select ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
      ref={containerRef}
      id={id}
    >
      <div className="searchable-select-trigger" onClick={handleToggle}>
        <span className={`searchable-select-value ${!selectedLabel ? 'placeholder' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <div className="searchable-select-icons">
          {value && !disabled && (
            <X size={16} className="clear-icon" onClick={handleClear} />
          )}
          <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="search-input"
            />
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">No results found</div>
            ) : (
              filteredOptions.map((option, index) => {
                const optValue = typeof option === 'object' ? option[valueField] : option;
                const optLabel = typeof option === 'object' ? option[labelField] : option;
                const isSelected = optValue === value;

                return (
                  <div
                    key={optValue || index}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {optLabel}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
