import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const alignmentSchema = {
  type: SchemaType.OBJECT,
  properties: {
    xPosition: {
      type: SchemaType.NUMBER,
      description: "Position on the x-axis from -10 (Builder) to +10 (Speculator). Negative values indicate Builder tendencies, positive values indicate Speculator tendencies.",
    },
    yPosition: {
      type: SchemaType.NUMBER,
      description: "Position on the y-axis from -10 (Decentralist) to +10 (Pragmatist). Negative values indicate Decentralist tendencies, positive values indicate Pragmatist tendencies.",
    },
    category: {
      type: SchemaType.STRING,
      description: "The quadrant category the user falls into based on their x and y positions",
      enum: [
        "Builder-Decentralist: The cypherpunk idealist building trustless systems",
        "Builder-Pragmatist: The practical developer creating useful applications",
        "Speculator-Decentralist: The principle-driven investor in decentralized projects",
        "Speculator-Pragmatist: The opportunistic trader focused on gains"
      ]
    },
    alignmentOverview: {
      type: SchemaType.STRING,
      description: "4-6 sentences describing the user's onchain alignment, starting with 'You are positioned at...' and explaining their placement on both axes",
      maxLength: 800,
    },
    supportingEvidence: {
      type: SchemaType.ARRAY,
      description: "Exactly 4 key behavioral patterns that indicate their alignment",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pattern: { 
            type: SchemaType.STRING,
            description: "Two-word name for this behavioral pattern (e.g. 'Protocol Focused' or 'Market Oriented')",
            maxLength: 30,
          },
          phrases: {
            type: SchemaType.ARRAY,
            description: "1-3 short phrases from their casts demonstrating this pattern",
            items: { 
              type: SchemaType.STRING,
              description: "A 2-3 word direct quote showing this pattern",
              maxLength: 30,
            },
            maxItems: 4,
            minItems: 1,
          },
          explanation: { 
            type: SchemaType.STRING,
            description: "One clear sentence explaining how these phrases reveal their onchain alignment",
            maxLength: 150,
          },
        },
      },
      maxItems: 6,
      minItems: 3,
    },
    quadrantAnalysis: {
      type: SchemaType.STRING,
      description: "Analysis of which quadrant they fall into (Builder-Pragmatist, Builder-Decentralist, Speculator-Pragmatist, or Speculator-Decentralist) and what that means",
      maxLength: 300,
    },
  },
  required: ["xPosition", "yPosition", "category", "alignmentOverview", "supportingEvidence", "quadrantAnalysis"],
};

