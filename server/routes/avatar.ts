import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseServer } from '../lib/supabase.js';
import { logUsage } from '../utils/logUsage.js';

const router = Router();

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return key;
}

function cleanB64(imageBase64: string): string {
  return imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const HAIR_STYLES = [
  'short cropped jet-black hair',
  'medium-length spiky silver hair',
  'long flowing dark hair',
  'undercut with dark streaks and a side part',
  'short white hair swept back',
  'wavy dark brown hair falling to the shoulders',
  'buzzcut with faint dark stubble',
  'shoulder-length black hair with a subtle navy tint',
];

const OUTFIT_VARIANTS = [
  'black tactical hunter armor with glowing blue circuit runes',
  'dark hooded combat cloak over reinforced hunter gear',
  'sleek midnight-blue form-fitting bodysuit with silver trim',
  'reinforced black leather hunter vest over a dark turtleneck',
  'tattered dark combat jacket with glowing purple sigil patches',
  'obsidian plate armor with thin blue-white mana engravings',
];

const LIGHTING_VARIANTS = [
  'dramatic blue dungeon gate glow rising from below',
  'ethereal purple mana-aura halo radiating from behind',
  'harsh cold-white mana crystal light raking from the side',
  'deep green dungeon fog backlit by distant blue portal light',
  'dual-source: blue floor glow plus red ember light from the side',
];

// ─── VALIDATE ─────────────────────────────────────────────────────────────────
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const ai = new GoogleGenerativeAI(getKey());

    const validationModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let text = '';

    for (const modelName of validationModels) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: mimeType as string, data: cleanB64(imageBase64) } },
              {
                text: `Analyze this image carefully and respond ONLY with a JSON object — no markdown, no explanation, just the raw JSON:

{"isRealHuman": true, "hasFace": true, "isAIGenerated": false, "isClear": true, "detectedGender": "MALE", "reason": "reason here"}

Rules — read each carefully:
- isRealHuman: true ONLY if this is a real photograph of a living HUMAN PERSON. Must be false for animals (dogs, cats, birds, etc.), objects, food, scenery, landscapes, vehicles, cartoon characters, drawings, anime art, illustrations, 3D renders, or any non-human subject.
- hasFace: true ONLY if a clearly visible HUMAN face (not animal, not cartoon) is present and usable.
- isAIGenerated: true if this is AI-generated art, illustration, drawing, cartoon, CGI, 3D render, or a heavily filtered/manipulated image.
- isClear: true if the human face is well-lit, forward-facing and usable.
- detectedGender: the apparent biological gender of the human subject — exactly "MALE", "FEMALE", or "UNKNOWN". Base this ONLY on the visual appearance of the person in the photo. If isRealHuman is false, use "UNKNOWN".
- reason: one sentence explanation.`
              }
            ]
          }]
        });
        text = result.response.text().trim();
        if (text) {
          logUsage({
            route: 'avatar/validate',
            model: modelName,
            inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
            success: true,
          });
          break;
        }
      } catch (err: any) {
        console.warn(`[Avatar validate] Model ${modelName} failed:`, err.message);
      }
    }

    if (!text) {
      return res.json({
        valid: false,
        hasFace: false,
        isAIGenerated: false,
        isClear: false,
        detectedGender: 'UNKNOWN',
        reason: 'Scan service temporarily unavailable — please retry in a moment.'
      });
    }

    // Strip markdown code fences if present
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({
        valid: false,
        hasFace: false,
        isAIGenerated: false,
        isClear: false,
        detectedGender: 'UNKNOWN',
        reason: 'Could not parse scan result — please retry.'
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const valid = Boolean(parsed.isRealHuman) && Boolean(parsed.hasFace) && !Boolean(parsed.isAIGenerated);
    const detectedGender: string = ['MALE', 'FEMALE'].includes(String(parsed.detectedGender).toUpperCase())
      ? String(parsed.detectedGender).toUpperCase()
      : 'UNKNOWN';

    return res.json({
      valid,
      hasFace: Boolean(parsed.hasFace),
      isAIGenerated: Boolean(parsed.isAIGenerated),
      isClear: Boolean(parsed.isClear),
      detectedGender,
      reason: parsed.reason || ''
    });
  } catch (err: any) {
    console.error('[Avatar validate]', err.message);
    return res.json({
      valid: false,
      hasFace: false,
      isAIGenerated: false,
      isClear: false,
      detectedGender: 'UNKNOWN',
      reason: 'Scan service error — please retry.'
    });
  }
});

