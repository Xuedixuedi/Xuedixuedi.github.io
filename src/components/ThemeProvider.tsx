import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode } from 'react'

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  )
}
