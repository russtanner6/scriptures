# Parent Mode Narration Guide

## Purpose
Parent Mode provides a beautifully narrated retelling of each scripture chapter, written for parents reading to children ages 8-12 (or for anyone who wants an accessible, story-driven experience). It is NOT a replacement for scripture — it is a companion that makes the stories come alive.

## Writing Style Prompt

Use the following style prompt for every chapter narration:

> Write a narrated retelling of this scripture chapter in a style that blends **C.S. Lewis's reverent wonder** (warm, awe-filled, never talks down to the reader) with **Rick Riordan's pacing and relatability** (action feels immediate, ancient people feel like real humans). The tone should feel like a wise, warm storyteller sitting by a fire — someone who loves these stories and wants the listener to love them too.
>
> **Voice:** Third-person past tense. Warm but not saccharine. Use vivid sensory details — what would it look, sound, smell, feel like? Let the reader *be there*. Occasional direct address to the reader is fine ("Imagine standing in that desert...") but use sparingly.
>
> **Audience:** 8-12 year olds being read to by a parent, though adults should enjoy it on its own.
>
> **Vocabulary:** Rich but accessible. Don't dumb it down — kids rise to good writing. Explain unfamiliar concepts naturally within the narrative rather than breaking the fourth wall. For example, don't say "An altar is a place where people pray" — instead say "He stacked rough stones into an altar and knelt beside it."

## Parameters for Every Narration

### Accuracy
- **Stay true to the source text.** Every event, character, and teaching in the chapter must be represented. Do not invent events, dialogue, or doctrine that isn't in the text.
- **Do not add theology.** If the text says Lehi saw a vision, describe the vision. Don't add interpretive commentary about what it means doctrinally unless the text itself provides that interpretation.
- **Preserve the emotional truth.** If the text says someone "did quake and tremble exceedingly," the narration should convey that awe and fear, not flatten it.

### Continuity
- **Know what came before.** Don't re-explain context that was covered in previous chapters. If Lehi's family left Jerusalem in chapter 2, chapter 3's narration can reference "the family's camp in the valley" without re-telling the departure.
- **Know what's coming.** Don't spoil future events, but you may plant seeds. For example, in 1 Nephi 1, you might describe Laman and Lemuel's initial reluctance without revealing the full extent of their later rebellion.
- **Maintain character consistency.** If Nephi is established as brave and faithful in chapter 1, he should feel like the same person in chapter 2. Characters should develop naturally as the text develops them.

### Length
- **As long as it needs to be, no longer.** A simple chapter (Jarom 1) might be 200-300 words. An epic chapter (Alma 56, the stripling warriors) might be 800-1200 words. Most chapters will be 400-700 words.
- **Never cut the story short** just to hit a target. The narration should feel complete — a parent should be able to close the chapter and the child should feel satisfied, not like something was skipped.
- **Never pad the story** with filler. Every sentence should earn its place.

### Tone Calibration
- **Battle/war chapters:** Exciting and vivid but not graphic. Focus on courage, strategy, and faith rather than gore. Think Lord of the Rings movie (PG-13 action) not Game of Thrones.
- **Doctrinal/sermon chapters:** Find the story within the sermon. Who is speaking? Why? What's at stake? Even Alma's discourse on faith (Alma 32) has narrative tension — he's speaking to people who were cast out of their churches.
- **Vision/revelation chapters:** This is where the Lewis-style wonder shines. Make the supernatural feel breathtaking, not clinical.
- **Genealogy/historical chapters:** Find the human interest. Brief is fine. Not every chapter will make a great bedtime story, but every chapter can be made engaging.

### What NOT to Do
- Don't use modern slang or anachronisms ("Nephi was like, totally brave")
- Don't make it preachy or add "the moral of the story is..."
- Don't add dialogue that isn't in or clearly implied by the text
- Don't use exclamation points excessively
- Don't break the narrative to explain LDS-specific concepts (integrate naturally)
- Don't make villains cartoonish — Laman and Lemuel should feel like real, frustrated people, not Saturday morning cartoon antagonists

