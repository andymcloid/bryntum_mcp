/**
 * Home Page Component
 *
 * Displays welcome screen and navigation to main features.
 * Follows Single Responsibility Principle (SRP).
 */
import { Component } from '../components/Component.js';

export class HomePage extends Component {
    async render() {
        const html = `
            <div class="fade-in">
                <div class="text-center mb-8">
                    <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem;">
                        Bryntum Documentation RAG
                    </h1>
                    <p style="font-size: 1.25rem; color: var(--text-secondary);">
                        Semantic search powered by AI embeddings and vector database
                    </p>
                </div>

                <div class="grid grid-cols-2 mb-8">
                    <div class="card">
                        <div class="card-header">
                            <svg class="w-10 h-10 mb-2" style="width: 2.5rem; height: 2.5rem; color: var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <h2 class="card-title">AI Search</h2>
                            <p class="card-description">
                                Find relevant documentation using natural language queries
                            </p>
                        </div>
                        <div class="card-content">
                            <a href="/search" data-link class="btn btn-primary btn-full">Start Searching</a>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <svg class="w-10 h-10 mb-2" style="width: 2.5rem; height: 2.5rem; color: var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <h2 class="card-title">Admin</h2>
                            <p class="card-description">
                                Upload docs, manage versions & API
                            </p>
                        </div>
                        <div class="card-content">
                            <a href="/admin" data-link class="btn btn-secondary btn-full">Admin Panel</a>
                        </div>
                    </div>
                </div>

                <div style="background-color: var(--surface); border-radius: var(--radius); padding: 1.5rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">About</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        This RAG (Retrieval-Augmented Generation) system indexes Bryntum documentation
                        and makes it searchable through semantic similarity using OpenAI embeddings and Weaviate.
                    </p>
                    <div class="grid" style="grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.875rem;">
                        <div>
                            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Features</h3>
                            <ul style="list-style: disc; list-style-position: inside; color: var(--text-secondary);">
                                <li>Semantic search with AI</li>
                                <li>Real-time document indexing</li>
                                <li>Progress tracking</li>
                                <li>RESTful API</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Technology</h3>
                            <ul style="list-style: disc; list-style-position: inside; color: var(--text-secondary);">
                                <li>OpenAI Embeddings</li>
                                <li>Weaviate Vector Store</li>
                                <li>Vanilla JavaScript</li>
                                <li>Node.js Backend</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setContent(html);
    }
}
