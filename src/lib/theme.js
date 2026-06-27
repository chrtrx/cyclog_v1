export function getTheme() {
  return localStorage.getItem('theme') || 'dark'
}

export function setTheme(t) {
  localStorage.setItem('theme', t)
  document.documentElement.dataset.theme = t
}