export async function analyzeCryptoAlignment(bio, casts) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 3072,
      responseMimeType: "application/json",
      responseSchema: alignmentSchema,
    },
  });

  const prompt = `Analyze this Farcaster user's bio and casts to determine their position on the Onchain Alignment Chart. The chart has two axes:
  
X-AXIS: Builder (-10) to Speculator (+10)
- Builders (-10 to 0) focus on creating long-term value, infrastructure, and sustainable projects
- Speculators (0 to +10) focus on market opportunities, trading, and short-term gains
- IMPORTANT: Negative x values = Builder, Positive x values = Speculator

Y-AXIS: Decentralist (-10) to Pragmatist (+10)
- Decentralists (-10 to 0) prioritize censorship resistance, trustlessness, and community governance
- Pragmatists (0 to +10) prioritize usability, adoption, and are willing to compromise on decentralization
- IMPORTANT: Negative y values = Decentralist, Positive y values = Pragmatist

Based on these axes, there are four main categories:
1. Builder-Decentralist (negative x, negative y): The cypherpunk idealist building trustless systems
2. Builder-Pragmatist (negative x, positive y): The practical developer creating useful applications
3. Speculator-Decentralist (positive x, negative y): The principle-driven investor in decentralized projects
4. Speculator-Pragmatist (positive x, positive y): The opportunistic trader focused on gains

IMPORTANT: Make sure the x and y positions you assign are consistent with the category. For example, if you categorize someone as a Builder-Pragmatist, their x position must be negative (Builder) and their y position must be positive (Pragmatist).

IMPORTANT: For position scoring, use values between -9 and -5 for strong Builder/Decentralist tendencies, -4 to 0 for mild Builder/Decentralist tendencies, +1 to +4 for mild Speculator/Pragmatist tendencies, and +5 to +9 for strong Speculator/Pragmatist tendencies. Avoid using the exact extremes (-10 or +10). Try to be decisive in your scoring - if someone shows clear tendencies in one direction, place them closer to the -9 or +9 range rather than the middle.

IMPORTANT: Always use first-person language when addressing the user. Use "You are..." instead of "The user is..." or "They are...". Make it personal and direct as if you're speaking to them.

Bio: ${bio || 'No bio provided'}

Recent casts:
${casts.join('\n')}

IMPORTANT FORMATTING RULES:
1. Keep everything extremely concise and specific
2. Use exactly TWO words for pattern names (e.g. "Protocol Focused" or "Market Oriented")
3. Never repeat or concatenate similar words
4. Never use slashes or multiple descriptors
5. Stay under all length limits
6. Focus on behavioral patterns, not assumptions
7. Always use "You" instead of "The user" or "They" - speak directly to the person

Provide an alignment overview (max 800 characters) that:
1. Starts with "You are positioned at (x,y) on the onchain alignment chart..."
2. Explains their placement on both axes
3. Describes their overall onchain philosophy based on this position

Identify exactly 4 key behavioral patterns that indicate their alignment. For each pattern:
- Give it a clear TWO WORD name (e.g. "Protocol Focused" or "Market Oriented")
- List 1-3 very short direct quotes (2-3 words) from their casts
- Add one clear sentence explaining how these quotes reveal their onchain alignment

Provide a quadrant analysis (max 300 characters) that:
1. Identifies which quadrant they fall into based on their x,y coordinates
2. Explains what this quadrant position means for their onchain approach
3. Suggests how they might interact with people in other quadrants

Also select the appropriate category from the four options based on their position.

Keep everything extremely concise and specific. Focus on clear behavioral evidence. Always address the user directly with "you" language.`;

  const positionResult = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const positionResponse = positionResult.response;
  try {
    const parsedResponse = JSON.parse(positionResponse.text());
    
    // Validate that the x and y positions are consistent with the category
    const category = parsedResponse.category;
    const xPosition = parsedResponse.xPosition;
    const yPosition = parsedResponse.yPosition;
    
    // Check for inconsistencies and fix if needed
    if (category.startsWith('Builder') && xPosition > 0) {
      // If categorized as Builder but x is positive, flip the sign
      parsedResponse.xPosition = -Math.abs(xPosition);
    } else if (category.startsWith('Speculator') && xPosition < 0) {
      // If categorized as Speculator but x is negative, flip the sign
      parsedResponse.xPosition = Math.abs(xPosition);
    }
    
    if (category.includes('Decentralist') && yPosition > 0) {
      // If categorized as Decentralist but y is positive, flip the sign
      parsedResponse.yPosition = -Math.abs(yPosition);
    } else if (category.includes('Pragmatist') && yPosition < 0) {
      // If categorized as Pragmatist but y is negative, flip the sign
      parsedResponse.yPosition = Math.abs(yPosition);
    }
    
    // Amplify the positions to spread them out more on the grid
    // This will push values closer to the -9/+9 range while preserving their sign and relative magnitude
    const amplifyPosition = (pos) => {
      // Keep the sign, but amplify the magnitude
      const sign = Math.sign(pos);
      const magnitude = Math.abs(pos);
      
      // Apply a non-linear transformation to push values outward
      // This formula will push values closer to 9 while preserving their relative order
      let amplified = magnitude;
      
      // If the magnitude is greater than 3, amplify it more aggressively
      if (magnitude > 3) {
        amplified = Math.min(9, 5 + (magnitude - 3) * 1.3);
      } else if (magnitude > 0) {
        // For smaller values, still push them outward but less aggressively
        amplified = Math.max(3, magnitude * 1.5);
      }
      
      return sign * amplified;
    };
    
    // Apply the amplification to both x and y positions
    parsedResponse.xPosition = amplifyPosition(parsedResponse.xPosition);
    parsedResponse.yPosition = amplifyPosition(parsedResponse.yPosition);
    
    return parsedResponse;
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Failed to parse response:', positionResponse.text());
    throw error;
  }
} 