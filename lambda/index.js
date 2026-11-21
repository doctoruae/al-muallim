// Al Muallim - Alexa skill handlers (voice + Echo Show screen).
const Alexa = require('ask-sdk-core');
const cfg = require('./config');
const tutor = require('./tutor');
const screen = require('./screen');
const { S, pick, fill } = require('./strings');

// Question intents -> tag telling the tutor which question word was cut off.
const QUESTION_INTENTS = {
  AskWhyIntent: 'why', AskWhatIntent: 'what / what is', AskHowIntent: 'how', AskWhenIntent: 'when',
  AskWhereIntent: 'where', AskWhoIntent: 'who', AskHowManyIntent: 'how many / how much',
  AskIsIntent: 'yes-or-no question', ExplainIntent: 'explain / tell me about',
  SolveIntent: 'solve / calculate', TranslateIntent: 'translate between Arabic and English'
};
const FOLLOWUPS = {
  SimplerIntent: '[follow-up] I did not understand. Explain your last answer again in a much simpler way, with a different, easier example.',
  MoreIntent: '[follow-up] Tell me a little more about that - one new interesting thing.',
  ExampleIntent: '[follow-up] Give me one more real-life example of that.'
};
const SUBJECTS = {
  math: 'maths', science: 'science', arabic: 'Arabic language', english: 'English language',
  space: 'space and planets', animals: 'animals', uae: 'the UAE (geography, history, heritage)', general: 'general knowledge'
};

