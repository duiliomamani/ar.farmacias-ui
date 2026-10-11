'use client'

import { Instagram } from 'lucide-react'

const links = [
  { href: 'https://www.instagram.com/jujuy.dev/', label: 'Instagram', icon: Instagram },
  { href: 'https://x.com/JujuyDevAr', label: 'X' },
]

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  )
}

function JujuyDevLogo() {
  return (
    <svg viewBox="240 105 520 400" width="26" height="20" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="jjd-grad" x1="240" y1="105" x2="760" y2="505" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF6B58" />
          <stop offset="0.33" stopColor="#EC4586" />
          <stop offset="0.66" stopColor="#8B38E8" />
          <stop offset="1" stopColor="#2F6BF0" />
        </linearGradient>
      </defs>
      <rect x="240" y="105" width="520" height="400" rx="85" fill="url(#jjd-grad)" />
      <g fill="#fff">
        <circle cx="312" cy="166" r="15" />
        <circle cx="362" cy="166" r="15" />
        <circle cx="412" cy="166" r="15" />
      </g>
      <g fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path d="M320 266l56 54-56 55" />
        <path d="M408 375l82-88 74 74h94" />
      </g>
    </svg>
  )
}

export function JujuyDevLinks() {
  return (
    <div className="flex items-center gap-1" aria-label="Redes sociales de jujuy.dev">
      <a href="https://jujuy.dev.ar/?utm_source=ig&utm_medium=social&utm_content=link_in_bio" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10">
        <JujuyDevLogo />jujuy.dev
      </a>
      <nav className="flex items-center gap-1" aria-label="Redes sociales de jujuy.dev">
        {links.map(({ href, label, icon: Icon }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {label === 'X' ? <XLogo /> : Icon && <Icon className="h-5 w-5" />}
          </a>
        ))}
      </nav>
    </div>
  )
}
