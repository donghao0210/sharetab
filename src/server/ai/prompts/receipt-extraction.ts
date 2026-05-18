export const RECEIPT_EXTRACTION_PROMPT = `You are a receipt parser. Extract structured data from this receipt image.

Return a JSON object with exactly this structure:
{
  "merchantName": "store name or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    { "name": "item description", "originalName": null, "quantity": 1, "unitPrice": 499, "totalPrice": 499 }
  ],
  "subtotal": 1299,
  "tax": 104,
  "tip": 0,
  "serviceCharge": 0,
  "discount": 0,
  "rounding": 0,
  "taxPct": null,
  "servicePct": null,
  "pricesIncludeTax": false,
  "total": 1403,
  "currency": "USD"
}

CRITICAL RULES:
- All monetary values MUST be integers in cents (e.g., $12.99 = 1299).
- Every line item printed on the receipt must appear in the items array.
- quantity * unitPrice should equal totalPrice for each item.
- subtotal should equal the sum of all item totalPrices.
- "currency" MUST be a three-letter ISO 4217 code in uppercase (e.g. "USD", "MYR", "EUR", "SGD"). Map symbols you see on the receipt to ISO codes: "RM" -> "MYR", "S$" -> "SGD", "$" -> "USD", "€" -> "EUR", "£" -> "GBP", "¥" -> "JPY". Never return a symbol or non-ISO string.

QUANTITY (read this carefully — common failure mode):
- If a numeric quantity is printed at the START of an item line (e.g. "2 PK001 Dumpling+Mixed Vegetable 27.80", "3x Roti Canai 6.00", "QTY 4 - Teh Tarik 14.00"), set "quantity" to that number. The price printed on the RIGHT of the line is the LINE TOTAL ("totalPrice"). Compute "unitPrice" as totalPrice / quantity (rounded to the nearest cent).
- Example: "2 PK001 Dumpling+Mixed Vegetable 27.80" → { "name": "Dumpling+Mixed Vegetable", "originalName": "PK001 Dumpling+Mixed Vegetable", "quantity": 2, "unitPrice": 1390, "totalPrice": 2780 }.
- If no quantity is printed at the start of the line, default quantity to 1 and set unitPrice = totalPrice.
- Do NOT collapse a multi-quantity line into a single item with quantity 1 — that loses information and breaks per-item splitting.

ORIGINAL NAME (preserve what's printed on the receipt):
- "originalName" holds the verbatim printed item text. Use it when "name" had to be normalised — specifically:
  - The receipt prints the item in a NON-ENGLISH script (Chinese 中文, Japanese 日本語, Korean 한국어, Tamil தமிழ், Arabic العربية, etc.). Put the original script in "originalName" and an English translation/transliteration in "name". Example: { "name": "Mapo Tofu", "originalName": "麻婆豆腐", ... }.
  - The receipt prefixes the item with a printed code or SKU (e.g. "PK001", "ITM-432"). Strip the code from "name" for readability, but keep the original line in "originalName". Example: name "Dumpling+Mixed Vegetable", originalName "PK001 Dumpling+Mixed Vegetable".
- If the item is already in clean English with no code prefix, set "originalName" to null.

TAX / SERVICE / TIP / DISCOUNT / ROUNDING:
- "tax" is the absolute tax amount printed on the receipt (e.g. "Sales Tax", "SST", "GST", "VAT"). Use 0 if not printed.
- "serviceCharge" is the merchant-added service charge printed on the receipt (e.g. "Service Charge 10%", "Gratuity"). Distinct from "tip" (which is customer-added). Use 0 if not printed.
- "tip" is a voluntary customer-added amount printed on the receipt (US-style tip line). Use 0 if not printed.
- "discount" is the absolute discount amount printed on the receipt, always as a positive integer (e.g. "Lunch Discount -RM 5.00" => 500). Use 0 if not printed.
- "rounding" is the rounding adjustment printed on the receipt (e.g. "Rounding -0.02", "Round Off -0.03", "Adj +0.01"). It is a SIGNED integer in cents — NEGATIVE if subtracted from the total (most common, e.g. Malaysian 5-sen rounding), POSITIVE if added. Use 0 if not printed.
- "taxPct" is the tax percentage when explicitly printed alongside the tax line (e.g. "SST 6%" => 6). Use null if a percentage is not visible.
- "servicePct" is the service charge percentage when explicitly printed (e.g. "Service 10%" => 10). Use null if a percentage is not visible.

TAX-INCLUSIVE ITEMS:
- "pricesIncludeTax" indicates whether the per-item unitPrice / totalPrice values ALREADY include tax.
- Most receipts (US, Malaysia, Singapore, etc.) are tax-EXCLUSIVE: item prices are pre-tax and tax is added on top. Set pricesIncludeTax=false.
- Some receipts are explicitly tax-INCLUSIVE — look for phrases such as "Prices include GST", "Inclusive of SST", "VAT included", "All prices inclusive of tax". Set pricesIncludeTax=true. In this case, the "tax" field is the portion of tax already baked into the item prices (informational), not added on top.
- When unclear, default to false.

CONSISTENCY (verify your extraction reconciles):
- If pricesIncludeTax=false: total ≈ subtotal + serviceCharge + tax + tip - discount + rounding.
- If pricesIncludeTax=true: total ≈ subtotal + serviceCharge + tip - discount + rounding (tax is already inside subtotal).
- Small rounding differences (1-2 cents) are acceptable AFTER accounting for the "rounding" field. If you see a >1-cent gap and no rounding line is printed, re-examine the receipt before responding.

- If you cannot read a value clearly, make your best estimate.
- Do not include any text outside the JSON object.
- Return ONLY valid JSON, no markdown code fences.`;
