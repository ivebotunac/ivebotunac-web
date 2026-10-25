// Id of the section in view; the page's observer writes it, the game reads it.
export function useActiveSection() {
  return useState<string>('active-section', () => 'about')
}
