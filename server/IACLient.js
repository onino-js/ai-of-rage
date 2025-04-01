// src/sdk/IAClient.js
import OpenAI from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const AI_PROVIDERS = {
  chatgpt: {
    name: "ChatGPT",
    apiKey:
      "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",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    provider: "openai",
  },
  mistral: {
    name: "Mistral",
    apiKey: "ZlSW8XCwYv9nF9qYFfohPPIavY78VdOT",
    baseURL: "https://api.mistral.ai/v1",
    model: "mistral-large-latest",
    provider: "mistral",
  },
  deepseek: {
    name: "DeepSeek",
    apiKey: "sk-6fb73872c2ef4c49a2f0033daa545b41",
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    provider: "deepseek",
  },
  grok: {
    name: "Grok",
    apiKey:
      "xai-9bHenbPo7qkIEjQEOvpIGU01WXXoc6VCzvENt6jyTab33Y8bdCCLvIVEneFlDh87RSMG4NxbugWucNxZ",
    baseURL: "https://api.x.ai/v1",
    model: "grok-2-latest",
    provider: "grok",
  },
  gemini: {
    name: "Gemini",
    apiKey: "AIzaSyDBwrEz9b3A8HDWj-S9uWdxSCadZzWFX9Q",
    model: "gemini-2.0-flash",
    provider: "gemini",
  },
  claude: {
    name: "Claude",
    apiKey:
      "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",
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

        const parts = messages.map(
          (m) => `${m.content}`
        );
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