// ─── GENERATE ─────────────────────────────────────────────────────────────────
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', gender, detectedGender } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const ai = new GoogleGenerativeAI(getKey());
    const b64 = cleanB64(imageBase64);

    // Prefer the gender detected from the photo itself; fall back to profile gender
    const effectiveGender = (
      detectedGender && ['MALE', 'FEMALE'].includes(String(detectedGender).toUpperCase())
        ? String(detectedGender).toUpperCase()
        : typeof gender === 'string' && ['MALE', 'FEMALE'].includes(gender.toUpperCase())
          ? gender.toUpperCase()
          : 'MALE'
    ) as 'MALE' | 'FEMALE';

    const isFemale = effectiveGender === 'FEMALE';
    const genderLabel = isFemale ? 'female' : 'male';

    const genderDirective = isFemale
      ? `GENDER — NON-NEGOTIABLE:
The uploaded photograph shows a FEMALE person. You MUST generate a FEMALE character.
Visual requirements: feminine facial bone structure, softer jaw, female eye shape, female body silhouette and proportions.
Hair MUST be feminine (long, medium, or a clearly feminine short cut — NOT a male buzz-cut or male-pattern style).
Do NOT generate a male face, male jaw, male hairstyle, or male body under any circumstances.
If you generate a male character instead of female you have failed this task.`
      : `GENDER — NON-NEGOTIABLE:
The uploaded photograph shows a MALE person. You MUST generate a MALE character.
Visual requirements: defined masculine jaw, masculine brow, male facial bone structure, male body proportions and silhouette.
Do NOT generate a female face, female hair, or female body under any circumstances.
If you generate a female character instead of male you have failed this task.`;

    // Random style variants for uniqueness
    const hairStyle   = pick(isFemale
      ? ['long flowing dark hair', 'shoulder-length silver hair with a slight wave', 'short sleek black hair with side bangs', 'braided dark hair with loose strands', 'wavy dark-brown hair past the shoulders', 'straight black hair with a center part']
      : HAIR_STYLES
    );
    const outfit      = pick(OUTFIT_VARIANTS);
    const lighting    = pick(LIGHTING_VARIANTS);

    const prompt = `Transform this ${genderLabel} person's photo into a hyperrealistic Solo Leveling manhwa-style hunter portrait.

${genderDirective}

STYLE: Dark fantasy RPG character art. Ultra-detailed manhwa illustration. The aesthetic of Solo Leveling — sharp confident linework, cinematic lighting, black/blue/silver color palette, glowing dark-blue or purple mana aura.

FACE TRANSFORMATION: Stylize facial features into the manhwa art style — larger expressive eyes with a glowing blue iris, sleeker defined features. The result MUST NOT be recognizable as the original person. Transform into a ${genderLabel} manhwa face archetype appropriate to the gender above.

UNIQUE LOOK FOR THIS HUNTER:
- Hair: ${hairStyle}
- Outfit: ${outfit}
- Lighting: ${lighting}

COMPOSITION: Upper-body portrait, dark background with subtle magic particle effects and dungeon gate light. Dramatic cinematic framing. The hunter looks directly at the viewer — powerful, cold, focused.

OUTPUT: High-quality portrait artwork in manhwa illustration style. The character is ${genderLabel}. They should look S-rank worthy — the most powerful hunter in the world.`;

    const imageModels = [
      'gemini-2.0-flash-exp-image-generation',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.0-flash-exp',
    ];

    for (const modelName of imageModels) {
      try {
        const model = ai.getGenerativeModel({
          model: modelName,
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] as any }
        });

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: mimeType as string, data: b64 } },
              { text: prompt }
            ]
          }]
        });

        const parts = result.response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if ((part as any).inlineData?.data) {
            console.log(`[Avatar] Generated with ${modelName} | gender=${effectiveGender} | hair=${hairStyle}`);
            logUsage({ route: 'avatar/generate', model: modelName, isImageGeneration: true, success: true });
            return res.json({ avatarBase64: `data:image/png;base64,${(part as any).inlineData.data}` });
          }
        }
        console.warn(`[Avatar] ${modelName} returned no image parts`);
      } catch (err: any) {
        console.warn(`[Avatar] ${modelName} failed:`, err.message?.slice(0, 120));
      }
    }

    console.warn('[Avatar] All generation models failed — using original');
    return res.json({ error: 'USE_ORIGINAL' });
  } catch (err: any) {
    console.error('[Avatar generate]', err.message);
    return res.json({ error: 'USE_ORIGINAL' });
  }
});

// ─── SAVE ─────────────────────────────────────────────────────────────────────
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { playerId, avatarUrl, originalSelfieUrl } = req.body;
    if (!playerId || !avatarUrl) {
      return res.status(400).json({ error: 'playerId and avatarUrl are required' });
    }

    await (supabaseServer() as any)
      .from('players')
      .update({ avatar_url: avatarUrl, original_selfie_url: originalSelfieUrl || null, updated_at: new Date().toISOString() })
      .eq('supabase_id', playerId);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Avatar save]', err.message);
    return res.status(500).json({ error: err.message || 'Save failed' });
  }
});

export default router;
