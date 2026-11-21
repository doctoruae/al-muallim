// Generates the voice models + manifest. Run: node tools/build-models.js
const fs = require('fs'); const path = require('path');
const out = path.join(__dirname, '..', 'skill-package');
const Q = (name, samples) => ({ name, slots: [{ name: 'query', type: 'AMAZON.SearchQuery' }], samples: samples.map((s) => `${s} {query}`) });
const vals = (obj) => Object.entries(obj).map(([id, [value, ...synonyms]]) => ({ id, name: { value, synonyms } }));
const builtins = ['AMAZON.HelpIntent', 'AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.NavigateHomeIntent', 'AMAZON.RepeatIntent', 'AMAZON.FallbackIntent']
  .map((name) => ({ name, samples: [] }));

const ar = {
  invocationName: 'المعلم الذكي',
  intents: [
    Q('AskWhyIntent', ['ليش', 'لماذا', 'ليه', 'شحقه']),
    Q('AskWhatIntent', ['شو', 'شنو', 'ايش', 'ما هو', 'ما هي', 'ماذا', 'شو يعني', 'ما معنى', 'شو هو', 'شو هي']),
    Q('AskHowIntent', ['كيف', 'شلون', 'كيف أقدر']),
    Q('AskWhenIntent', ['متى']),
    Q('AskWhereIntent', ['وين', 'أين', 'اين']),
    Q('AskWhoIntent', ['منو', 'من هو', 'من هي', 'من الذي']),
    Q('AskHowManyIntent', ['كم', 'جم']),
    Q('AskIsIntent', ['هل']),
    Q('ExplainIntent', ['اشرح لي', 'اشرح', 'علمني', 'خبرني عن', 'قول لي عن', 'كلمني عن', 'أبا أعرف عن', 'ابا اعرف', 'أبغي أعرف', 'أريد أن أعرف', 'عندي سؤال', 'ساعدني في']),
    Q('SolveIntent', ['احسب', 'حل', 'حل لي']),
    Q('TranslateIntent', ['ترجم', 'ترجم لي']),
    { name: 'QuizIntent', slots: [{ name: 'subject', type: 'SUBJECT' }], samples: ['اختبرني', 'اختبرني في {subject}', 'سو لي اختبار', 'سو لي اختبار في {subject}', 'أبا مسابقة', 'أبا مسابقة في {subject}', 'أريد مسابقة', 'سؤال مسابقة', 'سؤال ثاني', 'اسألني سؤال', 'اسألني عن {subject}'] },
    { name: 'AnswerIntent', slots: [{ name: 'option', type: 'OPTION' }], samples: ['{option}', 'الجواب {option}', 'الإجابة {option}', 'أختار {option}', 'رقم {option}', 'الخيار {option}'] },
    { name: 'SimplerIntent', slots: [], samples: ['ما فهمت', 'مب فاهم', 'مب فاهمة', 'لم أفهم', 'بسطها', 'اشرحها أسهل', 'عيدها بطريقة أسهل', 'صعبة علي'] },
    { name: 'MoreIntent', slots: [], samples: ['زيدني', 'خبرني أكثر', 'كمل', 'أبا أعرف أكثر', 'المزيد', 'وبعدين'] },
    { name: 'ExampleIntent', slots: [], samples: ['عطني مثال', 'أعطني مثالاً', 'مثال', 'مثال ثاني'] },
    { name: 'DialectIntent', slots: [{ name: 'style', type: 'STYLE' }], samples: ['تكلم {style}', 'رمس {style}', 'احكي {style}', 'غير اللهجة إلى {style}', 'أبا {style}'] },
    { name: 'GradeIntent', slots: [{ name: 'grade', type: 'GRADE' }], samples: ['أنا في الصف {grade}', 'أنا صف {grade}', 'صفي {grade}', 'أنا في {grade}', 'أدرس في الصف {grade}'] },
    ...builtins
  ],
  types: [
    { name: 'SUBJECT', values: vals({ math: ['الرياضيات', 'رياضيات', 'الحساب', 'الجمع', 'الضرب'], science: ['العلوم', 'علوم'], arabic: ['اللغة العربية', 'العربي', 'عربي'], english: ['اللغة الإنجليزية', 'الإنجليزي', 'انجليزي', 'الانجليزي'], space: ['الفضاء', 'الكواكب'], animals: ['الحيوانات', 'حيوانات'], uae: ['الإمارات', 'تاريخ الإمارات', 'الدراسات الاجتماعية'], general: ['معلومات عامة', 'أي شي'] }) },
    { name: 'OPTION', values: vals({ 1: ['الأول', 'الاول', 'واحد', 'الأولى', 'أول واحد'], 2: ['الثاني', 'اثنين', 'الثانية', 'ثاني واحد'], 3: ['الثالث', 'ثلاثة', 'الثالثة', 'ثالث واحد', 'الأخير'] }) },
    { name: 'STYLE', values: vals({ emirati: ['إماراتي', 'بالإماراتي', 'باللهجة الإماراتية', 'عامية', 'بالعامية'], fusha: ['فصحى', 'بالفصحى', 'باللغة الفصحى', 'بالعربية الفصحى'] }) },
    { name: 'GRADE', values: vals({ 0: ['الروضة', 'روضة', 'التمهيدي'], 1: ['الأول', 'الاول', 'أول', 'واحد'], 2: ['الثاني', 'ثاني', 'اثنين'], 3: ['الثالث', 'ثالث', 'ثلاثة'], 4: ['الرابع', 'رابع', 'أربعة'], 5: ['الخامس', 'خامس', 'خمسة'], 6: ['السادس', 'سادس', 'ستة'], 7: ['السابع', 'سابع', 'سبعة'], 8: ['الثامن', 'ثامن', 'ثمانية'], 9: ['التاسع', 'تاسع', 'تسعة'], 10: ['العاشر', 'عاشر', 'عشرة'], 11: ['الحادي عشر', 'أحد عشر'], 12: ['الثاني عشر', 'اثنا عشر'] }) }
  ]
};

