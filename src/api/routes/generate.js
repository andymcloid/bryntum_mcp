/**
 * Code Generation Routes (with MCP-powered documentation)
 *
 * Uses Claude API with MCP search for intelligent code generation
 */
import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = createLogger({ component: 'GenerateRoutes' });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
});

// Load prompt template once at startup
let promptTemplate = null;
async function loadPromptTemplate() {
  if (!promptTemplate) {
    const templatePath = path.join(__dirname, '../../../web/defaults/prompt_template.md');
    promptTemplate = await fs.readFile(templatePath, 'utf-8');
    logger.info('Loaded prompt template from defaults');
  }
  return promptTemplate;
}

/**
 * Register code generation routes
 */
export default async function generateRoutes(fastify, options) {
  const { queryService } = fastify;

  // Load template at startup
  await loadPromptTemplate();

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

      // Step 2: Build context for template placeholders
      const componentsText = components.length > 0
        ? `We have loaded the following Bryntum components and they are all available for your use: ${components.join(', ')}.`
        : 'All standard Bryntum components (Grid, Scheduler, SchedulerPro, Gantt, TaskBoard) are pre-loaded and available for your use.';

      const currentFilesContext = `[demo.js]
${demoJs}
[/demo.js]

[data.json]
${dataJson}
[/data.json]

[style.css]
${styleCSS}
[/style.css]`;

      // Step 3: Load template and replace placeholders
      const template = await loadPromptTemplate();
      const finalPrompt = template
        .replace('${AVAILABLE_COMPONENTS}', componentsText)
        .replace('${RAG_DOCS_CONTENT}', docsContext)
        .replace('${CURRENT_FILES_CONTENT}', currentFilesContext)
        .replace('${USER_INPUT}', prompt);

      const messages = [
        {
          role: 'user',
          content: finalPrompt,
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
