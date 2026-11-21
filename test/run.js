// Offline test: simulated Alexa requests + a fake tutor model. Run: node test/run.js
process.env.ANTHROPIC_API_KEY = 'test-key';
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const tutor = require('../lambda/tutor'); const { handler } = require('../lambda/index');
let lastBody = null; let mode = 'ok';
tutor.setTransport(async (body) => {
  lastBody = body;
  if (mode === 'timeout') { const e = new Error('timeout'); e.code = 'TIMEOUT'; throw e; }
  const quiz = body.tool_choice.name === 'show_quiz';
  return { content: [{ type: 'tool_use', name: body.tool_choice.name, input: quiz
    ? { speech: 'كم كوكب في المجموعة الشمسية؟ الأول سبعة، الثاني ثمانية، الثالث تسعة.', question: 'كم عدد كواكب المجموعة الشمسية؟', emoji: '🪐', options: ['7', '8', '9'], correct: 2, why: 'عندنا ثمانية كواكب تدور حول الشمس.' }
    : { speech: 'السما زرقا عشان ضو الشمس يتبعثر في الهوا 🌞 *وايد* & <b>', title: 'لماذا السماء زرقاء؟', emoji: '🌤️', points: ['ضوء الشمس فيه كل الألوان', 'الأزرق ينتشر أكثر', 'p3', 'p4'], try_next: 'لماذا الغروب أحمر؟' } }] };
});
let session = {};
const send = (locale, request, screen = true) => new Promise((res, rej) => handler({
  version: '1.0',
  session: { new: !Object.keys(session).length, sessionId: 's', application: { applicationId: 'a' }, attributes: session, user: { userId: 'u' } },
  context: { System: { application: { applicationId: 'a' }, user: { userId: 'u' }, device: { deviceId: 'd', supportedInterfaces: screen ? { 'Alexa.Presentation.APL': {} } : {} } } },
  request: Object.assign({ requestId: 'r', timestamp: new Date().toISOString(), locale }, request)
}, {}, (e, r) => { if (e) return rej(e); session = r.sessionAttributes || {}; res(r.response); }));
const intent = (name, slots = {}) => ({ type: 'IntentRequest', intent: { name, confirmationStatus: 'NONE', slots } });
const slot = (name, value, id) => ({ [name]: { name, value, resolutions: id === undefined ? undefined : { resolutionsPerAuthority: [{ status: { code: 'ER_SUCCESS_MATCH' }, values: [{ value: { name: value, id: String(id) } }] }] } } });
const apl = (r) => (r.directives || []).find((d) => d.type === 'Alexa.Presentation.APL.RenderDocument');

