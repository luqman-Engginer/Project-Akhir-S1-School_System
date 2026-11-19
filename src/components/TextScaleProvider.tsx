'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface TextScaleContextType {
  isLarge: boolean
  toggleTextScale: () => void
}

const TextScaleContext = createContext<TextScaleContextType>({
  isLarge: false,
  toggleTextScale: () => {},
})

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [isLarge, setIsLarge] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sekolahku-text-scale')
      if (stored === 'large') {
        setIsLarge(true)
        document.documentElement.classList.add('text-large')
      } else {
        setIsLarge(false)
        document.documentElement.classList.remove('text-large')
      }
    } catch {
      // localStorage mungkin tidak tersedia di private browsing tertentu
    }
  }, [])

  const toggleTextScale = () => {
    setIsLarge((prev) => {
      const next = !prev
      try {
        if (next) {
          localStorage.setItem('sekolahku-text-scale', 'large')
          document.documentElement.classList.add('text-large')
        } else {
          localStorage.setItem('sekolahku-text-scale', 'normal')
          document.documentElement.classList.remove('text-large')
        }
      } catch {
        // fallback
      }
      return next
    })
  }

  return (
    <TextScaleContext.Provider value={{ isLarge, toggleTextScale }}>
      {children}
    </TextScaleContext.Provider>
  )
}

export function useTextScale() {
  return useContext(TextScaleContext)
}
