export default function Footer() {
  return (
    <footer className="mt-12">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="bg-white dark:bg-[#12203a]/95 backdrop-blur-sm border border-white/20 dark:border-[#0f1720] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-[#1f2937] dark:text-white">Developed by <span className="font-semibold">Kartik A</span> | Inderprastha Engineering College</div>
          <div className="text-xs text-[#4b5563] dark:text-white/80">© {new Date().getFullYear()} SmartPlate AI — Turn Leftovers Into Opportunities.</div>
        </div>
      </div>
    </footer>
  )
}
