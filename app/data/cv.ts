import type { Cv } from '~/types/cv'

// Non-breaking spaces (U+00A0) keep the pairs the old markup bound with &nbsp; on one line.
export const cv: Cv = {
  name: 'Ive Botunac',
  credential: 'PhD',
  photo: '/images/ive-botunac-v2.webp',
  monogram: 'ib',
  role: ['PhD · AI Research Engineer', 'Assistant Professor · Founder'],
  location: 'Zadar, Croatia · 45°N',
  lead: [
    'AI research engineer, assistant professor and founder. I build agentic AI systems, lead partnerships, and publish – from ',
    { em: 'LLM-driven trading systems' },
    ' to a mental-health app with ',
    { em: '1.5 million+ downloads' },
    '.'
  ],
  about: 'AI researcher and engineer with more than 18 years in software development, over ten of them in AI. I help companies adopt AI from strategy to implementation: preparing organizations, building agentic AI systems, and teaching teams to work with AI. My background combines entrepreneurship, leadership and research. I founded and ran my own ventures, led AI and R&D teams, and work on European defence projects with partners across Europe. Today I lead partnerships at ALFATEC Group and CroAI, contribute to national AI policy, and teach computer science as an assistant professor.',
  contacts: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ivebotunac', external: true },
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=Yr-Z7D0AAAAJ', external: true },
    { label: 'CroRIS', href: 'https://www.croris.hr/osobe/profil/39063', external: true },
    { label: 'GitHub', href: 'https://github.com/ivebotunac', external: true },
    { label: 'X', href: 'https://x.com/ivebotunac', external: true }
  ],
  // 40 counts each course certificate once: the GCP data engineer certificate shares five courses with its specialization.
  stats: [
    { value: '18+', label: 'years in software development' },
    { value: '10+', label: 'years in AI' },
    { value: '10', label: 'published papers' },
    { value: '40', label: 'course certificates' }
  ],
  experience: [
    {
      org: 'ALFATEC Group',
      url: 'https://alfatec.ai',
      logo: '/images/logos/alfatec-v2.webp',
      monogram: 'A',
      kind: 'Full-time',
      location: 'Zagreb, Croatia',
      roles: [
        {
          title: 'Director of Partnerships',
          start: '2025-07',
          end: 'present',
          desc: 'Lead strategic partnerships and acquisitions – partner relations and AI coordination across international consortia on European Defence Fund projects such as HYBRID and LODESTAR II.'
        },
        {
          title: 'Director of Research & Development',
          start: '2021-12',
          end: '2025-08',
          desc: 'Drove the application of AI across innovative solutions – leading projects, collaborating with global partners, and building product teams.'
        },
        {
          title: 'Data Scientist',
          start: '2020-12',
          end: '2021-11',
          desc: 'Built machine-learning solutions tailored to client needs and helped form a team dedicated to in-house products.'
        }
      ]
    },
    {
      org: 'University of Zadar',
      url: 'https://www.unizd.hr',
      logo: '/images/logos/unizd.webp',
      monogram: 'U',
      kind: 'Part-time',
      location: 'Zadar, Croatia',
      roles: [
        {
          title: 'Assistant Professor',
          start: '2026-07',
          end: 'present',
          desc: 'Teaching computer science at the new Department of Mechatronics and Robotics and helping build its study programme.'
        }
      ]
    },
    {
      org: 'CroAI – Croatian AI Association',
      url: 'https://croai.org',
      logo: '/images/logos/croai-v2.webp',
      monogram: 'C',
      kind: 'Nonprofit',
      location: 'Zagreb, Croatia',
      roles: [
        {
          title: 'Board President',
          start: '2025-12',
          end: 'present',
          desc: 'Leading CroAI into its next chapter – new statute, Management & Supervisory Boards, and the direction of Croatia\'s AI community.'
        },
        {
          title: 'Vice President (acting President)',
          start: '2024-12',
          end: '2025-12',
          desc: 'Shaped Croatia\'s AI ecosystem – 3,600+ educators trained through “AI se educiraj”, and a seat in the working group for Croatia\'s AI Strategy 2026–2032.'
        }
      ]
    },
    {
      org: 'Primo Technology Ltd.',
      url: 'https://techprimo.ai',
      logo: '/images/logos/primo-v2.webp',
      monogram: 'P',
      kind: 'Self-employed',
      location: 'Zadar, Croatia',
      roles: [
        {
          title: 'Founder',
          start: '2025-02',
          end: 'present',
          desc: 'My AI consulting agency and indie dev studio – strategy, implementation and training, plus my own AI-powered mobile and web products.'
        }
      ]
    },
    {
      org: 'Sintelly',
      url: 'https://sintelly.com',
      logo: '/images/logos/sintelly-v2.webp',
      monogram: 'S',
      kind: 'Full-time',
      location: 'Zadar, Croatia',
      roles: [
        {
          title: 'Founder & CEO',
          start: '2017-05',
          end: '2025-12',
          desc: 'Founded and led Sintelly, an AI + CBT mental-health app that reached over 1.5M downloads.'
        }
      ]
    },
    {
      org: 'Zadar Developers Hub · ZadarConnect',
      logo: '/images/logos/zddevhub-v2.webp',
      monogram: 'Z',
      location: 'Zadar, Croatia',
      roles: [
        {
          title: 'President',
          start: '2022-09',
          end: '2025-06',
          desc: 'Led the ZadarConnect project – meetups and the SheepAI Hackathon (88 participants, €35,000 prize pool), growing Zadar\'s tech community.'
        }
      ]
    },
    {
      org: 'Ministry of Defence (MORH) / Croatian Air Force',
      url: 'https://www.morh.hr',
      logo: '/images/logos/morh-v2.webp',
      monogram: 'M',
      location: 'Zadar, Croatia',
      roles: [
        { title: 'Technician', start: '2009-02', end: '2017-02' }
      ]
    }
  ],
  publications: [
    {
      year: 2025,
      title: 'Automated Trading Framework Using LLM Driven Features and Deep Reinforcement Learning',
      authors: ['Ive Botunac', 'Tomislav Petković', 'Jurica Bosna']
    },
    {
      year: 2025,
      title: 'Implementation of a Multi-Agent AI System for Financial Trading Decision Making',
      authors: ['Ive Botunac'],
      venue: 'Oeconomica Jadertina'
    },
    {
      year: 2024,
      title: 'Comparing Fine-Tuning and Prompt Engineering for Multi-Class Classification in Hospitality Review Analysis',
      authors: ['Ive Botunac', 'Marija Brkić Bakarić', 'Maja Matetić'],
      venue: 'Applied Sciences (CC)'
    },
    {
      year: 2024,
      title: 'Opportunities of Gen AI in the Banking Industry with regards to the AI Act, GDPR, Data Act and DORA',
      authors: ['Ive Botunac', 'Natalija Parlov', 'Jurica Bosna'],
      venue: '13th Mediterranean Conference on Embedded Computing (MECO), SCOPUS'
    },
    {
      year: 2024,
      title: 'Optimization of Traditional Stock Market Strategies Using the LSTM Hybrid Approach',
      authors: ['Ive Botunac', 'Jurica Bosna', 'Maja Matetić'],
      venue: 'Information 15.3 (2024): 136, SCI index',
      doi: '10.3390/info15030136'
    },
    {
      year: 2024,
      title: 'Artificial Intelligence, ESG Innovations in Tourism, and Personal Data Management',
      authors: ['Natalija Parlov', 'Nada Bašić', 'Ive Botunac'],
      venue: 'Acta Economica Et Turistica'
    },
    {
      year: 2020,
      title: 'The Effect of Feature Selection on the Performance of LSTM Neural Networks in Stock Market Predictions',
      authors: ['Ive Botunac', 'Ante Panjkota', 'Maja Matetić'],
      venue: '31st DAAAM International Symposium, SCOPUS'
    },
    {
      year: 2019,
      title: 'The Importance of Time Series Data Filtering for Predicting Stock Market Movement Using Neural Networks',
      authors: ['Ive Botunac', 'Ante Panjkota', 'Maja Matetić'],
      venue: '30th DAAAM International Symposium, SCOPUS'
    },
    {
      year: 2017,
      title: 'Analysis of the Security Challenge in Maritime Cloud Computing',
      authors: ['Ive Botunac', 'Juraj Poljak', 'Dino Županović'],
      venue: '7th International Maritime Science Conference, Split (TRID)'
    },
    {
      year: 2017,
      title: 'Analysis of Software Threats to the Automatic Identification System',
      authors: ['Ive Botunac', 'Marijan Gržan'],
      venue: 'Brodogradnja 68(1): 97–105, SCI index'
    }
  ],
  education: [
    {
      start: 2017,
      end: 2025,
      degree: 'PhD, Informatics',
      sub: 'Intelligent Computer Systems',
      institution: 'University of Rijeka, Faculty of Informatics and Digital Technologies',
      eqf: 8,
      thesis: 'An Automated Stock Market Trading System Based on Deep Reinforcement Learning'
    },
    {
      start: 2015,
      end: 2017,
      degree: 'MSc, Management',
      institution: 'University of Zadar, Department of Economics',
      eqf: 7,
      thesis: 'Applying machine learning methods to predict the movement of the stock market index'
    },
    {
      start: 2012,
      end: 2015,
      degree: 'BSc, Nautical Studies & Maritime Transport Technology',
      institution: 'University of Zadar, Maritime Department',
      eqf: 6,
      thesis: 'Evolution of the cyber threat in the maritime industry'
    }
  ],
  certifications: [
    { year: 2025, title: 'Agentic AI', url: 'https://learn.deeplearning.ai/certificates/3f596ea9-b6a6-4497-8364-87abcb52df45', issuer: 'DeepLearning.AI', kind: 'Course' },
    { year: 2023, title: 'Generative AI with Large Language Models', url: 'https://www.coursera.org/account/accomplishments/verify/5SES9VBUM99C', issuer: 'Coursera', kind: 'Course' },
    { year: 2023, title: 'Machine Learning Specialization', url: 'https://www.coursera.org/account/accomplishments/specialization/PWNBSHGXM7WC', issuer: 'Coursera', kind: 'Specialization', courses: 3 },
    { year: 2022, title: 'Product Owner Training (Certified Product Owner)', url: 'https://www.virtualbadge.io/certificate-validator?credential=cer-865d8b9d-cd94-4a00-957d-380b851e', issuer: 'Product Manager HQ', kind: 'Training' },
    { year: 2022, title: 'Natural Language Processing Specialization', url: 'https://www.coursera.org/account/accomplishments/specialization/certificate/469VHEERYHVM', issuer: 'Coursera', kind: 'Specialization', courses: 4 },
    { year: 2021, title: 'Reinforcement Learning Specialization', url: 'https://www.coursera.org/account/accomplishments/specialization/ZHQSHWS7NBPQ', issuer: 'Coursera', kind: 'Specialization', courses: 4 },
    { year: 2021, title: 'Data Engineering, Big Data & ML on GCP', url: 'https://www.coursera.org/account/accomplishments/specialization/certificate/TQNP7KWKS7EF', issuer: 'Coursera', kind: 'Specialization', courses: 5 },
    { year: 2021, title: 'Google Cloud: Cloud Data Engineer (prep)', url: 'https://www.coursera.org/account/accomplishments/professional-cert/56S9ABE5SVLG', issuer: 'Coursera', kind: 'Professional certificate', courses: 6 },
    { year: 2019, title: 'DeepLearning.AI TensorFlow Developer', url: 'https://www.coursera.org/account/accomplishments/specialization/3Y3WYXK9NSA3', issuer: 'Coursera', kind: 'Professional certificate', courses: 4 },
    { year: 2019, title: 'Advanced Machine Learning on Google Cloud', url: 'https://www.coursera.org/account/accomplishments/specialization/certificate/U8SLLEQX9JN8', issuer: 'Coursera', kind: 'Specialization', courses: 5 },
    { year: 2018, title: 'Machine Learning on Google Cloud', url: 'https://www.coursera.org/account/accomplishments/specialization/6KT4ZMP2CBHV', issuer: 'Coursera', kind: 'Specialization', courses: 5 },
    { year: 2018, title: 'Deep Learning Specialization', url: 'https://www.coursera.org/account/accomplishments/specialization/53X8QYCNC3ZT', issuer: 'Coursera', kind: 'Specialization', courses: 5 },
    { year: 2016, title: 'Machine Learning', url: 'https://www.coursera.org/account/accomplishments/verify/C8WQMJXQZLLN', issuer: 'Coursera', kind: 'Course' }
  ],
  skills: [
    { label: 'AI / ML', text: 'Deep understanding of AI & ML concepts and algorithms; neural networks (CNN, RNN, Transformers); generative AI models; LLM fine-tuning, RAG and multi-agent systems (LangGraph).' },
    { label: 'Programming', text: 'Python – TensorFlow, Transformers, LangChain, Scikit-learn, Django, FastAPI, Pandas.' },
    { label: 'Web', text: 'HTML / CSS / JS / TS, Angular, Ionic, Vue.js, Node.js (Express.js).' },
    { label: 'Cloud', text: 'Amazon AWS, Google Cloud Platform, Firebase.' },
    { label: 'Other', text: 'SQL, Docker, MLOps.' },
    { label: 'Languages', text: 'Croatian – native. English – B2 (listening, reading, spoken, writing).' }
  ],
  updated: '2026-10'
}
