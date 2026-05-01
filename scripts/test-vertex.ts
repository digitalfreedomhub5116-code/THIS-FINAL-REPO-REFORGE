import 'dotenv/config';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN, isUsingVertexAI } from '../server/utils/geminiRetry.js';

async function test() {
  console.log('🔄 Testing Vertex AI connection...\n');
  
  try {
    const ai = getSharedAI();
    console.log(`Using Vertex AI: ${isUsingVertexAI()}\n`);
    
    const { result, modelName } = await generateWithFallback(
      ai,
      [...DEFAULT_MODEL_CHAIN],
      'Say "Vertex AI is working" and nothing else.'
    );
    
    const text = result.response.text();
    console.log(`✅ Model: ${modelName}`);
    console.log(`✅ Response: ${text}`);
    console.log(`✅ Usage: ${JSON.stringify(result.response.usageMetadata)}`);
    console.log('\n🎉 SUCCESS — Vertex AI is connected and using your free credits!');
  } catch (err: any) {
    console.error('❌ FAILED:', err?.message || err);
    console.error('\nFull error:', err);
  }
}

test();
