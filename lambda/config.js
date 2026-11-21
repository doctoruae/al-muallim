// ---------------------------------------------------------------
//  Al Muallim - settings a parent can change. Nothing else needs editing.
// ---------------------------------------------------------------
module.exports = {
  // Your Anthropic API key (console.anthropic.com). Keep this file private.
  apiKey: process.env.ANTHROPIC_API_KEY || 'PASTE_YOUR_ANTHROPIC_API_KEY_HERE',

  // Fast model = short wait for the child. Alexa allows ~8 seconds in total.
  model: process.env.TUTOR_MODEL || 'claude-haiku-5-5',

  // The tutor's name, spoken and shown on screen.
  assistantName: { ar: 'المعلم', en: 'Al Muallim' },

  // School grade assumed until a child says "أنا في الصف ..." / "I am in grade ...".
  // 0 = kindergarten, 1-12 = grade.
  defaultGrade: 3,

  // How Al Muallim SPEAKS Arabic by default: 'emirati' or 'fusha'.
  // (A child can switch by voice: "تكلم بالفصحى" / "تكلم إماراتي".)
  defaultArabicStyle: 'emirati',

  // Subjects or topics you want Al Muallim to politely decline (free text, optional).
  // Example: ['video games', 'social media']
  avoidTopics: [],

  // Extra guidance for the tutor, in your own words (optional).
  // Example: 'Follow the UAE Ministry of Education curriculum. Encourage reading.'
  parentNotes: '',

  showEmoji: true,        // big picture-emoji on the lesson card
  llmTimeoutMs: 6500,     // give up before Alexa's own 8 s limit
  maxTokens: 500,
  historyTurns: 3,        // how many previous questions Al Muallim remembers in a session

  // Experimental: pronounce English words inside Arabic answers with an English
  // voice. Leave false unless you have tested it on your device.
  englishVoiceInsideArabic: false
};
