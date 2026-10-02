import React, { createContext, useContext, useState } from 'react'

interface SearchContextType {
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => {},
})

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('')
  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearch = () => useContext(SearchContext)