// ---------- helpers -------------------------------------------------------
function ctx(handlerInput) {
  const locale = Alexa.getLocale(handlerInput.requestEnvelope) || 'en-US';
  const lang = locale.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  const am = handlerInput.attributesManager;
  const a = am.getSessionAttributes();
  if (!a.init) {
    Object.assign(a, { init: true, style: cfg.defaultArabicStyle, grade: cfg.defaultGrade, history: [], stars: 0 });
    am.setSessionAttributes(a);
  }
  const key = lang === 'en' ? 'en' : (a.style === 'fusha' ? 'ar_fusha' : 'ar_emirati');
  return { lang, a, t: S[key], name: lang === 'ar' ? cfg.assistantName.ar : cfg.assistantName.en };
}
const hasScreen = (hi) => !!Alexa.getSupportedInterfaces(hi.requestEnvelope)['Alexa.Presentation.APL'];
const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
// Remove anything a text-to-speech voice would stumble on.
const forVoice = (s) => String(s || '')
  .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ')
  .replace(/[*_#`~|]/g, ' ').replace(/\s+/g, ' ').trim();
function ssml(text, lang) {
  let out = escapeXml(forVoice(text));
  if (lang === 'ar' && cfg.englishVoiceInsideArabic) {
    out = out.replace(/[A-Za-z][A-Za-z' -]*[A-Za-z]/g, (m) => `<lang xml:lang="en-US">${m}</lang>`);
  }
  return out;
}
function slotId(hi, name) {
  const slot = Alexa.getSlot(hi.requestEnvelope, name);
  if (!slot) return null;
  const auth = slot.resolutions && slot.resolutions.resolutionsPerAuthority;
  if (auth) {
    for (const r of auth) {
      if (r.status && r.status.code === 'ER_SUCCESS_MATCH' && r.values && r.values[0]) return r.values[0].value.id;
    }
  }
  return null;
}
function reply(hi, c, { speech, reprompt, directive, end }) {
  const rb = hi.responseBuilder.speak(ssml(speech, c.lang));
  if (directive && hasScreen(hi)) rb.addDirective(directive);
  if (end) rb.withShouldEndSession(true);
  else rb.reprompt(ssml(reprompt || c.t.reprompt, c.lang));
  return rb.getResponse();
}
// Say "let me think" straight away while the tutor model is working.
async function thinking(hi, c) {
  try {
    const env = hi.requestEnvelope;
    if (!env.context || !env.context.System || !env.context.System.apiAccessToken) return;
    await hi.serviceClientFactory.getDirectiveServiceClient().enqueue({
      header: { requestId: env.request.requestId },
      directive: { type: 'VoicePlayer.Speak', speech: ssml(pick(c.t.thinking), c.lang) }
    });
  } catch (e) { /* optional nicety - ignore */ }
}
function remember(c, q, a) {
  c.a.history.push({ q: q.slice(0, 300), a: a.slice(0, 600) });
  while (c.a.history.length > cfg.historyTurns) c.a.history.shift();
}
function failSpeech(c, err) {
  console.log('Tutor error:', err && err.message);
  return err && err.code === 'TIMEOUT' ? c.t.slow : c.t.error;
}

async function teach(hi, c, userText) {
  if (!tutor.isConfigured()) return reply(hi, c, { speech: c.t.setup, end: true });
  const wait = thinking(hi, c);
  try {
    const [lesson] = await Promise.all([
      tutor.ask('lesson', { lang: c.lang, style: c.a.style, grade: c.a.grade, history: c.a.history }, userText), wait]);
    remember(c, userText, lesson.speech);
    c.a.last = lesson.speech;
    c.a.quiz = null;
    return reply(hi, c, {
      speech: lesson.speech,
      directive: screen.lesson({
        lang: c.lang, name: c.name, stars: c.a.stars, title: lesson.title,
        emoji: cfg.showEmoji ? lesson.emoji : '', points: lesson.points, hint: lesson.try_next
      })
    });
  } catch (err) {
    return reply(hi, c, { speech: failSpeech(c, err) });
  }
}

// ---------- handlers ------------------------------------------------------
const Launch = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'LaunchRequest',
  handle(hi) {
    const c = ctx(hi);
    if (!tutor.isConfigured()) return reply(hi, c, { speech: c.t.setup, end: true });
    return reply(hi, c, {
      speech: fill(c.t.welcome, { name: c.name }),
      directive: screen.lesson({
        lang: c.lang, name: c.name, stars: 0, title: c.t.welcomeTitle,
        emoji: cfg.showEmoji ? '🌟' : '', points: c.t.welcomePoints, hint: c.t.welcomeHint
      })
    });
  }
};

const Question = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && !!QUESTION_INTENTS[Alexa.getIntentName(hi.requestEnvelope)],
  handle(hi) {
    const c = ctx(hi);
    const heard = (Alexa.getSlotValue(hi.requestEnvelope, 'query') || '').trim();
    if (!heard) return reply(hi, c, { speech: c.t.fallback });
    return teach(hi, c, `[${QUESTION_INTENTS[Alexa.getIntentName(hi.requestEnvelope)]}] ${heard}`);
  }
};

const FollowUp = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && !!FOLLOWUPS[Alexa.getIntentName(hi.requestEnvelope)],
  handle(hi) {
    const c = ctx(hi);
    if (!c.a.history.length) return reply(hi, c, { speech: c.t.nothingYet });
    return teach(hi, c, FOLLOWUPS[Alexa.getIntentName(hi.requestEnvelope)]);
  }
};

const Quiz = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(hi.requestEnvelope) === 'QuizIntent',
  async handle(hi) {
    const c = ctx(hi);
    if (!tutor.isConfigured()) return reply(hi, c, { speech: c.t.setup, end: true });
    const subject = SUBJECTS[slotId(hi, 'subject')];
    const about = subject ? `about ${subject}`
      : (c.a.history.length ? 'about what we just talked about' : 'on any school subject');
    const prompt = `[quiz] Ask me one fun multiple-choice question ${about}, right for my level. Make it different from earlier ones.`;
    const wait = thinking(hi, c);
    try {
      const [q] = await Promise.all([
        tutor.ask('quiz', { lang: c.lang, style: c.a.style, grade: c.a.grade, history: c.a.history }, prompt), wait]);
      c.a.quiz = { options: q.options, correct: q.correct, why: q.why };
      c.a.last = q.speech;
      remember(c, prompt, `Quiz question asked: ${q.question}`);
      return reply(hi, c, {
        speech: q.speech, reprompt: q.speech,
        directive: screen.quiz({
          lang: c.lang, name: c.name, stars: c.a.stars, question: q.question,
          emoji: cfg.showEmoji ? q.emoji : '', options: q.options, hint: c.t.quizHint
        })
      });
    } catch (err) {
      return reply(hi, c, { speech: failSpeech(c, err) });
    }
  }
};

