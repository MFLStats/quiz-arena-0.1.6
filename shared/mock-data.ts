import type { Category, Question, User, ShopItem } from './types';
const TODAY = new Date().toISOString().split('T')[0];
// Helper to generate random activity map for the last 90 days
const generateActivityMap = () => {
  try {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      // 40% chance of activity on any given day
      if (Math.random() > 0.6) {
        // 1 to 8 matches
        map[dateStr] = Math.floor(Math.random() * 8) + 1;
      }
    }
    return map;
  } catch (e) {
    console.error("Failed to generate activity map", e);
    return {};
  }
};
export const MOCK_USER: User = {
  id: 'u1',
  name: 'Player One',
  elo: 1200,
  xp: 0,
  level: 1,
  country: 'US',
  title: 'Beta Tester',
  currency: 1500,
  friends: ['u2', 'u4'],
  inventory: [],
  achievements: [
    { achievementId: 'first_win', unlockedAt: Date.now() - 10000000 },
    { achievementId: 'speed_demon', unlockedAt: Date.now() - 5000000 }
  ],
  stats: { wins: 12, losses: 5, matches: 17 },
  dailyStats: {
    date: TODAY,
    score: 450
  },
  lastLogin: TODAY,
  loginStreak: 1,
  history: [
    {
      matchId: 'm_prev_1',
      opponentName: 'Quiz Master',
      result: 'loss',
      score: 350,
      opponentScore: 420,
      eloChange: -12,
      timestamp: Date.now() - 86400000
    },
    {
      matchId: 'm_prev_2',
      opponentName: 'Trivia Novice',
      result: 'win',
      score: 500,
      opponentScore: 200,
      eloChange: 15,
      timestamp: Date.now() - 172800000
    }
  ],
  activityMap: generateActivityMap()
};
export const MOCK_USERS: User[] = [
  MOCK_USER,
  {
    id: 'u2',
    name: 'Quiz Master',
    elo: 1450,
    xp: 5000,
    level: 15,
    country: 'GB',
    title: 'Grandmaster',
    currency: 5000,
    friends: ['u1'],
    inventory: [],
    achievements: [
      { achievementId: 'first_win', unlockedAt: Date.now() },
      { achievementId: 'perfect_round', unlockedAt: Date.now() },
      { achievementId: 'veteran', unlockedAt: Date.now() },
      { achievementId: 'streaker', unlockedAt: Date.now() }
    ],
    stats: { wins: 50, losses: 10, matches: 60 },
    dailyStats: {
      date: TODAY,
      score: 580
    },
    history: [],
    activityMap: generateActivityMap()
  },
  {
    id: 'u3',
    name: 'Trivia Novice',
    elo: 900,
    xp: 200,
    level: 2,
    country: 'JP',
    currency: 100,
    friends: [],
    inventory: [],
    achievements: [],
    stats: { wins: 2, losses: 15, matches: 17 },
    history: [],
    activityMap: generateActivityMap()
  },
  {
    id: 'u4',
    name: 'Speed Runner',
    elo: 1320,
    xp: 3500,
    level: 10,
    country: 'DE',
    title: 'Speedster',
    currency: 2500,
    friends: ['u1'],
    inventory: [],
    achievements: [
      { achievementId: 'first_win', unlockedAt: Date.now() },
      { achievementId: 'speed_demon', unlockedAt: Date.now() }
    ],
    stats: { wins: 30, losses: 12, matches: 42 },
    dailyStats: {
      date: TODAY,
      score: 520
    },
    history: [],
    activityMap: generateActivityMap()
  },
  // New Users for Country Leaderboard Testing
  {
    id: 'u5',
    name: 'Eagle Eye',
    elo: 1250,
    xp: 1200,
    level: 5,
    country: 'US',
    currency: 1200,
    friends: [],
    inventory: [],
    achievements: [],
    stats: { wins: 15, losses: 8, matches: 23 },
    history: [],
    activityMap: generateActivityMap()
  },
  {
    id: 'u6',
    name: 'London Calling',
    elo: 1380,
    xp: 4000,
    level: 12,
    country: 'GB',
    currency: 3000,
    friends: [],
    inventory: [],
    achievements: [],
    stats: { wins: 40, losses: 15, matches: 55 },
    history: [],
    activityMap: generateActivityMap()
  },
  {
    id: 'u7',
    name: 'Tokyo Drifter',
    elo: 1150,
    xp: 800,
    level: 4,
    country: 'JP',
    currency: 800,
    friends: [],
    inventory: [],
    achievements: [],
    stats: { wins: 10, losses: 10, matches: 20 },
    history: [],
    activityMap: generateActivityMap()
  },
  {
    id: 'u8',
    name: 'Berlin Wall',
    elo: 1290,
    xp: 2200,
    level: 8,
    country: 'DE',
    currency: 1800,
    friends: [],
    inventory: [],
    achievements: [],
    stats: { wins: 25, losses: 18, matches: 43 },
    history: [],
    activityMap: generateActivityMap()
  }
];
export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'science',
    name: 'Science',
    icon: 'Atom',
    description: 'Physics, Chemistry, and Biology',
    baseElo: 1200,
    color: 'from-blue-500 to-cyan-400',
    group: 'Education'
  },
  {
    id: 'history',
    name: 'History',
    icon: 'ScrollText',
    description: 'World events and civilizations',
    baseElo: 1150,
    color: 'from-amber-500 to-orange-400',
    group: 'Education'
  },
  {
    id: 'tech',
    name: 'Technology',
    icon: 'Cpu',
    description: 'Computers, AI, and Innovation',
    baseElo: 1300,
    color: 'from-purple-500 to-indigo-400',
    group: 'General'
  },
  {
    id: 'geo',
    name: 'Geography',
    icon: 'Globe',
    description: 'Countries, capitals, and maps',
    baseElo: 1100,
    color: 'from-emerald-500 to-green-400',
    group: 'Education'
  },
  {
    id: 'arts',
    name: 'Arts & Lit',
    icon: 'Palette',
    description: 'Books, paintings, and culture',
    baseElo: 1250,
    color: 'from-pink-500 to-rose-400',
    group: 'Education'
  },
  {
    id: 'movies',
    name: 'Movies',
    icon: 'Film',
    description: 'Cinema, actors, and awards',
    baseElo: 1180,
    color: 'from-red-500 to-orange-500',
    group: 'TV & Movies'
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: 'Flag',
    description: 'Identify countries by their flags',
    baseElo: 1100,
    color: 'from-indigo-500 to-blue-500',
    group: 'General'
  },
];
export const MOCK_QUESTIONS: Question[] = [
  // --- SCIENCE ---
  {
    id: 'q_sci_1',
    categoryId: 'science',
    text: 'What is the atomic number of Carbon?',
    options: ['12', '6', '14', '8'],
    correctIndex: 1,
  },
  {
    id: 'q_sci_2',
    categoryId: 'science',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
    correctIndex: 2,
  },
  {
    id: 'q_sci_3',
    categoryId: 'science',
    text: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
    correctIndex: 1,
  },
  {
    id: 'q_sci_4',
    categoryId: 'science',
    text: 'What is the speed of light in vacuum (approx)?',
    options: ['300,000 km/s', '150,000 km/s', '1,000,000 km/s', '3,000 km/s'],
    correctIndex: 0,
  },
  {
    id: 'q_sci_5',
    categoryId: 'science',
    text: 'Which particle has a negative charge?',
    options: ['Proton', 'Neutron', 'Electron', 'Photon'],
    correctIndex: 2,
  },
  {
    id: 'q_sci_6',
    categoryId: 'science',
    text: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Au', 'Fe', 'Pb'],
    correctIndex: 1,
  },
  {
    id: 'q_sci_7',
    categoryId: 'science',
    text: 'Which gas do plants absorb from the atmosphere?',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
    correctIndex: 2,
  },
  {
    id: 'q_sci_8',
    categoryId: 'science',
    text: 'What is the hardest natural substance on Earth?',
    options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
    correctIndex: 2,
  },
  {
    id: 'q_sci_9',
    categoryId: 'science',
    text: 'How many bones are in the adult human body?',
    options: ['206', '208', '210', '212'],
    correctIndex: 0,
  },
  {
    id: 'q_sci_10',
    categoryId: 'science',
    text: 'What is the study of fungi called?',
    options: ['Botany', 'Mycology', 'Virology', 'Zoology'],
    correctIndex: 1,
  },
  // --- HISTORY ---
  {
    id: 'q_hist_1',
    categoryId: 'history',
    text: 'Who was the first Emperor of Rome?',
    options: ['Julius Caesar', 'Augustus', 'Nero', 'Trajan'],
    correctIndex: 1,
  },
  {
    id: 'q_hist_2',
    categoryId: 'history',
    text: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
  },
  {
    id: 'q_hist_3',
    categoryId: 'history',
    text: 'Which civilization built the Machu Picchu?',
    options: ['Aztec', 'Maya', 'Inca', 'Olmec'],
    correctIndex: 2,
  },
  {
    id: 'q_hist_4',
    categoryId: 'history',
    text: 'Who wrote the Declaration of Independence?',
    options: ['George Washington', 'Thomas Jefferson', 'Benjamin Franklin', 'John Adams'],
    correctIndex: 1,
  },
  {
    id: 'q_hist_5',
    categoryId: 'history',
    text: 'The Industrial Revolution began in which country?',
    options: ['USA', 'Germany', 'France', 'Great Britain'],
    correctIndex: 3,
  },
  {
    id: 'q_hist_6',
    categoryId: 'history',
    text: 'Who was the first woman to fly solo across the Atlantic?',
    options: ['Amelia Earhart', 'Bessie Coleman', 'Harriet Quimby', 'Jacqueline Cochran'],
    correctIndex: 0,
  },
  {
    id: 'q_hist_7',
    categoryId: 'history',
    text: 'Which ancient wonder was located in Alexandria?',
    options: ['The Hanging Gardens', 'The Lighthouse', 'The Colossus', 'The Great Pyramid'],
    correctIndex: 1,
  },
  {
    id: 'q_hist_8',
    categoryId: 'history',
    text: 'The Magna Carta was signed in which year?',
    options: ['1066', '1215', '1492', '1776'],
    correctIndex: 1,
  },
  {
    id: 'q_hist_9',
    categoryId: 'history',
    text: 'Who was the first President of the United States?',
    options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'James Madison'],
    correctIndex: 2,
  },
  {
    id: 'q_hist_10',
    categoryId: 'history',
    text: 'Which war was fought between the North and South regions in the US?',
    options: ['The Civil War', 'The Revolutionary War', 'World War I', 'The War of 1812'],
    correctIndex: 0,
  },
  // --- TECHNOLOGY ---
  {
    id: 'q_tech_1',
    categoryId: 'tech',
    text: 'What does CPU stand for?',
    options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Process Utility', 'Core Processing Unit'],
    correctIndex: 0,
  },
  {
    id: 'q_tech_2',
    categoryId: 'tech',
    text: 'Who co-founded Apple alongside Steve Jobs?',
    options: ['Bill Gates', 'Steve Wozniak', 'Tim Cook', 'Elon Musk'],
    correctIndex: 1,
  },
  {
    id: 'q_tech_3',
    categoryId: 'tech',
    text: 'What is the main language used for web styling?',
    options: ['HTML', 'Python', 'CSS', 'Java'],
    correctIndex: 2,
  },
  {
    id: 'q_tech_4',
    categoryId: 'tech',
    text: 'Which company owns Android?',
    options: ['Apple', 'Microsoft', 'Samsung', 'Google'],
    correctIndex: 3,
  },
  {
    id: 'q_tech_5',
    categoryId: 'tech',
    text: 'What does HTTP stand for?',
    options: ['HyperText Transfer Protocol', 'HyperText Transmission Process', 'High Transfer Text Protocol', 'HyperLink Text Transfer Protocol'],
    correctIndex: 0,
  },
  {
    id: 'q_tech_6',
    categoryId: 'tech',
    text: 'What year was the first iPhone released?',
    options: ['2005', '2007', '2009', '2010'],
    correctIndex: 1,
  },
  {
    id: 'q_tech_7',
    categoryId: 'tech',
    text: 'Which social media platform was originally called "TheFacebook"?',
    options: ['Twitter', 'Instagram', 'Facebook', 'LinkedIn'],
    correctIndex: 2,
  },
  {
    id: 'q_tech_8',
    categoryId: 'tech',
    text: 'What does "AI" stand for?',
    options: ['Automated Intelligence', 'Artificial Intelligence', 'Advanced Interface', 'Algorithmic Integration'],
    correctIndex: 1,
  },
  {
    id: 'q_tech_9',
    categoryId: 'tech',
    text: 'Which programming language is known as the "mother of all languages"?',
    options: ['C', 'Java', 'Assembly', 'Fortran'],
    correctIndex: 0,
  },
  {
    id: 'q_tech_10',
    categoryId: 'tech',
    text: 'What is the name of the first electronic general-purpose computer?',
    options: ['ENIAC', 'UNIVAC', 'IBM 701', 'Altair 8800'],
    correctIndex: 0,
  },
  // --- GEOGRAPHY ---
  {
    id: 'q_geo_1',
    categoryId: 'geo',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Madrid', 'Paris'],
    correctIndex: 3,
  },
  {
    id: 'q_geo_2',
    categoryId: 'geo',
    text: 'Which is the largest continent by area?',
    options: ['Africa', 'North America', 'Asia', 'Europe'],
    correctIndex: 2,
  },
  {
    id: 'q_geo_3',
    categoryId: 'geo',
    text: 'Which river is the longest in the world?',
    options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
    correctIndex: 1,
  },
  {
    id: 'q_geo_4',
    categoryId: 'geo',
    text: 'Mount Everest is located in which mountain range?',
    options: ['Andes', 'Rockies', 'Alps', 'Himalayas'],
    correctIndex: 3,
  },
  {
    id: 'q_geo_5',
    categoryId: 'geo',
    text: 'What is the smallest country in the world?',
    options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correctIndex: 1,
  },
  {
    id: 'q_geo_6',
    categoryId: 'geo',
    text: 'Which country has the most islands?',
    options: ['Philippines', 'Indonesia', 'Sweden', 'Canada'],
    correctIndex: 2,
  },
  {
    id: 'q_geo_7',
    categoryId: 'geo',
    text: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctIndex: 2,
  },
  {
    id: 'q_geo_8',
    categoryId: 'geo',
    text: 'Which desert is the largest in the world?',
    options: ['Sahara', 'Arabian', 'Gobi', 'Antarctic'],
    correctIndex: 3,
  },
  // --- ARTS & LIT ---
  {
    id: 'q_arts_1',
    categoryId: 'arts',
    text: 'Who painted the Mona Lisa?',
    options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'],
    correctIndex: 2,
  },
  {
    id: 'q_arts_2',
    categoryId: 'arts',
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctIndex: 1,
  },
  {
    id: 'q_arts_3',
    categoryId: 'arts',
    text: 'Which painting style is Salvador Dali known for?',
    options: ['Impressionism', 'Cubism', 'Surrealism', 'Realism'],
    correctIndex: 2,
  },
  {
    id: 'q_arts_4',
    categoryId: 'arts',
    text: 'Who wrote "1984"?',
    options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'J.R.R. Tolkien'],
    correctIndex: 0,
  },
  {
    id: 'q_arts_5',
    categoryId: 'arts',
    text: 'The "Starry Night" was painted by whom?',
    options: ['Vincent van Gogh', 'Claude Monet', 'Edvard Munch', 'Gustav Klimt'],
    correctIndex: 0,
  },
  {
    id: 'q_arts_6',
    categoryId: 'arts',
    text: 'What is the Japanese art of paper folding called?',
    options: ['Ikebana', 'Origami', 'Kirigami', 'Ukiyo-e'],
    correctIndex: 1,
  },
  // --- MOVIES ---
  {
    id: 'q_mov_1',
    categoryId: 'movies',
    text: 'Which movie features the character "Darth Vader"?',
    options: ['Star Trek', 'Star Wars', 'Battlestar Galactica', 'Dune'],
    correctIndex: 1,
  },
  {
    id: 'q_mov_2',
    categoryId: 'movies',
    text: 'Who directed "Jurassic Park"?',
    options: ['James Cameron', 'George Lucas', 'Steven Spielberg', 'Christopher Nolan'],
    correctIndex: 2,
  },
  {
    id: 'q_mov_3',
    categoryId: 'movies',
    text: 'Which movie won the first Oscar for Best Picture?',
    options: ['Wings', 'Sunrise', 'Metropolis', 'The Jazz Singer'],
    correctIndex: 0,
  },
  {
    id: 'q_mov_4',
    categoryId: 'movies',
    text: 'What is the name of the hobbit played by Elijah Wood?',
    options: ['Samwise Gamgee', 'Bilbo Baggins', 'Frodo Baggins', 'Peregrin Took'],
    correctIndex: 2,
  },
  {
    id: 'q_mov_5',
    categoryId: 'movies',
    text: 'In "The Matrix", which pill does Neo take?',
    options: ['Blue', 'Red', 'Green', 'Yellow'],
    correctIndex: 1,
  },
  {
    id: 'q_mov_6',
    categoryId: 'movies',
    text: 'Which animated film features a robot named WALL-E?',
    options: ['Up', 'Cars', 'WALL-E', 'Toy Story'],
    correctIndex: 2,
  },
  // --- FLAGS ---
  {
    id: 'q_flag_1',
    categoryId: 'flags',
    text: 'Which country does this flag belong to?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/jp.png' }, // Japan
    options: ['China', 'South Korea', 'Japan', 'Vietnam'],
    correctIndex: 2,
  },
  {
    id: 'q_flag_2',
    categoryId: 'flags',
    text: 'Identify this flag:',
    media: { type: 'image', content: 'https://flagcdn.com/w320/br.png' }, // Brazil
    options: ['Argentina', 'Brazil', 'Colombia', 'Portugal'],
    correctIndex: 1,
  },
  {
    id: 'q_flag_3',
    categoryId: 'flags',
    text: 'Which nation flies this flag?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/ca.png' }, // Canada
    options: ['USA', 'UK', 'Australia', 'Canada'],
    correctIndex: 3,
  },
  {
    id: 'q_flag_4',
    categoryId: 'flags',
    text: 'This flag belongs to which European country?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/fr.png' }, // France
    options: ['France', 'Germany', 'Belgium', 'Netherlands'],
    correctIndex: 0,
  },
  {
    id: 'q_flag_5',
    categoryId: 'flags',
    text: 'Which country is represented by this flag?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/in.png' }, // India
    options: ['India', 'Ireland', 'Italy', 'Iran'],
    correctIndex: 0,
  },
  {
    id: 'q_flag_6',
    categoryId: 'flags',
    text: 'Identify this flag:',
    media: { type: 'image', content: 'https://flagcdn.com/w320/de.png' }, // Germany
    options: ['Belgium', 'Germany', 'Netherlands', 'Austria'],
    correctIndex: 1,
  },
  {
    id: 'q_flag_7',
    categoryId: 'flags',
    text: 'Which country does this flag belong to?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/kr.png' }, // South Korea
    options: ['Japan', 'North Korea', 'South Korea', 'China'],
    correctIndex: 2,
  },
  {
    id: 'q_flag_8',
    categoryId: 'flags',
    text: 'This flag represents which nation?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/mx.png' }, // Mexico
    options: ['Italy', 'Mexico', 'Spain', 'Peru'],
    correctIndex: 1,
  },
  {
    id: 'q_flag_9',
    categoryId: 'flags',
    text: 'Identify this flag:',
    media: { type: 'image', content: 'https://flagcdn.com/w320/au.png' }, // Australia
    options: ['New Zealand', 'Australia', 'UK', 'Fiji'],
    correctIndex: 1,
  },
  {
    id: 'q_flag_10',
    categoryId: 'flags',
    text: 'Which country flies this flag?',
    media: { type: 'image', content: 'https://flagcdn.com/w320/ch.png' }, // Switzerland
    options: ['Sweden', 'Switzerland', 'Denmark', 'Norway'],
    correctIndex: 1,
  },
];
export const MOCK_SHOP_ITEMS: ShopItem[] = [
  // Banners
  {
    id: 'bn_1',
    name: 'Aurora Borealis',
    type: 'banner',
    rarity: 'common',
    price: 100,
    assetUrl: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
    description: 'Shimmering lights of the north.'
  },
  {
    id: 'bn_2',
    name: 'Midnight City',
    type: 'banner',
    rarity: 'rare',
    price: 400,
    assetUrl: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
    description: 'The city never sleeps.'
  },
  {
    id: 'bn_3',
    name: 'Cosmic Void',
    type: 'banner',
    rarity: 'epic',
    price: 800,
    assetUrl: 'linear-gradient(to right, #434343 0%, black 100%)',
    description: 'Stare into the abyss.'
  },
  {
    id: 'bn_winter',
    name: 'Winter Night',
    type: 'banner',
    rarity: 'rare',
    price: 400,
    assetUrl: 'linear-gradient(to bottom, #0f2027, #203a43, #2c5364)', // Snowy night gradient
    description: 'A silent, snowy night.'
  },
  // Frames - Enhanced Visuals
  {
    id: 'fr_1',
    name: 'Bronze Border',
    type: 'frame',
    rarity: 'common',
    price: 50,
    assetUrl: 'border-4 border-amber-700 shadow-lg',
    description: 'Simple and sturdy.'
  },
  {
    id: 'fr_2',
    name: 'Silver Shine',
    type: 'frame',
    rarity: 'rare',
    price: 150,
    assetUrl: 'border-4 border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.5)]',
    description: 'Polished to perfection.'
  },
  {
    id: 'fr_3',
    name: 'Golden Glory',
    type: 'frame',
    rarity: 'epic',
    price: 300,
    assetUrl: 'border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] ring-2 ring-yellow-600 ring-offset-2 ring-offset-black',
    description: 'Fit for a champion.'
  },
  {
    id: 'fr_4',
    name: 'Neon Pulse',
    type: 'frame',
    rarity: 'legendary',
    price: 700,
    assetUrl: 'border-4 border-indigo-500 shadow-[0_0_20px_#6366f1] animate-pulse',
    description: 'Alive with energy.'
  },
  {
    id: 'fr_holiday',
    name: 'Holiday Spirit',
    type: 'frame',
    rarity: 'rare',
    price: 300,
    assetUrl: 'border-4 border-red-500 ring-4 ring-green-500 ring-dashed',
    description: 'Wrapped in festive colors.'
  },
  // Titles
  {
    id: 'title_santa',
    name: 'Santa\'s Helper',
    type: 'title',
    rarity: 'epic',
    price: 500,
    assetUrl: '',
    description: 'Spread the joy.'
  },
  {
    id: 'title_legendary',
    name: 'Legend',
    type: 'title',
    rarity: 'legendary',
    price: 1000,
    assetUrl: '',
    description: 'For the truly elite.'
  },
  // Mystery Boxes
  {
    id: 'box_common',
    name: 'Standard Crate',
    type: 'box',
    rarity: 'common',
    price: 100,
    assetUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=box1',
    description: 'Contains a random Common or Rare item.'
  },
  {
    id: 'box_rare',
    name: 'Rare Chest',
    type: 'box',
    rarity: 'rare',
    price: 300,
    assetUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=box2',
    description: 'Guaranteed Rare item. Chance for Epic.'
  },
  {
    id: 'box_legendary',
    name: 'Legendary Vault',
    type: 'box',
    rarity: 'legendary',
    price: 700,
    assetUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=box3',
    description: 'High chance for Epic. Chance for Legendary.'
  },
  // Season Pass Exclusive Avatars
  {
    id: 'av_reindeer',
    name: 'Reindeer',
    type: 'avatar',
    rarity: 'rare',
    price: 500,
    assetUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Reindeer&top=winterHat2&clothing=collarAndSweater&clothingColor=red',
    description: 'Festive Reindeer avatar.'
  },
  {
    id: 'av_gingerbread',
    name: 'Gingerbread',
    type: 'avatar',
    rarity: 'epic',
    price: 800,
    assetUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ginger&skinColor=d08b5b&top=none&clothing=collarAndSweater&clothingColor=green',
    description: 'Sweet Gingerbread avatar.'
  },
  {
    id: 'av_snowman_scarf',
    name: 'Frosty',
    type: 'avatar',
    rarity: 'epic',
    price: 800,
    assetUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Snowman&skinColor=white&top=winterHat1&clothing=graphicShirt',
    description: 'Cool Frosty avatar.'
  },
  {
    id: 'av_santa',
    name: 'Santa Claus',
    type: 'avatar',
    rarity: 'legendary',
    price: 2000,
    assetUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Santa&top=winterHat3&facialHair=beardMajestic&hairColor=white&clothing=collarAndSweater&clothingColor=red',
    description: 'The one and only Santa Claus.'
  }
];