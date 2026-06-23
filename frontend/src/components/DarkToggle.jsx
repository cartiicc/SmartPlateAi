import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DarkToggle() {
  const [dark, setDark] = useState(() => {
    try {
      const v = localStorage.getItem('theme')
      if (v) return v === 'dark'
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <button
      aria-label="Toggle dark mode"
      className="p-2 rounded-lg bg-white dark:bg-[#12203a] border border-white/20 dark:border-[#0f1720] shadow-sm text-[#1f2937] dark:text-white"
      onClick={() => setDark((s) => !s)}
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ rotate: -20, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {dark ? <Moon size={18} /> : <Sun size={18} />}
      </motion.span>
    </button>
  )
}
