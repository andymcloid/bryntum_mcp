/**
 * Code Generation Routes (with MCP-powered documentation)
 *
 * Uses Claude API with MCP search for intelligent code generation
 */
import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'GenerateRoutes' });

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
});

/**
 * Register code generation routes
 */
export default async function generateRoutes(fastify, options) {
  const { queryService } = fastify;

  /**
   * POST /api/generate-grid
   * Generate Bryntum Grid code using Claude with MCP documentation search
   */
  fastify.post('/generate-grid', async (request, reply) => {
    try {
      const { prompt, currentCode } = request.body;

      if (!prompt) {
        return reply.code(400).send({ error: 'Prompt is required' });
      }

      logger.info({ prompt: prompt.substring(0, 100) }, 'Generating grid code with MCP search');

      // Step 1: Search for relevant documentation using MCP
      const searchResults = await queryService.search(prompt, {
        limit: 5,
        filter: { product: 'grid' },
      });

      // Format documentation for prompt
      const docsContext = searchResults
        .map((result, idx) => {
          return `[Doc ${idx + 1}]\nScore: ${result.score.toFixed(3)}\n${result.text}\n`;
        })
        .join('\n---\n\n');

      // Step 2: Create base prompt for code generation
      const basePrompt = `You are an expert on Bryntum Grid. Your task is to generate JavaScript code for Bryntum Grid based on the user's requirements.

## IMPORTANT RULES:
1. Return ONLY pure JavaScript code without markdown formatting
2. ALWAYS include data separately as a const data = [...]
3. Create at least 12 data rows unless otherwise specified
4. Use Grid configuration according to the documentation below
5. Code must run directly in the editor without modifications

## Response Format:
\`\`\`javascript
// Grid data
const data = [
  { id: 1, ... },
  // ...at least 12 rows
];

// Grid configuration
new Grid({
  appendTo : 'preview-container',
  height   : 500,
  columns  : [...],
  data     : data
});
\`\`\`

## DOCUMENTATION FROM RAG (relevant to your task):

${docsContext}

---`;

      // Step 3: Build messages for Claude
      const messages = [
        {
          role: 'user',
          content: `${basePrompt}

CURRENT CODE IN EDITOR:
\`\`\`javascript
${currentCode}
\`\`\`

USER'S REQUEST: ${prompt}

Based on the documentation above and the user's request, return the updated JavaScript code.`,
        },
      ];

      // Step 4: Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: messages,
      });

      // Step 5: Extract code from response
      let code = message.content.find((content) => content.type === 'text')?.text || '';

      // Clean up code - remove markdown formatting
      code = code.replace(/```javascript\n?/g, '');
      code = code.replace(/```js\n?/g, '');
      code = code.replace(/```\n?/g, '');
      code = code.trim();

      logger.info({ codeLength: code.length }, 'Code generated successfully');

      return reply.send({
        code: code,
        debug: {
          userPrompt: prompt,
          searchQuery: prompt,
          ragResults: searchResults.map((r, idx) => ({
            index: idx + 1,
            score: r.score.toFixed(3),
            text: r.text,
            metadata: r.metadata,
          })),
          docsContext: docsContext,
          fullPrompt: messages[0].content,
          claudeModel: 'claude-sonnet-4-20250514',
          rawResponse: message.content.find((content) => content.type === 'text')?.text,
          tokensUsed: {
            input: message.usage?.input_tokens || 0,
            output: message.usage?.output_tokens || 0,
          },
        },
      });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Error generating code');
      return reply.code(500).send({
        error: 'Failed to generate code',
        message: error.message,
      });
    }
  });
}
