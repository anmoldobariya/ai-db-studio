import OpenAI from 'openai';
import { DbType } from '../types';
import log from 'electron-log';

const { BASE_URL, API_KEY, MODEL = 'qwen/qwen3-235b-a22b:free' } = process.env;

const openai = new OpenAI({
  baseURL: BASE_URL,
  apiKey: API_KEY
});

interface AiQueryRequest {
  prompt: string;
  activeTable?: string | null;
  schema?: any[];
  dbType?: DbType;
}

export async function askAI({
  schema,
  prompt,
  activeTable,
  dbType
}: AiQueryRequest): Promise<string | null> {
  try {
    const systemPrompt = `
      You are a helpful assistant that generates database queries from natural language input.
      The current database is ${dbType}.

      Schema Info:
      ${JSON.stringify(schema)}

      ${activeTable ? `The user is currently viewing the "${activeTable}" table.` : ''}

      Instructions:
      1. Use only the provided schema.
      2. Join tables if the question involves more than one.
      3. If the schema lacks the required info, respond with: "Not applicable".
      4. Only return the query — no explanation.
      5. Use correct syntax for ${dbType}.
      6. Don’t guess values or table structures.
      7. Follow column types and constraints.
      8. If unsure, suggest a clarification query.
      9. Use case-insensitive matching for strings where needed.
      10. Quote identifiers as needed for ${dbType}:
        - Use appropriate style (e.g., \"columnName\" for Postgres).
        - Quote only when necessary (camelCase, reserved words, special characters).
        - Be consistent.
      `.trim();

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    return response.choices[0].message.content;
  } catch (error) {
    log.error('Error in AI chat:', error);
    throw error;
  }
}
