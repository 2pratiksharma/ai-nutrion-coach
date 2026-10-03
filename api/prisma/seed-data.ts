export type SeedFood = {
  name: string;
  category: string;
  dietType: "VEG" | "NON_VEG" | "EGGETARIAN" | "VEGAN";
  servingLabel: string;
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
};

export const foods: SeedFood[] = [
  // Grains / breads
  { name: "Roti (whole wheat)", category: "Grains", dietType: "VEG", servingLabel: "1 roti", servingGrams: 40, caloriesPer100g: 297, proteinPer100g: 11, carbsPer100g: 51, fatPer100g: 6, fiberPer100g: 10 },
  { name: "Rice (cooked)", category: "Grains", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4 },
  { name: "Brown rice (cooked)", category: "Grains", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 123, proteinPer100g: 2.7, carbsPer100g: 26, fatPer100g: 1, fiberPer100g: 1.8 },
  { name: "Naan", category: "Grains", dietType: "VEG", servingLabel: "1 naan", servingGrams: 90, caloriesPer100g: 310, proteinPer100g: 9, carbsPer100g: 50, fatPer100g: 8, fiberPer100g: 2 },
  { name: "Paratha (plain)", category: "Grains", dietType: "VEG", servingLabel: "1 paratha", servingGrams: 60, caloriesPer100g: 330, proteinPer100g: 6, carbsPer100g: 45, fatPer100g: 14, fiberPer100g: 3 },
  { name: "Poha", category: "Grains", dietType: "VEG", servingLabel: "1 plate", servingGrams: 200, caloriesPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 24, fatPer100g: 3.5, fiberPer100g: 1.2 },
  { name: "Idli", category: "Grains", dietType: "VEG", servingLabel: "1 idli", servingGrams: 40, caloriesPer100g: 130, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 0.5, fiberPer100g: 1 },
  { name: "Dosa (plain)", category: "Grains", dietType: "VEG", servingLabel: "1 dosa", servingGrams: 80, caloriesPer100g: 168, proteinPer100g: 3.9, carbsPer100g: 28, fatPer100g: 4.5, fiberPer100g: 1 },
  { name: "Upma", category: "Grains", dietType: "VEG", servingLabel: "1 plate", servingGrams: 200, caloriesPer100g: 140, proteinPer100g: 3, carbsPer100g: 22, fatPer100g: 4.5, fiberPer100g: 1.5 },

  // Dals / legumes
  { name: "Dal tadka", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 116, proteinPer100g: 7, carbsPer100g: 15, fatPer100g: 3, fiberPer100g: 4 },
  { name: "Rajma curry", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 127, proteinPer100g: 7.5, carbsPer100g: 18, fatPer100g: 2.8, fiberPer100g: 6 },
  { name: "Chole (chickpea curry)", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 140, proteinPer100g: 7, carbsPer100g: 20, fatPer100g: 3.5, fiberPer100g: 5.5 },
  { name: "Sambar", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 90, proteinPer100g: 4.5, carbsPer100g: 13, fatPer100g: 2, fiberPer100g: 3 },
  { name: "Moong dal (dry, cooked)", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 105, proteinPer100g: 7, carbsPer100g: 17, fatPer100g: 0.5, fiberPer100g: 4 },
  { name: "Soya chunks (cooked)", category: "Dals & Legumes", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 120, proteinPer100g: 17, carbsPer100g: 9, fatPer100g: 1, fiberPer100g: 4 },

  // Paneer / dairy
  { name: "Paneer (raw)", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "100g", servingGrams: 100, caloriesPer100g: 265, proteinPer100g: 18, carbsPer100g: 3.4, fatPer100g: 20, fiberPer100g: 0 },
  { name: "Paneer butter masala", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 200, proteinPer100g: 9, carbsPer100g: 9, fatPer100g: 14, fiberPer100g: 1.5 },
  { name: "Palak paneer", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 150, proteinPer100g: 8, carbsPer100g: 6, fatPer100g: 10, fiberPer100g: 2.5 },
  { name: "Curd / dahi (plain)", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 60, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, fiberPer100g: 0 },
  { name: "Greek yogurt (plain)", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "1 cup", servingGrams: 200, caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 0 },
  { name: "Milk (whole)", category: "Paneer & Dairy", dietType: "VEG", servingLabel: "1 glass", servingGrams: 250, caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0 },

  // Non-veg
  { name: "Chicken curry", category: "Non-Veg", dietType: "NON_VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 170, proteinPer100g: 18, carbsPer100g: 5, fatPer100g: 9, fiberPer100g: 1 },
  { name: "Chicken breast (grilled)", category: "Non-Veg", dietType: "NON_VEG", servingLabel: "100g", servingGrams: 100, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { name: "Chicken tandoori", category: "Non-Veg", dietType: "NON_VEG", servingLabel: "1 piece", servingGrams: 100, caloriesPer100g: 180, proteinPer100g: 26, carbsPer100g: 2, fatPer100g: 7, fiberPer100g: 0.5 },
  { name: "Egg boiled", category: "Non-Veg", dietType: "EGGETARIAN", servingLabel: "1 egg", servingGrams: 50, caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0 },
  { name: "Egg bhurji", category: "Non-Veg", dietType: "EGGETARIAN", servingLabel: "1 plate (2 eggs)", servingGrams: 120, caloriesPer100g: 175, proteinPer100g: 12, carbsPer100g: 3, fatPer100g: 13, fiberPer100g: 0.5 },
  { name: "Fish curry", category: "Non-Veg", dietType: "NON_VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 140, proteinPer100g: 18, carbsPer100g: 4, fatPer100g: 6, fiberPer100g: 1 },
  { name: "Mutton curry", category: "Non-Veg", dietType: "NON_VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 220, proteinPer100g: 19, carbsPer100g: 4, fatPer100g: 14, fiberPer100g: 1 },

  // Vegetables
  { name: "Mixed vegetable curry", category: "Vegetables", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 90, proteinPer100g: 2.5, carbsPer100g: 11, fatPer100g: 4, fiberPer100g: 3 },
  { name: "Bhindi masala (okra)", category: "Vegetables", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 95, proteinPer100g: 2.2, carbsPer100g: 9, fatPer100g: 5.5, fiberPer100g: 3.5 },
  { name: "Aloo gobi", category: "Vegetables", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 110, proteinPer100g: 2.5, carbsPer100g: 14, fatPer100g: 5, fiberPer100g: 2.5 },
  { name: "Baingan bharta", category: "Vegetables", dietType: "VEG", servingLabel: "1 katori", servingGrams: 150, caloriesPer100g: 100, proteinPer100g: 1.8, carbsPer100g: 9, fatPer100g: 6.5, fiberPer100g: 3 },
  { name: "Salad (cucumber, tomato, onion)", category: "Vegetables", dietType: "VEGAN", servingLabel: "1 bowl", servingGrams: 150, caloriesPer100g: 25, proteinPer100g: 1, carbsPer100g: 5, fatPer100g: 0.2, fiberPer100g: 1.5 },

  // Snacks
  { name: "Samosa", category: "Snacks", dietType: "VEG", servingLabel: "1 samosa", servingGrams: 60, caloriesPer100g: 260, proteinPer100g: 4.5, carbsPer100g: 27, fatPer100g: 15, fiberPer100g: 2 },
  { name: "Vada pav", category: "Snacks", dietType: "VEG", servingLabel: "1 pc", servingGrams: 120, caloriesPer100g: 230, proteinPer100g: 5, carbsPer100g: 30, fatPer100g: 10, fiberPer100g: 2 },
  { name: "Sprouts salad", category: "Snacks", dietType: "VEGAN", servingLabel: "1 bowl", servingGrams: 150, caloriesPer100g: 70, proteinPer100g: 6, carbsPer100g: 11, fatPer100g: 0.5, fiberPer100g: 4 },
  { name: "Roasted chana", category: "Snacks", dietType: "VEGAN", servingLabel: "1 handful", servingGrams: 30, caloriesPer100g: 364, proteinPer100g: 20, carbsPer100g: 58, fatPer100g: 5, fiberPer100g: 17 },
  { name: "Almonds", category: "Snacks", dietType: "VEGAN", servingLabel: "10 almonds", servingGrams: 12, caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, fiberPer100g: 12.5 },
  { name: "Banana", category: "Fruits", dietType: "VEGAN", servingLabel: "1 medium", servingGrams: 120, caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { name: "Apple", category: "Fruits", dietType: "VEGAN", servingLabel: "1 medium", servingGrams: 180, caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 2.4 },

  // Protein shakes / other
  { name: "Whey protein (scoop)", category: "Supplements", dietType: "VEG", servingLabel: "1 scoop (30g)", servingGrams: 30, caloriesPer100g: 380, proteinPer100g: 80, carbsPer100g: 7, fatPer100g: 5, fiberPer100g: 1 },
];
