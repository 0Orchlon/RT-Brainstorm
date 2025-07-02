// app/routes/api.generate-ideas.tsx
import type { ActionFunctionArgs } from 'react-router';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { roomId, contextIdeas } = await request.json();

    if (!roomId) {
      return new Response(JSON.stringify({ message: 'Room ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ message: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contextText = contextIdeas && contextIdeas.length > 0 
      ? `Here are some existing ideas from the brainstorming session:\n${contextIdeas.map((idea: string, i: number) => `${i + 1}. ${idea}`).join('\n')}\n\n`
      : '';

    const prompt = `${contextText}You are an AI assistant helping with a brainstorming session. Generate 3 creative, innovative, and actionable ideas that build upon or complement the existing ideas. Each idea should be:
- Concise (1-2 sentences)
- Practical and implementable
- Creative but realistic
- Different from the existing ideas

Return only the 3 ideas, one per line, without numbering or bullet points.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No text generated from Gemini');
    }

    const ideas = generatedText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .slice(0, 3);

    return new Response(JSON.stringify({ ideas }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating AI ideas:', error);
    return new Response(JSON.stringify({ 
      message: 'Failed to generate ideas',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}