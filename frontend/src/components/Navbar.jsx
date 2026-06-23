import logo from "../assets/logo.png";
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import DarkToggle from './DarkToggle'

const links = [
  { name: 'Home', href: '#' },
  { name: 'Recipe Analyzer', href: '#recipe' },
  { name: 'Weekly Planner', href: '#planner' },
  { name: 'History', href: '#history' },
  { name: 'About', href: '#about' }
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="SmartPlate AI"
        className="w-14 h-14 rounded-full object-cover bg-white p-1 shadow-md"
      />

      <div className="text-left">
        <div className="font-semibold text-lg text-white">
          SmartPlate AI
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Turn Leftovers Into Opportunities.
        </div>
      </div>
    </div>
  );
}
export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="w-full sticky top-0 z-50 bg-[#071220]/95 backdrop-blur-md">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-3">
              <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                <Logo />
              </motion.div>
            </a>
            <div className="hidden md:flex items-center gap-2">
              {links.map((l) => (
                <a
                  key={l.name}
                  href={l.href}
                  className="px-3 py-2 rounded-md text-base font-medium text-white hover:text-green-400 transition duration-300"
                >
                  {l.name}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
            </div>
            <div className="md:hidden">
              <button
                aria-label="Toggle menu"
                className="p-2 rounded-lg bg-[#12203a] border border-gray-700 text-white"
                onClick={() => setOpen((s) => !s)}
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="mt-3 md:hidden bg-white/60 dark:bg-[#12203a]/90 backdrop-blur-sm border border-white/20 dark:border-[#0f1720] rounded-xl p-4 shadow-lg"
            >
              <div className="flex flex-col gap-2">
                {links.map((l) => (
                  <a key={l.name} href={l.href} className="px-3 py-2 rounded-md text-base font-medium text-[#1f2937] dark:text-white hover:bg-eco-50 dark:hover:bg-[#12203a]/60 transition">
                    {l.name}
                  </a>
                ))}
                <div className="pt-2 border-t border-white/20 dark:border-[#0f1720] mt-2">
                  <DarkToggle />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
