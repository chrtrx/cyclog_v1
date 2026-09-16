// Hintergrundfarbe je Thema – wird zusätzlich als theme-color gesetzt, damit
// Statusleiste und Browser-Oberfläche zur gewählten Darstellung passen und
// nicht dauerhaft im Dunkelblau des Standardthemas bleiben.
const THEME_BG = { dark: '#070d1a', mono: '#08080a', light: '#f0f5ff' }

export function getTheme() {
  return localStorage.getItem('theme') || 'dark'
}

export function setTheme(t) {
  localStorage.setItem('theme', t)
  document.documentElement.dataset.theme = t
  const m = document.getElementById('theme-color')
  if (m) m.setAttribute('content', THEME_BG[t] || THEME_BG.dark)
}
