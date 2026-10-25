// 'YYYY-MM'
export type YearMonth = `${number}-${number}`

// Text with emphasised runs, for copy that mixes plain and <em> text.
export type Inline = string | { em: string }

export interface Role {
  title: string
  start: YearMonth
  end: YearMonth | 'present'
  desc?: string
}

export interface Org {
  org: string
  url?: string
  logo?: string
  monogram: string
  kind?: string
  location?: string
  roles: Role[]
}

export interface Publication {
  year: number
  title: string
  authors: string[]
  venue?: string
  // The bare DOI, e.g. 10.3390/info15030136; the link is https://doi.org/<doi>.
  doi?: string
}

export interface Talk {
  when: string
  title: string
  org: string
  summary?: string
}

export interface Education {
  start: number
  end: number
  degree: string
  sub?: string
  institution: string
  eqf?: number
  thesis?: string
}

export interface Certification {
  year?: number
  title: string
  url?: string
  issuer: string
}

export interface Skill {
  label: string
  text: string
}

export interface Contact {
  label: string
  href: string
  external: boolean
}

export interface Cv {
  name: string
  credential?: string
  photo?: string
  monogram: string
  // One item per rendered line.
  role: string[]
  location: string
  lead: Inline[]
  about: string
  contacts: Contact[]
  experience: Org[]
  publications: Publication[]
  talks: Talk[]
  education: Education[]
  certifications: Certification[]
  skills: Skill[]
  updated: YearMonth
}
