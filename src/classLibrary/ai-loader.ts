import { LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { azure } from "@ai-sdk/azure";
import { anthropic } from "@ai-sdk/anthropic";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { xai } from "@ai-sdk/xai";
import { togetherai } from "@ai-sdk/togetherai";
import { cohere } from "@ai-sdk/cohere";
import { fireworks } from "@ai-sdk/fireworks";
import { deepinfra } from "@ai-sdk/deepinfra";
import { deepseek } from "@ai-sdk/deepseek";
import { cerebras } from "@ai-sdk/cerebras";
import { groq } from "@ai-sdk/groq";
import { perplexity } from "@ai-sdk/perplexity";

interface AIConfiguration {
  model: string;
  provider: string;
}

class AILoader {
  Load(config: AIConfiguration): LanguageModel {
    switch (config.provider) {
      case "openai":
        return openai(config.model);
      case "azure":
        return azure(config.model);
      case "anthropic":
        return anthropic(config.model);
      case "amazon-bedrock":
        return bedrock(config.model);
      case "google":
        return google(config.model);
      case "mistral":
        return mistral(config.model);
      case "xai":
        return xai(config.model);
      case "togetherai":
        return togetherai(config.model);
      case "cohere":
        return cohere(config.model);
      case "fireworks":
        return fireworks(config.model);
      case "deepinfra":
        return deepinfra(config.model);
      case "deepseek":
        return deepseek(config.model);
      case "cerebras":
        return cerebras(config.model);
      case "groq":
        return groq(config.model);
      case "perplexity":
        return perplexity(config.model);
      default:
        throw new Error("Unknown provider");
    }
  }
}

export { AILoader, AIConfiguration };
