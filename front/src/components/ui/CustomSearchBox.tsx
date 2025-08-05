import React, { useState } from 'react';
import './CustomSearchBox.css';

interface CustomSearchBoxProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const CustomSearchBox: React.FC<CustomSearchBoxProps> = ({
  placeholder = "Search articles...",
  onSearch,
  className = "",
  value,
  onChange
}) => {
  const [internalValue, setInternalValue] = useState('');
  
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(currentValue.trim());
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    } else {
      setInternalValue('');
    }
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form className={`custom-search-box ${className}`} onSubmit={handleSubmit}>
      <div className="custom-search-box__container">
        <div className="custom-search-box__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <input
          type="text"
          className="custom-search-box__input"
          placeholder={placeholder}
          value={currentValue}
          onChange={handleChange}
          aria-label="Search articles"
        />
        
        {currentValue && (
          <button
            type="button"
            className="custom-search-box__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
};
