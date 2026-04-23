'use client'
import { useEffect, useState } from 'react'

export default function useTheme() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Dark is the app default — only override if user explicitly saved a preference
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return { theme, toggleTheme }
}
