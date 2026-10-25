// Page links shared by the header bar and its mobile menu.
export const NAV_LINKS = [
  { to: '/', label: 'Home' }
] as const

// The CV's numbered index: the rail lists it, the page observes these ids.
export const CV_SECTIONS = [
  { id: 'about', num: '01', label: 'About', title: 'About' },
  { id: 'experience', num: '02', label: 'Experience', title: 'Experience' },
  { id: 'publications', num: '03', label: 'Publications', title: 'Publications' },
  { id: 'talks', num: '04', label: 'Talks', title: 'Talks & Speaking' },
  { id: 'education', num: '05', label: 'Education', title: 'Education' },
  { id: 'certifications', num: '06', label: 'Certifications', title: 'Certifications' },
  { id: 'skills', num: '07', label: 'Skills', title: 'Skills & Languages' }
] as const

export type CvSectionId = typeof CV_SECTIONS[number]['id']
