// ---------------------------------------------------------------
//  Al Muallim - settings a parent can change. Nothing else needs editing.
// ---------------------------------------------------------------
module.exports = {
  // Your Anthropic API key goes in its own file, lambda/apikey.js, so updating this
  // file never wipes it. That file contains one line:  module.exports = 'sk-ant-...';
  // (A key typed here still works as a fallback.)
  apiKey: process.env.ANTHROPIC_API_KEY || 'PASTE_YOUR_ANTHROPIC_API_KEY_HERE',

  // The children. Al Muallim asks "منو معاي اليوم؟" and teaches at that child's level.
  // grade: -2 = pre-KG, -1 = KG1, 0 = KG2, 1-12 = school grade.
  // After changing names here, rebuild the voice model (node tools/build-models.js) and paste it in.
  children: [
    { id: 'mayed',   ar: 'مايد',  en: 'Mayed',   gender: 'boy',  grade: 6 },
    { id: 'mahra',   ar: 'مهرة',  en: 'Mahra',   gender: 'girl', grade: 5 },
    { id: 'khalifa', ar: 'خليفة', en: 'Khalifa', gender: 'boy',  grade: 4 },
    { id: 'dana',    ar: 'دانة',  en: 'Dana',    gender: 'girl', grade: 1 },
    { id: 'mansour', ar: 'منصور', en: 'Mansour', gender: 'boy',  grade: 0 },
    { id: 'zayed',   ar: 'زايد',  en: 'Zayed',   gender: 'boy',  grade: -1 },
    { id: 'saif',    ar: 'سيف',   en: 'Saif',    gender: 'boy',  grade: -2 }
  ],

  // Fast model = short wait for the child. Alexa allows ~8 seconds in total.
  model: process.env.TUTOR_MODEL || 'claude-haiku-5-5',

  // The tutor's name, spoken and shown on screen.
  assistantName: { ar: 'المعلم', en: 'Al Muallim' },

  // Level used for a visitor who is not in the children list.
  defaultGrade: 3,

  // How Al Muallim SPEAKS Arabic by default: 'emirati' or 'fusha'.
  // (A child can switch by voice: "تكلم بالفصحى" / "تكلم إماراتي".)
  defaultArabicStyle: 'emirati',

  // Subjects or topics you want Al Muallim to politely decline (free text, optional).
  // Example: ['video games', 'social media']
  avoidTopics: [],

  // Extra guidance for the tutor, in your own words (optional).
  // Example: 'Follow the UAE Ministry of Education curriculum. Encourage reading.'
  parentNotes: 'The children attend schools following the UAE Ministry of Education curriculum.',

  showEmoji: true,        // big picture-emoji on the lesson card
  llmTimeoutMs: 6500,     // give up before Alexa's own 8 s limit
  maxTokens: 500,
  historyTurns: 3,        // how many previous questions Al Muallim remembers in a session

  // Experimental: pronounce English words inside Arabic answers with an English
  // voice. Leave false unless you have tested it on your device.
  englishVoiceInsideArabic: false
};