const en = {
  invocationName: 'al muallim',
  intents: [
    Q('AskWhyIntent', ['why', 'why is', 'why do', 'why does', 'why are']),
    Q('AskWhatIntent', ['what', 'what is', 'what are', 'what does', 'what is a', 'what is the']),
    Q('AskHowIntent', ['how', 'how do', 'how does', 'how can i']),
    Q('AskWhenIntent', ['when', 'when did', 'when is']),
    Q('AskWhereIntent', ['where', 'where is', 'where do']),
    Q('AskWhoIntent', ['who', 'who is', 'who was']),
    Q('AskHowManyIntent', ['how many', 'how much', 'how big is', 'how far is', 'how old is']),
    Q('AskIsIntent', ['is', 'are', 'does', 'do', 'can']),
    Q('ExplainIntent', ['explain', 'explain to me', 'tell me about', 'teach me', 'teach me about', 'i have a question', 'i want to know', 'help me with']),
    Q('SolveIntent', ['calculate', 'solve', 'work out']),
    Q('TranslateIntent', ['translate']),
    { name: 'QuizIntent', slots: [{ name: 'subject', type: 'SUBJECT' }], samples: ['quiz me', 'quiz me on {subject}', 'quiz me about {subject}', 'give me a quiz', 'give me a {subject} quiz', 'test me', 'test me on {subject}', 'another question', 'ask me a question', 'ask me about {subject}'] },
    { name: 'AnswerIntent', slots: [{ name: 'option', type: 'OPTION' }], samples: ['{option}', 'the answer is {option}', 'answer {option}', 'i choose {option}', 'number {option}', 'option {option}', 'i think it is {option}'] },
    { name: 'SimplerIntent', slots: [], samples: ['i do not understand', 'i don\'t understand', 'i don\'t get it', 'make it simpler', 'say it in an easier way', 'that is too hard', 'explain it again'] },
    { name: 'MoreIntent', slots: [], samples: ['tell me more', 'more', 'go on', 'i want to know more', 'and then'] },
    { name: 'ExampleIntent', slots: [], samples: ['give me an example', 'an example', 'another example', 'show me an example'] },
    { name: 'DialectIntent', slots: [{ name: 'style', type: 'STYLE' }], samples: ['speak {style}', 'use {style} arabic', 'switch to {style}'] },
    { name: 'GradeIntent', slots: [{ name: 'grade', type: 'GRADE' }], samples: ['i am in grade {grade}', 'i\'m in grade {grade}', 'i am in year {grade}', 'i am in {grade} grade', 'i am in {grade}', 'my grade is {grade}'] },
    ...builtins
  ],
  types: [
    { name: 'SUBJECT', values: vals({ math: ['math', 'maths', 'mathematics', 'numbers', 'addition', 'multiplication'], science: ['science'], arabic: ['arabic'], english: ['english', 'spelling', 'grammar'], space: ['space', 'planets', 'the planets'], animals: ['animals'], uae: ['the u. a. e.', 'the emirates', 'social studies'], general: ['general knowledge', 'anything'] }) },
    { name: 'OPTION', values: vals({ 1: ['one', 'first', 'the first one', 'number one'], 2: ['two', 'second', 'the second one', 'number two'], 3: ['three', 'third', 'the third one', 'the last one'] }) },
    { name: 'STYLE', values: vals({ emirati: ['emirati', 'emirati dialect', 'local'], fusha: ['formal', 'formal arabic', 'standard', 'classical'] }) },
    { name: 'GRADE', values: vals({ 0: ['kindergarten', 'k. g.', 'nursery'], 1: ['one', 'first'], 2: ['two', 'second'], 3: ['three', 'third'], 4: ['four', 'fourth'], 5: ['five', 'fifth'], 6: ['six', 'sixth'], 7: ['seven', 'seventh'], 8: ['eight', 'eighth'], 9: ['nine', 'ninth'], 10: ['ten', 'tenth'], 11: ['eleven', 'eleventh'], 12: ['twelve', 'twelfth'] }) }
  ]
};