(async () => {
  // launch asks who is there; screen shows 7 name buttons
  let r = await send('ar-SA', { type: 'LaunchRequest' });
  assert(/منو معاي/.test(r.outputSpeech.ssml)); let d = apl(r).datasources.d;
  assert(d.dir === 'RTL' && d.mode === 'choices' && d.options.length === 7 && d.options[1].event === 'child' && d.options[1].label === 'مهرة');

  // question before name -> parked, name asked, then answered for Mahra (girl, grade 5)
  r = await send('ar-SA', intent('AskWhyIntent', slot('query', 'السما زرقا')));
  assert(/قبل/.test(r.outputSpeech.ssml) && lastBody === null, 'asks name first');
  r = await send('ar-SA', intent('NameIntent', slot('child', 'مهرة', 'mahra')));
  assert(lastBody.messages.at(-1).content === '[why] السما زرقا', 'parked question answered');
  assert(/مهرة, a girl in grade 5/.test(lastBody.system) && /feminine/.test(lastBody.system) && /Grade 5 \(age ~10\)/.test(lastBody.system) && /Emirati dialect/.test(lastBody.system));
  { const inner = r.outputSpeech.ssml.replace(/<\/?speak>/g, ''); assert(!/[🌞*<>]|&(?!amp;|lt;|gt;)/u.test(inner), 'speech sanitised: ' + inner); }
  d = apl(r).datasources.d; assert(d.mode === 'lesson' && d.points.length === 3 && d.name === 'المعلم · مهرة');

  r = await send('ar-SA', intent('SimplerIntent'));
  assert(lastBody.messages.length === 3 && /simpler/.test(lastBody.messages[2].content));

  // quiz: correct answer by touch earns Mahra a star, praise uses her name
  r = await send('ar-SA', intent('QuizIntent', slot('subject', 'الفضاء', 'space')));
  d = apl(r).datasources.d; assert(d.mode === 'choices' && d.options.length === 3 && d.options[0].event === 'answer' && /space/.test(lastBody.messages.at(-1).content));
  r = await send('ar-SA', { type: 'Alexa.Presentation.APL.UserEvent', token: 'muallim', arguments: ['answer', '2'] });
  assert(/مهرة/.test(r.outputSpeech.ssml) && apl(r).datasources.d.stars === '⭐ 1', 'star + name');

  // sibling takes over by touch -> new level, fresh memory, own stars
  r = await send('ar-SA', { type: 'Alexa.Presentation.APL.UserEvent', token: 'muallim', arguments: ['child', 'saif'] });
  assert(/هلا سيف/.test(r.outputSpeech.ssml) && apl(r).datasources.d.stars === '');
  await send('ar-SA', intent('ExplainIntent', slot('query', 'الألوان')));
  assert(/pre-KG/.test(lastBody.system) && /very young child/.test(lastBody.system) && lastBody.messages.length === 1);

  // name inside the question: "أنا دانة ليش ..."
  r = await send('ar-SA', intent('ChildAsk_dana', slot('query', 'ليش القمر يكبر')));
  assert(lastBody.messages.at(-1).content === '[question] ليش القمر يكبر' && /دانة, a girl in grade 1/.test(lastBody.system));

  // spoken grade adjusts current child's level; dialect switch
  await send('ar-SA', intent('GradeIntent', slot('grade', 'الثاني', 2)));
  await send('ar-SA', intent('DialectIntent', slot('style', 'بالفصحى', 'fusha')));
  await send('ar-SA', intent('AskHowIntent', slot('query', 'نجمع')));
  assert(/grade 2/.test(lastBody.system) && /Modern Standard Arabic/.test(lastBody.system));

  // unknown name, wrong answer path, timeout, fallback, stop with name
  r = await send('ar-SA', intent('NameIntent', slot('child', 'علي')));
  assert(/ما عرفت|لم أعرف/.test(r.outputSpeech.ssml));
  await send('ar-SA', intent('QuizIntent'));
  r = await send('ar-SA', intent('AnswerIntent', slot('option', 'الأول', 1)));
  assert(/8|ثمانية/.test(r.outputSpeech.ssml));
  mode = 'timeout'; r = await send('ar-SA', intent('AskHowIntent', slot('query', 'تطير الطيارة'))); mode = 'ok';
  assert(/عذراً/.test(r.outputSpeech.ssml) && r.shouldEndSession !== true);
  r = await send('ar-SA', intent('AMAZON.FallbackIntent')); assert(r.reprompt);

  // quiz requested before name -> name -> quiz
  session = {}; lastBody = null;
  await send('ar-SA', { type: 'LaunchRequest' });
  r = await send('ar-SA', intent('QuizIntent', slot('subject', 'الرياضيات', 'math')));
  assert(lastBody === null);
  r = await send('ar-SA', intent('NameIntent', slot('child', 'خليفة', 'khalifa')));
  assert(apl(r).datasources.d.mode === 'choices' && /maths/.test(lastBody.messages.at(-1).content) && /grade 4/.test(lastBody.system));
  r = await send('ar-SA', { type: 'Alexa.Presentation.APL.UserEvent', token: 'muallim', arguments: ['answer', '2'] });
r = await send('ar-SA', intent('AMAZON.StopIntent')); assert(r.shouldEndSession === true && /خليفة/.test(r.outputSpeech.ssml));

  // English, speaker without screen
  session = {}; lastBody = null;
  r = await send('en-GB', { type: 'LaunchRequest' }); assert(apl(r).datasources.d.dir === 'LTR' && /Who is with me/.test(r.outputSpeech.ssml));
  r = await send('en-GB', intent('ChildAsk_mayed', slot('query', 'what is a volcano')), false);
  assert(!apl(r) && /simple, friendly English/.test(lastBody.system) && /Mayed, a boy in grade 6/.test(lastBody.system));
  r = await send('en-GB', intent('MoreIntent')); assert(lastBody.messages.length === 3);

  // ---- voice-model checks ----
  const dir = path.join(__dirname, '..', 'skill-package', 'interactionModels', 'custom');
  for (const f of fs.readdirSync(dir)) {
    const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).interactionModel.languageModel;
    const types = new Set(m.types.map((t) => t.name)); const seen = new Map();
    assert(m.invocationName.trim().length > 0);
    for (const i of m.intents) {
      const slots = new Map((i.slots || []).map((s) => [s.name, s.type]));
      for (const t of slots.values()) assert(t.startsWith('AMAZON.') || types.has(t), `${f}: unknown type ${t}`);
      for (const s of i.samples) {
        assert(!seen.has(s), `${f}: duplicate utterance "${s}" in ${i.name} and ${seen.get(s)}`); seen.set(s, i.name);
        const used = [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
        used.forEach((u) => assert(slots.has(u), `${f}: slot ${u} undefined in ${i.name}`));
        if (used.includes('query')) assert(used.length === 1 && s.replace('{query}', '').trim().length > 0 && s.endsWith('{query}'), `${f}: bad SearchQuery utterance "${s}"`);
        assert(!/[?.,!؟،0-9]/.test(s), `${f}: punctuation/digits in "${s}"`);
      }
    }
    for (const t of m.types) { const v = new Set(); for (const x of t.values) for (const n of [x.name.value, ...x.name.synonyms]) { assert(!v.has(n), `${f}: duplicate value ${n} in ${t.name}`); v.add(n); } }
  }
  JSON.parse(fs.readFileSync(path.join(dir, '..', '..', 'skill.json'), 'utf8'));
  console.log('ALL TESTS PASSED');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
