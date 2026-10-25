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
  // "Specialization", "Professional certificate", "Course" or "Training".
  kind: string
  courses?: number
}

// A skill area: what I do with it, the tools that carry it (the daily ones first), and where it was done.
export interface Skill {
  label: string
  claim: string
  core: string[]
  also?: string[]
  proof?: string
}

export interface Stat {
  value: string
  label: string
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
  stats: Stat[]
  experience: Org[]
  publications: Publication[]
  education: Education[]
  certifications: Certification[]
  skills: Skill[]
  updated: YearMonth
}
