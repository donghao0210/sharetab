import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "../provider";
import type { ReceiptExtractionResult } from "../schema";
import { receiptExtractionSchema } from "../schema";
import { RECEIPT_EXTRACTION_PROMPT } from "../prompts/receipt-extraction";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model ?? "gemini-2.5-flash";
  }

  async extractReceipt(
    imageBuffer: Buffer,
    mimeType: string,
    correctionHint?: string
  ): Promise<ReceiptExtractionResult> {
    const base64 = imageBuffer.toString("base64");
    const prompt = correctionHint
      ? `${RECEIPT_EXTRACTION_PROMPT}\n\nThe user has provided a correction. Apply it to improve accuracy:\n<user_correction>${correctionHint.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</user_correction>`
      : RECEIPT_EXTRACTION_PROMPT;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    // responseMimeType=application/json yields clean JSON, but some Gemini revisions
    // still wrap in ```json ... ``` fences. Strip them defensively.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let raw: unknown;
    try {
      raw = JSON.parse(cleaned);
    } catch (jsonError) {
      throw new Error(
        `Gemini returned invalid JSON. Raw text (first 500 chars): ${cleaned.slice(0, 500)}`,
        { cause: jsonError }
      );
    }
    try {
      return receiptExtractionSchema.parse(raw);
    } catch (zodError) {
      throw new Error(
        `Gemini returned valid JSON but it doesn't match the expected schema. Parsed keys: ${Object.keys(raw as Record<string, unknown>).join(", ")}`,
        { cause: zodError }
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Lightweight call to verify the API key + connectivity.
      await this.client.models.list({ config: { pageSize: 1 } });
      return true;
    } catch {
      return false;
    }
  }
}
