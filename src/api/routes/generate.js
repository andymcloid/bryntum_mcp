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
      const { prompt, files, availableComponents } = request.body;

      if (!prompt) {
        return reply.code(400).send({ error: 'Prompt is required' });
      }

      if (!files || typeof files !== 'object') {
        return reply.code(400).send({ error: 'Files object is required' });
      }

      const demoJs = files['demo.js'] || '';
      const dataJson = files['data.json'] || '[]';
      const styleCSS = files['style.css'] || '';
      const components = Array.isArray(availableComponents) ? availableComponents : [];

      logger.info({ prompt: prompt.substring(0, 100), components }, 'Generating component code with MCP search');

      // Step 1: Search for relevant documentation using MCP (no product filter - all components)
      const searchResults = await queryService.search(prompt, {
        limit: 3,
      });

      // Format documentation for prompt
      const docsContext = searchResults
        .map((result, idx) => {
          return `[Doc ${idx + 1}]\nScore: ${result.score.toFixed(3)}\n${result.text}\n`;
        })
        .join('\n---\n\n');

      // Step 2: Create base prompt for code generation
      const componentsText = components.length > 0
        ? `We have loaded the following Bryntum components and they are all available for your use: ${components.join(', ')}.`
        : 'All standard Bryntum components (Grid, Scheduler, SchedulerPro, Gantt, TaskBoard) are pre-loaded and available for your use.';

      const basePrompt = `You are an expert on Bryntum components (Grid, Scheduler, Gantt, TaskBoard, etc.). Your task is to generate code based on the user's requirements.

## AVAILABLE COMPONENTS:
${componentsText}

## FILE STRUCTURE:
The project has 3 files:
1. **demo.js** - Component instantiation code (e.g., new Grid({...}))
2. **data.json** - JSON data array (becomes available as 'data' variable in demo.js)
3. **style.css** - Custom CSS styles (optional)

## CRITICAL: RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:

You MUST respond with tagged sections for ONLY the files you want to change.
Do NOT return files that don't need changes - only return what you modified.

AVAILABLE FILES TO MODIFY:
- [demo.js]...[/demo.js] - Component code
- [data.json]...[/data.json] - JSON data
- [style.css]...[/style.css] - Custom CSS

EXAMPLE - If only changing data:
[data.json]
[
  { "id": 1, "name": "Example", ... },
  { "id": 2, "name": "Example 2", ... }
]
[/data.json]

EXAMPLE - If changing both demo and data:
[demo.js]
new Grid({
  appendTo : 'preview-container',
  height   : '100%',
  columns  : [...],
  data     : data
});
[/demo.js]

[data.json]
[
  { "id": 1, "name": "Example", ... }
]
[/data.json]

EXAMPLE - If only adding CSS:
[style.css]
.b-grid-header {
  background: #f0f0f0;
}
[/style.css]

## RULES:
1. ONLY return tags for files you are modifying
2. Do NOT use markdown code blocks (\`\`\`javascript, \`\`\`json, etc.)
3. In demo.js, reference 'data' variable (it comes from data.json)
4. In data.json, provide valid JSON array (at least 12 rows unless specified)
5. Use appendTo: 'preview-container' for all components
6. Code must run directly without modifications

## DOCUMENTATION FROM RAG (relevant to your task):

${docsContext}

---`;

      // Step 3: Build messages for Claude
      const currentFilesContext = `CURRENT FILES:

[demo.js]
${demoJs}
[/demo.js]

[data.json]
${dataJson}
[/data.json]

[style.css]
${styleCSS}
[/style.css]`;

      const messages = [
        {
          role: 'user',
          content: `${basePrompt}

${currentFilesContext}

USER'S REQUEST: ${prompt}

Based on the documentation above and the user's request, return ONLY the files you need to modify using the tagged format.
If you only need to change CSS, return only [style.css]...[/style.css].
If you only need to change data, return only [data.json]...[/data.json].
Return multiple files only if multiple files need changes.`,
        },
      ];

      // Step 4: Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: messages,
      });

      // Step 5: Extract code from response
      let rawResponse = message.content.find((content) => content.type === 'text')?.text || '';

      // Parse tagged files from response
      const extractFile = (text, filename) => {
        const pattern = new RegExp(`\\[${filename.replace('.', '\\.')}\\]([\\s\\S]*?)\\[\\/${filename.replace('.', '\\.')}\\]`, 'i');
        const match = text.match(pattern);
        if (match) {
          let content = match[1].trim();
          // Remove markdown code blocks if present
          content = content.replace(/```(?:javascript|js|json|css)?\n?/g, '');
          content = content.replace(/```\n?/g, '');
          return content;
        }
        return null;
      };

      const extractedFiles = {
        'demo.js': extractFile(rawResponse, 'demo.js'),
        'data.json': extractFile(rawResponse, 'data.json'),
        'style.css': extractFile(rawResponse, 'style.css'),
      };

      // Remove null values
      const responseFiles = {};
      for (const [key, value] of Object.entries(extractedFiles)) {
        if (value !== null) {
          responseFiles[key] = value;
        }
      }

      // Validation: At least ONE file must be returned
      if (Object.keys(responseFiles).length === 0) {
        logger.error(
          {
            rawResponse: rawResponse.substring(0, 500)
          },
          'AI did not respond with any tagged files'
        );

        return reply.code(500).send({
          error: 'AI response format error',
          message: 'AI did not respond with any file tags ([demo.js], [data.json], or [style.css]). Please try again.',
          debug: {
            userPrompt: prompt,
            rawResponse: rawResponse
          }
        });
      }

      logger.info({ filesExtracted: Object.keys(responseFiles) }, 'Code generated successfully');

      return reply.send({
        files: responseFiles,
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
          rawResponse: rawResponse,
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
