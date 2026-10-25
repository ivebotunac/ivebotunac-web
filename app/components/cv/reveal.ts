import type { InjectionKey } from 'vue'

// The page adds a section id once it has scrolled into view; the section then fades in.
export interface CvReveal {
  seen: Set<string>
}

export const CV_REVEAL_KEY: InjectionKey<CvReveal> = Symbol('cv-reveal')
