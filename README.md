# المعلم (Al Muallim) – AI tutor for kids on Echo Show 8

A private Alexa skill. A child asks a question by voice in Arabic (Emirati or
Fusha) or English; Al Muallim answers aloud in simple language and shows a matching
lesson card on the screen at the same moment. Answers come from Claude.

## What a child can say

| Arabic | English | What happens |
|---|---|---|
| أليكسا، افتح المعلم | Alexa, open al muallim | Starts Al Muallim |
| ليش / شو / كيف / متى / وين / منو / كم / هل … | why / what / how / when / where / who / how many / is … | Spoken answer + lesson card |
| اشرح لي … ، علمني … ، خبرني عن … | explain … , tell me about … , teach me … | Same |
| احسب … ، حل … ، ترجم … | calculate … , solve … , translate … | Maths steps / translation |
| ما فهمت · زيدني · عطني مثال | I don't understand · tell me more · give me an example | Simpler / deeper / another example |
| اختبرني · اختبرني في العلوم | quiz me · quiz me on science | 3-option question; answer by voice or touch; earns ⭐ |
| أنا في الصف الخامس | I am in grade five | Adjusts difficulty for this session |
| تكلم بالفصحى · تكلم إماراتي | speak formal · speak emirati | Switches Arabic style |
| عيد · مساعدة · خلاص | repeat · help · stop | |

In Emirati mode Al Muallim *speaks* Emirati and *writes* the screen text in simple
Standard Arabic, so the screen matches what children read at school.

## Setup (about 20 minutes, no AWS account needed)

You need: the Amazon account your Echo Show is registered to, and an
Anthropic API key (console.anthropic.com).

1. Go to developer.amazon.com/alexa/console/ask and sign in with **the same
   Amazon account as the Echo Show**.
2. **Create Skill** → name `Al Muallim` → primary locale **Arabic (SA)** →
   *Other* → *Custom* → **Alexa-hosted (Node.js)** → *Start from Scratch*.
3. **Build → Interfaces** → switch on **Alexa Presentation Language** → Save.
4. **Build → Interaction Model → JSON Editor** → paste the contents of
   `skill-package/interactionModels/custom/ar-SA.json` → Save → **Build Model**.
5. Language menu (top left) → **Language settings** → add the English your
   device uses (check Alexa app → Devices → your Echo → Language). Switch to
   it, paste the matching `en-XX.json` (all English files are identical) →
   Save → Build Model.
6. **Code** tab → replace `index.js` and `package.json` with the ones in
   `lambda/`, and create `config.js`, `strings.js`, `tutor.js`, `screen.js`
   beside them with the contents from `lambda/`.
7. In `config.js`, paste your Anthropic API key. → **Deploy**.
8. **Test** tab → set testing to **Development**. Type or say
   `افتح المعلم`, then `ليش السما زرقا`.
9. On the Echo Show: "أليكسا، افتح المعلم الذكي" (device in Arabic) or
   "Alexa, open al muallim" (device in English).

The skill stays in development mode: it works on devices registered to your
account and is never published to the store.

## The children

When it opens, المعلم asks "منو معاي اليوم؟" and shows each child's name as a
button. A child answers "أنا مهرة" (or touches their name), or puts the name
in the first question: "أنا دانة، ليش السما زرقا؟". المعلم then uses that
child's name, gender and level, follows that level's curriculum outline
(`lambda/curriculum.js`, UAE Ministry of Education), and counts that child's
stars. A sibling takes over by saying "أنا سيف". Names, grades and genders
are in `children` in `lambda/config.js`; after changing names, run
`node tools/build-models.js` and paste the new model JSON in the console.

## The API key

The key lives in its own file, `lambda/apikey.js` (create it in the console's
Code tab), containing one line:

    module.exports = 'sk-ant-...';

Keeping it separate means updating the other files never wipes the key. The
file is excluded from GitHub.

## Customising (all in `lambda/config.js`)

- `assistantName` – the tutor's name. (To change the phrase that opens the
  skill, edit `invocationName` in the model JSON files.)
- `defaultGrade` – level assumed until a child says their grade.
- `defaultArabicStyle` – `emirati` or `fusha`.
- `avoidTopics`, `parentNotes` – your own rules and guidance, in plain words.
- `model` – faster/cheaper vs. more capable Claude model.
- Fixed phrases (welcome, praise, goodbye) are in `lambda/strings.js`.
- Tutor personality and safety rules are in `systemPrompt()` in `lambda/tutor.js`.

## Things to know

- **Questions must start with a question word** (ليش، شو، كيف، اشرح لي… /
  why, what, how, explain…). This is an Alexa rule for custom skills; Al Muallim
  reminds the child if it hears something else.
- **The device answers in the language it is set to.** An Echo set to Arabic
  understands Arabic questions; set to English, English ones. If your Echo
  offers a combined Arabic/English mode, both work without switching.
- **Voice:** Alexa's own Arabic voice reads the Emirati wording, so the words
  are Emirati but the accent is Alexa's Gulf voice.
- **Alexa+:** skills like this run on the original Alexa. If a device is moved
  to Alexa+, it may stop opening classic skills.
- **Timing:** Alexa allows about 8 seconds per answer. Al Muallim says "let me
  think" immediately and apologises if the model is too slow.
- **Privacy:** only the text of the question goes to the Anthropic API; no
  names or recordings are stored by the skill. Memory lasts one session.
- **Supervision:** the tutor is instructed to stay child-safe and to send
  sensitive questions to parents, but no AI filter is perfect.

## Testing offline

    cd lambda && npm install && cd .. && node test/run.js

Runs simulated Arabic and English conversations (question, follow-up, quiz
by voice and by touch, timeout, stop) and checks the voice models.
To regenerate the models after editing phrases: `node tools/build-models.js`.

## About the name

The Arabic invocation is the single word **المعلم** ("أليكسا، افتح المعلم الذكي").
Alexa normally expects two-word invocation names. If the console shows an
invocation-name error when you build the Arabic model, change
`invocationName` in `ar-SA.json` to **المعلم الذكي** and build again. The
tutor still calls itself المعلم everywhere else. In English the skill opens
with "Alexa, open al muallim".
