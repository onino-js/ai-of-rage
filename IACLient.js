// src/sdk/IAClient.js
import OpenAI from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

export const AI_PROVIDERS = {
  chatgpt: {
    name: "ChatGPT",
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    provider: "openai",
  },
  mistral: {
    name: "Mistral",
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: "https://api.mistral.ai/v1",
    model: "mistral-large-latest",
    provider: "mistral",
  },
  deepseek: {
    name: "DeepSeek",
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    provider: "deepseek",
  },
  grok: {
    name: "Grok",
    apiKey: process.env.GROK_API_KEY,
    baseURL: "https://api.x.ai/v1",
    model: "grok-2-latest",
    provider: "grok",
  },
  gemini: {
    name: "Gemini",
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.0-flash",
    provider: "gemini",
  },
  claude: {
    name: "Claude",
    apiKey: process.env.CLAUDE_API_KEY,
    model: "claude-3-7-sonnet-20250219",
    provider: "claude",
  },
};
export class IAClient {
  constructor(config) {
    this.config = config;
    this.model = config.model;
    this.provider = config.provider;

    switch (this.provider) {
      case "openai":
      case "mistral":
      case "grok":
      case "deepseek":
        this.client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
        });
        break;

      case "claude":
        this.client = new Anthropic({ apiKey: config.apiKey });
        break;

      case "gemini":
        this.client = new GoogleGenerativeAI(config.apiKey);
        break;

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  async chat(messages, temperature = 0.7) {
    switch (this.provider) {
      case "openai":
      case "mistral":
      case "grok":
      case "deepseek": {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature,
        });
        const content = response.choices?.[0]?.message?.content || "";
        return { text: content, raw: response };
      }

      case "claude": {
        const response = await this.client.messages.create({
          model: this.model,
          temperature,
          max_tokens: 1000,
          messages: messages.map((m) => ({
            role: m.role === "system" ? "user" : m.role, // Anthropic doesn't accept system as role
            content: m.content,
          })),
        });
        const content = response.content?.[0]?.text || "";
        return { text: content, raw: response };
      }

      case "gemini": {
        const model = this.client.getGenerativeModel({ model: this.model });

        const parts = messages.map((m) => `${m.content}`);
        const prompt = parts.join("\n");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text();
        return { text: content, raw: response };
      }

      default:
        throw new Error(`No handler for provider: ${this.provider}`);
    }
  }
}
