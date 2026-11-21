// Builds the Echo Show screen (APL). One document, two modes: lesson card / quiz.
const C = { bg: '#0F1E36', card: '#1C3357', accent: '#FFD166', text: '#FFFFFF', soft: '#B9C7DD' };
const OPTION_COLORS = ['#2A9D8F', '#E76F51', '#5C7CFA'];

const document = {
  type: 'APL',
  version: '1.8',
  theme: 'dark',
  environment: { parameters: ['payload'], lang: '${payload.d.lang}', layoutDirection: '${payload.d.dir}' },
  mainTemplate: {
    parameters: ['payload'],
    items: [{
      type: 'Frame', width: '100vw', height: '100vh', backgroundColor: C.bg,
      item: {
        type: 'Container', width: '100%', height: '100%', direction: 'column',
        layoutDirection: '${payload.d.dir}', lang: '${payload.d.lang}',
        paddingLeft: '5vw', paddingRight: '5vw', paddingTop: '4vh', paddingBottom: '3vh',
        items: [
          { // header: tutor name + stars
            type: 'Container', direction: 'row', justifyContent: 'spaceBetween', alignItems: 'center',
            items: [
              { type: 'Text', text: '${payload.d.name}', color: C.accent, fontSize: '30dp', fontWeight: 'bold' },
              { type: 'Text', text: '${payload.d.stars}', color: C.accent, fontSize: '30dp' }
            ]
          },
          { // emoji + title
            type: 'Container', direction: 'row', alignItems: 'center', spacing: '2vh',
            items: [
              { type: 'Text', when: "${payload.d.emoji != ''}", text: '${payload.d.emoji}', fontSize: '72dp' },
              { type: 'Text', text: '${payload.d.title}', color: C.text, fontSize: '52dp', fontWeight: 'bold', shrink: 1, spacing: '24dp', maxLines: 2 }
            ]
          },
          { // body
            type: 'ScrollView', grow: 1, shrink: 1, spacing: '2vh', width: '100%',
            item: {
              type: 'Container', width: '100%',
              items: [
                { // lesson points
                  type: 'Container', when: "${payload.d.mode == 'lesson'}", width: '100%',
                  data: '${payload.d.points}',
                  items: [{
                    type: 'Frame', width: '100%', backgroundColor: C.card, borderRadius: '18dp', spacing: '14dp',
                    paddingLeft: '28dp', paddingRight: '28dp', paddingTop: '16dp', paddingBottom: '16dp',
                    item: { type: 'Text', text: '${data}', color: C.text, fontSize: '36dp' }
                  }]
                },
                { // quiz options (touchable)
                  type: 'Container', when: "${payload.d.mode == 'quiz'}", width: '100%',
                  data: '${payload.d.options}',
                  items: [{
                    type: 'TouchWrapper', width: '100%', spacing: '14dp',
                    onPress: [{ type: 'SendEvent', arguments: ['answer', '${ordinal}'] }],
                    item: {
                      type: 'Frame', width: '100%', backgroundColor: '${data.color}', borderRadius: '18dp',
                      paddingLeft: '28dp', paddingRight: '28dp', paddingTop: '18dp', paddingBottom: '18dp',
                      item: { type: 'Text', text: '${ordinal}.  ${data.text}', color: C.text, fontSize: '38dp', fontWeight: 'bold' }
                    }
                  }]
                }
              ]
            }
          },
          { type: 'Text', text: '${payload.d.hint}', color: C.soft, fontSize: '28dp', spacing: '1vh', maxLines: 2 }
        ]
      }
    }]
  }
};

function directive(d) {
  return { type: 'Alexa.Presentation.APL.RenderDocument', token: 'muallim', document, datasources: { d } };
}
function base(lang, name, stars) {
  return {
    lang: lang === 'ar' ? 'ar-SA' : 'en-US',
    dir: lang === 'ar' ? 'RTL' : 'LTR',
    name, stars: stars > 0 ? `⭐ ${stars}` : ''
  };
}
function lesson({ lang, name, stars, title, emoji, points, hint }) {
  return directive(Object.assign(base(lang, name, stars), {
    mode: 'lesson', title: title || '', emoji: emoji || '', points: points || [], options: [], hint: hint || ''
  }));
}
function quiz({ lang, name, stars, question, emoji, options, hint }) {
  return directive(Object.assign(base(lang, name, stars), {
    mode: 'quiz', title: question || '', emoji: emoji || '', points: [],
    options: options.map((text, i) => ({ text, color: OPTION_COLORS[i % 3] })), hint: hint || ''
  }));
}
module.exports = { lesson, quiz, document };
