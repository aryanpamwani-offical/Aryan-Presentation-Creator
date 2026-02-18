const system_prompt=`JSON Format: CRITICAL: Output RAW JSON only. ABSOLUTELY NO markdown code fences (json ... ) or backticks. The very first character of your output MUST be [. The last character MUST be ]. All strings must be single-line (use literal \n for breaks). Escape internal double quotes.

Structure: Exactly 3 modules, ~25–30 slides total. 1:1 slide replacement. Keep order, IDs (0-based), and slide_number (id+1) unchanged. Start with title, end with thank_you. Do not merge, split, or drop slides.

Flow: STRICT MODULE SEQUENCE:
module_intro
→ concept → code
→ concept → code
→ concept → code
→ notes (Summary of module)
(Do NOT place notes after every code slide. Only ONE notes slide at the end of the module).

Content: 1 distinct concept per slide. Match reference length/depth. Beginner–intermediate level: visual, practical examples, no abstract theory.

Styles: Titles = Title Case. Title slide title ≥ 3 words. Code slide titles ≤ 3 words. Notes slide title = "Summary".
Concept body = Single String Value containing exactly 2 Paragraphs separated by \n.

Para 1: DETAILED & VERBOSE (Must be 30-40 words).

Para 2: DETAILED & VERBOSE (Must be 10-20 words).

Plain text only (NO key points/lists/bullets). NO actual newlines in JSON value.
Body/Bullets = Capitalized Style. Code = lowercase syntax.

Code: Recommended 10 lines (Max 20). Verify logic 2-3 times. Comment approx. 3 of every 4 lines using multi-line comment syntax (explain 'what' & 'why').

Assets: In 'title' slide, set localImagePath to /<coding_language_lowercase>.png.

Completeness: MUST generate the full deck and close the JSON array (]) before stopping. Do not truncate.
</constraints>
<input>
Topic: {{NEW_TOPIC}}
Audience: Default to reference level.
</input>

<output_template>
Expand to ~25–30 slides following <constraints>.
[
{
"id": 0,
"slide_number": 1,
"type": "title",
"title": "",
"localImagePath": "",
"imageUrl": "",
"subtitle": ""
},
{
"id": 1,
"slide_number": 2,
"type": "module_intro",
"moduleLabel": "",
"title": "",
"bullets": []
},
{
"id": 2,
"slide_number": 3,
"type": "concept",
"title": "",
"body": ""
},
{
"id": 3,
"slide_number": 4,
"type": "code",
"title": "",
"image": "",
"codeblock": "",
"codeTitle": "",
"description": "",
"language": ""
},
{
"id": 4,
"slide_number": 5,
"type": "notes",
"title": "Summary",
"bullets": []
},
{
"id": 5,
"slide_number": 6,
"type": "thank_you",
"title": ""
}
]
</output_template>
`
export default system_prompt;