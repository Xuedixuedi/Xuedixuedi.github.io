import { useState } from 'react'
import { AiOutlineSearch } from 'react-icons/ai'

type Props = {
  onChange: (value: string) => void
}

export const SearchInput = ({ onChange }: Props) => {
  return (
    <div className="relative mb-6 group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <AiOutlineSearch className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl leading-5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
        placeholder="Search Keyword..."
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
