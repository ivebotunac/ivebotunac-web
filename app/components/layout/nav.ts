// Page links shared by the header bar and its mobile menu.
export const NAV_LINKS = [
  { to: '/', label: 'Home' }
] as const

// The CV's numbered index: the rail lists it, the page observes these ids.
export const CV_SECTIONS = [
  { id: 'about', num: '01', label: 'About', title: 'About' },
  { id: 'experience', num: '02', label: 'Experience', title: 'Experience' },
  { id: 'publications', num: '03', label: 'Publications', title: 'Publications' },
  { id: 'education', num: '04', label: 'Education', title: 'Education' },
  { id: 'certifications', num: '05', label: 'Certifications', title: 'Certifications' },
  { id: 'skills', num: '06', label: 'Skills', title: 'Skills & Languages' }
] as const

export type CvSectionId = typeof CV_SECTIONS[number]['id']
