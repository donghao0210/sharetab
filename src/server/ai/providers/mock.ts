import type { AIProvider } from "../provider";
import type { ReceiptExtractionResult } from "../schema";

/**
 * Mock AI provider for testing. Returns deterministic receipt data
 * without calling any external API.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";

  async extractReceipt(
    _imageBuffer: Buffer,
    _mimeType: string,
    correctionHint?: string
  ): Promise<ReceiptExtractionResult> {
    // Simulate a small delay like a real API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    const items: { name: string; originalName: string | null; quantity: number; unitPrice: number; totalPrice: number }[] = [
      // Multilingual examples (originalName populated with non-English script)
      { name: "Mapo Tofu", originalName: "麻婆豆腐", quantity: 1, unitPrice: 1880, totalPrice: 1880 },
      { name: "Xiao Long Bao (8 pcs)", originalName: "小笼包 (8个)", quantity: 1, unitPrice: 1520, totalPrice: 1520 },
      // Code-prefix examples (originalName preserves the SKU stripped from name)
      { name: "Dumpling+Mixed Vegetable", originalName: "PK001 Dumpling+Mixed Vegetable", quantity: 2, unitPrice: 1390, totalPrice: 2780 },
      { name: "Spicy Chicken Wings", originalName: "ITM-0432 Spicy Chicken Wings", quantity: 1, unitPrice: 1195, totalPrice: 1195 },
      // Clean English (originalName=null)
      { name: "Grilled Salmon", originalName: null, quantity: 1, unitPrice: 1895, totalPrice: 1895 },
      { name: "Caesar Salad", originalName: null, quantity: 1, unitPrice: 1295, totalPrice: 1295 },
      { name: "Mushroom Risotto", originalName: null, quantity: 1, unitPrice: 1695, totalPrice: 1695 },
      { name: "Garlic Bread", originalName: null, quantity: 2, unitPrice: 495, totalPrice: 990 },
      { name: "Tomato Soup", originalName: null, quantity: 1, unitPrice: 895, totalPrice: 895 },
      { name: "Fish Tacos", originalName: null, quantity: 3, unitPrice: 550, totalPrice: 1650 },
      { name: "Margherita Pizza", originalName: null, quantity: 1, unitPrice: 1495, totalPrice: 1495 },
      { name: "French Fries", originalName: null, quantity: 2, unitPrice: 595, totalPrice: 1190 },
      { name: "Iced Tea", originalName: null, quantity: 3, unitPrice: 350, totalPrice: 1050 },
      { name: "Lemonade", originalName: null, quantity: 2, unitPrice: 395, totalPrice: 790 },
      { name: "Chocolate Cake", originalName: null, quantity: 1, unitPrice: 895, totalPrice: 895 },
      { name: "Tiramisu", originalName: null, quantity: 1, unitPrice: 995, totalPrice: 995 },
      { name: "Espresso", originalName: null, quantity: 2, unitPrice: 350, totalPrice: 700 },
      { name: "Sparkling Water", originalName: null, quantity: 1, unitPrice: 295, totalPrice: 295 },
      { name: "Bruschetta", originalName: null, quantity: 1, unitPrice: 795, totalPrice: 795 },
      { name: "Mozzarella Sticks", originalName: null, quantity: 1, unitPrice: 895, totalPrice: 895 },
      { name: "Cheesecake", originalName: null, quantity: 1, unitPrice: 995, totalPrice: 995 },
    ];

    // If a correction hint is provided, add an extra item to show it was applied
    if (correctionHint) {
      items.push({ name: "Corrected Item", originalName: null, quantity: 1, unitPrice: 100, totalPrice: 100 });
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const tip = 0;
    const serviceCharge = 0;
    const discount = 0;
    const rounding = 0;
    const total = subtotal + serviceCharge + tax + tip - discount + rounding;

    return {
      merchantName: "The Golden Fork",
      date: "2025-03-15",
      items,
      subtotal,
      tax,
      tip,
      serviceCharge,
      discount,
      rounding,
      taxPct: 8,
      servicePct: null,
      pricesIncludeTax: false,
      total,
      currency: "USD",
      confidence: 0.95,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