const Answer = {
  canHandle(hi) {
    const type = Alexa.getRequestType(hi.requestEnvelope);
    if (type === 'Alexa.Presentation.APL.UserEvent') {
      const args = hi.requestEnvelope.request.arguments || [];
      return args[0] === 'answer';
    }
    return type === 'IntentRequest' && Alexa.getIntentName(hi.requestEnvelope) === 'AnswerIntent';
  },
  handle(hi) {
    const c = ctx(hi);
    const isTouch = Alexa.getRequestType(hi.requestEnvelope) !== 'IntentRequest';
    const n = parseInt(isTouch ? hi.requestEnvelope.request.arguments[1] : slotId(hi, 'option'), 10);
    const quiz = c.a.quiz;
    if (!quiz) return reply(hi, c, { speech: c.t.noQuiz });
    if (!(n >= 1 && n <= 3)) return reply(hi, c, { speech: c.t.quizHint.split('—')[0], reprompt: c.a.last });
    const right = n === quiz.correct;
    if (right) c.a.stars += 1;
    c.a.quiz = null;
    const answer = quiz.options[quiz.correct - 1];
    const head = right ? pick(c.t.correct) : fill(c.t.wrong, { answer });
    const speech = `${head} ${quiz.why} ${c.t.quizAgain}`;
    c.a.last = speech;
    return reply(hi, c, {
      speech,
      directive: screen.lesson({
        lang: c.lang, name: c.name, stars: c.a.stars,
        title: right ? c.t.correctTitle : c.t.wrongTitle,
        emoji: cfg.showEmoji ? (right ? '🎉' : '💡') : '',
        points: [answer, quiz.why], hint: c.t.quizAgain
      })
    });
  }
};

const Dialect = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(hi.requestEnvelope) === 'DialectIntent',
  handle(hi) {
    let c = ctx(hi);
    const style = slotId(hi, 'style');
    if (style === 'fusha' || style === 'emirati') { c.a.style = style; c = ctx(hi); }
    return reply(hi, c, { speech: c.a.style === 'fusha' ? c.t.styleFusha : c.t.styleEmirati });
  }
};

const Grade = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(hi.requestEnvelope) === 'GradeIntent',
  handle(hi) {
    const c = ctx(hi);
    const g = parseInt(slotId(hi, 'grade'), 10);
    if (!(g >= 0 && g <= 12)) return reply(hi, c, { speech: c.t.fallback });
    c.a.grade = g;
    return reply(hi, c, { speech: g === 0 ? c.t.gradeKg : fill(c.t.grade, { grade: g }) });
  }
};

const Repeat = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(hi.requestEnvelope) === 'AMAZON.RepeatIntent',
  handle(hi) { const c = ctx(hi); return reply(hi, c, { speech: c.a.last || c.t.nothingYet }); }
};

const Help = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(hi.requestEnvelope) === 'AMAZON.HelpIntent',
  handle(hi) { const c = ctx(hi); return reply(hi, c, { speech: fill(c.t.help, { name: c.name }) }); }
};

const Stop = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'IntentRequest'
    && ['AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.NavigateHomeIntent'].includes(Alexa.getIntentName(hi.requestEnvelope)),
  handle(hi) {
    const c = ctx(hi);
    return reply(hi, c, { speech: c.a.stars > 0 ? fill(c.t.bye, { stars: c.a.stars }) : c.t.byeNoStars, end: true });
  }
};

const SessionEnded = {
  canHandle: (hi) => Alexa.getRequestType(hi.requestEnvelope) === 'SessionEndedRequest',
  handle: (hi) => hi.responseBuilder.getResponse()
};

// Anything else (FallbackIntent, stray touch events...) -> teach the child how to ask.
const Fallback = {
  canHandle: () => true,
  handle(hi) {
    if (Alexa.getRequestType(hi.requestEnvelope) !== 'IntentRequest') return hi.responseBuilder.getResponse();
    const c = ctx(hi);
    return reply(hi, c, { speech: c.t.fallback });
  }
};

const ErrorHandler = {
  canHandle: () => true,
  handle(hi, error) {
    console.log('Unhandled error:', error && error.stack);
    const c = ctx(hi);
    return reply(hi, c, { speech: c.t.error });
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(Launch, Question, FollowUp, Quiz, Answer, Dialect, Grade, Repeat, Help, Stop, SessionEnded, Fallback)
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