## Image Prompts

### Style Direction
Each chapter gets **2+ Midjourney prompts** that will be used to generate rotating illustrations.

Art style: **Epic realism with a painterly warmth** — inspired by the emotional impact of Arnold Friberg's Book of Mormon paintings but with a more contemporary, cinematic quality. Think:
- Dramatic lighting (golden hour, firelight, divine radiance)
- Rich, warm color palette (amber, deep blue, gold, earth tones)
- Sense of scale and grandeur — landscapes feel vast, divine moments feel overwhelming
- Characters look like real Middle Eastern / Mesoamerican people (not European)
- Historically appropriate clothing and settings
- NOT cartoonish, NOT anime, NOT photorealistic — painterly and slightly stylized

### Midjourney Prompt Template
```
[Scene description], [character details], [lighting/mood], [setting details], epic biblical illustration style, painterly realism, warm dramatic lighting, rich color palette, sense of awe and grandeur, Arnold Friberg meets contemporary concept art --ar 16:9 --v 6.1 --style raw
```

### Image Placement Rules
- Minimum 2 images per chapter
- Place images at natural scene breaks in the narration
- Each image should depict a *moment* — not a concept. "Lehi kneeling before the pillar of fire" not "prayer."
- Images rotate on each page load (3-5 per placement slot), so prompts should depict the same scene from different angles, times of day, or compositional approaches.

## Entity Tags (People & Places)

The **first occurrence** of each person and place in a chapter's narration must include an inline entity tag. This enables the same clickable person/place linking used in the scripture reader (opening CharacterDetailPanel or LocationDetailPanel).

### Tag Syntax
- **People:** `{{person:character_id:Display Name}}`
- **Places:** `{{place:location_id:Display Name}}`

The `character_id` and `location_id` must match the `id` field in `data/characters.json` and `data/locations.json` respectively. The `Display Name` is what appears in the rendered text.

### Rules
- Tag only the **first occurrence** of each entity per chapter narration
- Subsequent mentions use plain text (no tag)
- If a person has multiple names/aliases, tag the first form used and don't re-tag aliases
- God the Father and Jesus Christ should be tagged on first mention; "the Lord" references need not be tagged if God/Christ was already tagged
- Places that don't exist in `locations.json` should not be tagged

### Example
```
In the ancient city of {{place:jerusalem:Jerusalem}}, there lived a man named {{person:lehi:Lehi}}.
He had four sons: {{person:laman:Laman}}, {{person:lemuel:Lemuel}}, {{person:sam:Sam}}, and {{person:nephi:Nephi}}.
```

## Data Format

Narrations are stored in `data/parent-mode.json`:
```json
[
  {
    "book": "1 Nephi",
    "chapter": 1,
    "narration": [
      { "type": "text", "content": "Paragraph with {{person:lehi:Lehi}} entity tags..." },
      { "type": "image", "alt": "Scene description", "prompts": ["midjourney prompt 1", "midjourney prompt 2", "midjourney prompt 3"] },
      { "type": "text", "content": "Next paragraph..." },
      { "type": "image", "alt": "Scene description", "prompts": ["midjourney prompt 1", "midjourney prompt 2"] },
      { "type": "text", "content": "Final paragraph..." }
    ]
  }
]
```

## Post-Narration Audit Checklist

After writing each chapter narration, verify:

- [ ] **Completeness:** Every significant event in the chapter is covered
- [ ] **Accuracy:** No invented events, dialogue, or doctrine
- [ ] **Continuity:** References to previous chapters are correct; no spoilers for future chapters
- [ ] **Tone:** Warm, vivid, age-appropriate; not preachy or dumbed down
- [ ] **Length:** Proportional to the chapter's content; doesn't feel rushed or padded
- [ ] **Characters:** Named correctly, roles consistent with the text
- [ ] **Image prompts:** Depict actual scenes from the narration; style-consistent
- [ ] **Standalone:** A parent could read just this chapter and it makes sense (with minimal prior context assumed)
