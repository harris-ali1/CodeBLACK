# FloodLine voice agent setup (ElevenLabs)

Do this once in the ElevenLabs dashboard, then paste the agent ID into `.env.local`.

## 1. Create the agent

ElevenLabs dashboard → **Agents** → **Create agent** → **Blank template**. Name it `FloodLine`.

## 2. Agent tab

**First message**

```
Hi, this is FloodLine. Ask me about flooding near you, or tell me your street.
```

**System prompt**

```
You are FloodLine, a calm, clear flood-safety voice assistant for Houston, Texas.

Speak in {{preferred_language}}. If the caller switches language, switch with them.

About this household: {{household_notes}}

How to help:
- Whenever the caller asks about flooding, water levels, a bayou, a street or a neighborhood, call get_flood_status with the place they mentioned (or no location for an overview). Never guess water levels; only use what the tool returns.
- After you talk about a specific gauge, call focus_gauge with its id so the map shows it.
- Keep answers short: two or three sentences, plain words, no jargon. Say feet as "feet".
- If a gauge is FLOODING near the caller: tell them to avoid driving through water ("turn around, don't drown"), move to higher ground, and call 911 if they are in danger.
- If the household notes mention someone elderly, without a car, with medical equipment or limited mobility, say what that means for them specifically and suggest leaving early.
- You are not an emergency service. For life-threatening situations always say to call 911.
```

**LLM:** pick a **Gemini** model from the dropdown (any Gemini Flash model is a good balance of speed and quality). This is what makes it count for the Gemini prize too.

**Language:** default English. Under **Additional languages**, add **Spanish**.

**Voice:** pick any calm, clear voice. Pick a multilingual one so Spanish sounds natural.

## 3. Tools (Agent tab → Tools → Add tool → **Client**)

**Tool 1**
- Name: `get_flood_status`
- Description: `Get current water levels and flood risk for Houston bayou gauges. Pass the street, bayou or neighborhood the caller mentioned, or leave empty for all gauges.`
- **Wait for response: ON**
- Parameter: `location`, type string, **not required**, description: `Street, bayou, or neighborhood the caller asked about.`

**Tool 2**
- Name: `focus_gauge`
- Description: `Zoom the on-screen map to a gauge after discussing it.`
- Wait for response: OFF
- Parameter: `gauge_id`, type string, **required**, description: `The gauge id returned by get_flood_status, e.g. 08075000.`

Tool names must match exactly; the app registers handlers with these names.

## 4. Dynamic variables

The prompt uses `{{preferred_language}}` and `{{household_notes}}`. The app sends both every time a call starts. If the dashboard asks for test values, use `English` and `none provided`.

## 5. Security tab

Leave **Enable authentication OFF** for the hackathon so the browser can connect with just the agent ID. (Never put an ElevenLabs API key in the frontend.)

## 6. Connect the app

Copy the agent ID (starts with `agent_`) from the agent's page and create `.env.local` in the project root:

```
VITE_ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxxxxx
```

Restart `npm run dev`, open `/map`, tap the mic.

## Test script for the demo

- "Is Brays Bayou flooding?" → agent calls the tool, answers, and the map flies to Brays Bayou.
- Switch to Español, then: "¿Hay inundaciones cerca de Buffalo Bayou?"