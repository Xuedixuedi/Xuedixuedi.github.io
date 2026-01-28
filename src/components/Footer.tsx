import { CONFIG } from '../../site.config'

export const Footer = () => {
  return (
    <footer className="p-6 text-center text-gray-500 text-sm mt-12">
      <p>© {CONFIG.since} {CONFIG.profile.name}. All rights reserved.</p>
    </footer>
  )
}