const wrap = (m) => ({ interactionModel: { languageModel: m } });
const EN_LOCALES = ['en-US', 'en-GB', 'en-IN', 'en-AU', 'en-CA'];
const dir = path.join(out, 'interactionModels', 'custom');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'ar-SA.json'), JSON.stringify(wrap(ar), null, 2));
for (const l of EN_LOCALES) fs.writeFileSync(path.join(dir, `${l}.json`), JSON.stringify(wrap(en), null, 2));

const locales = {
  'ar-SA': { name: 'المعلم', summary: 'معلم ذكي للأطفال بالعربية والإنجليزية', description: 'المعلم معلم ذكي يجيب عن أسئلة الأطفال بطريقة مبسطة، بالصوت وعلى الشاشة.', examplePhrases: ['أليكسا، افتح المعلم', 'ليش السما زرقا', 'اختبرني في العلوم'], keywords: ['تعليم', 'أطفال'] }
};
for (const l of EN_LOCALES) locales[l] = { name: 'Al Muallim', summary: 'A smart tutor for kids in Arabic and English', description: 'Al Muallim answers children\'s questions simply, by voice and on screen.', examplePhrases: ['Alexa, open al muallim', 'why is the sky blue', 'quiz me on science'], keywords: ['education', 'kids'] };
fs.writeFileSync(path.join(out, 'skill.json'), JSON.stringify({
  manifest: {
    manifestVersion: '1.0',
    publishingInformation: { locales, isAvailableWorldwide: false, distributionCountries: ['AE'], category: 'EDUCATION_AND_REFERENCE', testingInstructions: 'Private family skill; not for publication.' },
    apis: { custom: { interfaces: [{ type: 'ALEXA_PRESENTATION_APL' }] } },
    privacyAndCompliance: { allowsPurchases: false, usesPersonalInfo: false, isChildDirected: false, isExportCompliant: true, containsAds: false }
  }
}, null, 2));
console.log('models written');
