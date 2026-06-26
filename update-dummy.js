import fs from 'fs';

const data = JSON.parse(fs.readFileSync('test-db/dummy-event-data.json', 'utf8'));

const judges = [
  { name: 'Dr. Ahmed Rahman', role: 'AI Research Lead', avatar: 'https://placehold.co/80x80/2563eb/ffffff?text=AR' },
  { name: 'Sarah Khan', role: 'CTO, TechBD', avatar: 'https://placehold.co/80x80/7c3aed/ffffff?text=SK' },
  { name: 'Prof. Nusrat Jahan', role: 'CS Department Head', avatar: 'https://placehold.co/80x80/059669/ffffff?text=NJ' },
  { name: 'Karim Hassan', role: 'VP Engineering, DataCo', avatar: 'https://placehold.co/80x80/ea580c/ffffff?text=KH' },
];

const sponsors = [
  { name: 'TechBD', logo: 'https://placehold.co/120x50/e2e8f0/475569?text=TechBD' },
  { name: 'DataCamp BD', logo: 'https://placehold.co/120x50/e2e8f0/475569?text=DataCamp' },
  { name: 'CloudServe', logo: 'https://placehold.co/120x50/e2e8f0/475569?text=CloudServe' },
  { name: 'InnovateBD', logo: 'https://placehold.co/120x50/e2e8f0/475569?text=InnovateBD' },
];

const getRules = (ev) => [
  'All participants must be currently enrolled in a recognized educational institution or be working professionals.',
  'Teams must consist of a minimum of ' + ev.teamSizeMin + ' and a maximum of ' + ev.teamSizeMax + ' members.',
  'All code must be written during the competition period. Pre-existing projects are not allowed.',
  'Participants may use open-source libraries and APIs, but must disclose all third-party dependencies.',
  'Submissions must include a working demo, source code, and a presentation pitch.',
  'Judges\' decisions are final. Plagiarism or dishonesty will result in immediate disqualification.',
  'Participants retain intellectual property rights to their submissions.',
];

const getFaqs = (ev) => [
  { id: 1, question: 'Who can participate?', answer: 'Anyone who meets the eligibility criteria can participate. Students, professionals, and hobbyists are all welcome. International participants may join if the event supports online participation.' },
  { id: 2, question: 'Is there a registration fee?', answer: 'No, participation is completely free. All tools, resources, and mentorship are provided at no cost.' },
  { id: 3, question: 'Can I participate solo?', answer: ev.teamSizeMin === 1 ? 'Yes! Solo participation is allowed for this event.' : `This event requires teams of ${ev.teamSizeMin}–${ev.teamSizeMax} members. If you don't have a team, join our Discord to find teammates.` },
  { id: 4, question: 'What should I bring?', answer: 'Your laptop, charger, and creativity. If the event is in-person, we provide meals, workspace, and internet. For online events, ensure you have a stable internet connection.' },
  { id: 5, question: 'How are projects judged?', answer: 'Projects are evaluated on innovation (25%), technical complexity (25%), design & UX (20%), impact & feasibility (20%), and presentation quality (10%).' },
];

data.forEach(ev => {
  ev.judges = ev.judges || judges;
  ev.sponsors = ev.sponsors || sponsors;
  ev.rules = getRules(ev);
  ev.faqs = getFaqs(ev);
});

fs.writeFileSync('test-db/dummy-event-data.json', JSON.stringify(data, null, 2));
console.log('Updated JSON');
