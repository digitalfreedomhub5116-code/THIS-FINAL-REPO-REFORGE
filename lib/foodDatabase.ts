// ── Comprehensive Food Database ─────────────────────────────────────────────
// Categories: Indian Dishes, Protein Shakes, Fruits, Vegetables, Snacks, Dairy, Grains, Non-Veg
// All values per standard serving size. Macros in grams, calories in kcal.

export type FoodCategory = 'INDIAN_MEALS' | 'PROTEIN_SHAKES' | 'FRUITS' | 'VEGETABLES' | 'SNACKS' | 'DAIRY' | 'GRAINS' | 'NON_VEG' | 'BEVERAGES';

export interface FoodDBItem {
  id: string;
  name: string;
  category: FoodCategory;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  servingSize: string;
  isVeg: boolean;
}

export const FOOD_CATEGORIES: { key: FoodCategory; label: string; emoji: string }[] = [
  { key: 'INDIAN_MEALS', label: 'Indian Meals', emoji: '🍛' },
  { key: 'PROTEIN_SHAKES', label: 'Protein Shakes', emoji: '🥤' },
  { key: 'FRUITS', label: 'Fruits', emoji: '🍎' },
  { key: 'VEGETABLES', label: 'Vegetables', emoji: '🥦' },
  { key: 'SNACKS', label: 'Snacks', emoji: '🍪' },
  { key: 'DAIRY', label: 'Dairy', emoji: '🥛' },
  { key: 'GRAINS', label: 'Grains & Bread', emoji: '🍞' },
  { key: 'NON_VEG', label: 'Non-Veg', emoji: '🍗' },
  { key: 'BEVERAGES', label: 'Beverages', emoji: '☕' },
];

let _id = 0;
const f = (name: string, cat: FoodCategory, cal: number, p: number, c: number, fa: number, fi: number, serving: string, veg = true): FoodDBItem => ({
  id: `food_${++_id}`, name, category: cat, calories: cal, protein: p, carbs: c, fats: fa, fiber: fi, servingSize: serving, isVeg: veg,
});

export const FOOD_DATABASE: FoodDBItem[] = [
  // ══════════════════════════════════════════════
  // ── Indian Meals (per standard serving) ──
  // ══════════════════════════════════════════════
  f('Dal Tadka', 'INDIAN_MEALS', 180, 9, 24, 5, 4, '1 bowl (200g)'),
  f('Dal Makhani', 'INDIAN_MEALS', 260, 10, 28, 12, 5, '1 bowl (200g)'),
  f('Rajma Chawal', 'INDIAN_MEALS', 350, 12, 55, 6, 8, '1 plate'),
  f('Chole (Chana Masala)', 'INDIAN_MEALS', 240, 11, 34, 7, 6, '1 bowl (200g)'),
  f('Paneer Butter Masala', 'INDIAN_MEALS', 340, 14, 16, 24, 2, '1 bowl (200g)'),
  f('Palak Paneer', 'INDIAN_MEALS', 280, 15, 12, 20, 3, '1 bowl (200g)'),
  f('Shahi Paneer', 'INDIAN_MEALS', 350, 14, 14, 26, 2, '1 bowl (200g)'),
  f('Kadhai Paneer', 'INDIAN_MEALS', 310, 14, 10, 24, 2, '1 bowl (200g)'),
  f('Matar Paneer', 'INDIAN_MEALS', 290, 14, 18, 18, 4, '1 bowl (200g)'),
  f('Aloo Gobi', 'INDIAN_MEALS', 160, 4, 22, 6, 4, '1 bowl (200g)'),
  f('Aloo Matar', 'INDIAN_MEALS', 180, 5, 26, 6, 5, '1 bowl (200g)'),
  f('Aloo Paratha', 'INDIAN_MEALS', 300, 7, 42, 12, 3, '1 paratha'),
  f('Gobi Paratha', 'INDIAN_MEALS', 260, 6, 38, 10, 3, '1 paratha'),
  f('Paneer Paratha', 'INDIAN_MEALS', 320, 12, 36, 14, 2, '1 paratha'),
  f('Plain Roti / Chapati', 'INDIAN_MEALS', 104, 3, 18, 2, 2, '1 roti'),
  f('Tandoori Roti', 'INDIAN_MEALS', 120, 4, 20, 2, 2, '1 roti'),
  f('Naan', 'INDIAN_MEALS', 260, 8, 45, 5, 2, '1 naan'),
  f('Butter Naan', 'INDIAN_MEALS', 310, 8, 44, 11, 2, '1 naan'),
  f('Garlic Naan', 'INDIAN_MEALS', 300, 8, 46, 9, 2, '1 naan'),
  f('Puri', 'INDIAN_MEALS', 100, 2, 12, 5, 1, '1 puri'),
  f('Bhatura', 'INDIAN_MEALS', 260, 6, 36, 10, 2, '1 bhatura'),
  f('Chole Bhature', 'INDIAN_MEALS', 450, 14, 60, 16, 6, '1 plate'),
  f('Pav Bhaji', 'INDIAN_MEALS', 380, 10, 50, 15, 5, '1 plate'),
  f('Vada Pav', 'INDIAN_MEALS', 290, 6, 40, 12, 3, '1 piece'),
  f('Samosa', 'INDIAN_MEALS', 260, 5, 30, 14, 2, '1 piece'),
  f('Idli', 'INDIAN_MEALS', 58, 2, 12, 0.2, 0.5, '1 idli'),
  f('Dosa (Plain)', 'INDIAN_MEALS', 130, 3, 22, 3, 1, '1 dosa'),
  f('Masala Dosa', 'INDIAN_MEALS', 250, 5, 38, 8, 3, '1 dosa'),
  f('Upma', 'INDIAN_MEALS', 200, 5, 30, 6, 2, '1 bowl (200g)'),
  f('Poha', 'INDIAN_MEALS', 250, 5, 42, 6, 2, '1 bowl (200g)'),
  f('Khichdi', 'INDIAN_MEALS', 220, 8, 36, 4, 3, '1 bowl (200g)'),
  f('Biryani (Veg)', 'INDIAN_MEALS', 320, 8, 50, 10, 3, '1 plate'),
  f('Biryani (Chicken)', 'INDIAN_MEALS', 400, 22, 48, 12, 2, '1 plate', false),
  f('Biryani (Mutton)', 'INDIAN_MEALS', 450, 24, 48, 16, 2, '1 plate', false),
  f('Pulao (Veg)', 'INDIAN_MEALS', 260, 5, 44, 7, 2, '1 plate'),
  f('Jeera Rice', 'INDIAN_MEALS', 220, 4, 42, 4, 1, '1 plate'),
  f('Steamed Rice', 'INDIAN_MEALS', 200, 4, 44, 0.5, 0.5, '1 bowl (150g)'),
  f('Sambar', 'INDIAN_MEALS', 130, 6, 18, 3, 4, '1 bowl (200g)'),
  f('Rasam', 'INDIAN_MEALS', 60, 2, 10, 1, 2, '1 bowl (200g)'),
  f('Kadhi Pakora', 'INDIAN_MEALS', 200, 6, 18, 12, 2, '1 bowl (200g)'),
  f('Bhindi Masala', 'INDIAN_MEALS', 140, 3, 14, 8, 4, '1 bowl (200g)'),
  f('Baingan Bharta', 'INDIAN_MEALS', 150, 3, 12, 10, 4, '1 bowl (200g)'),
  f('Lauki Sabzi', 'INDIAN_MEALS', 80, 2, 10, 3, 2, '1 bowl (200g)'),
  f('Tinda Masala', 'INDIAN_MEALS', 90, 2, 12, 3, 3, '1 bowl (200g)'),
  f('Mix Veg Sabzi', 'INDIAN_MEALS', 150, 5, 16, 7, 5, '1 bowl (200g)'),
  f('Butter Chicken', 'INDIAN_MEALS', 380, 28, 10, 26, 1, '1 bowl (200g)', false),
  f('Chicken Tikka Masala', 'INDIAN_MEALS', 340, 30, 12, 20, 2, '1 bowl (200g)', false),
  f('Tandoori Chicken', 'INDIAN_MEALS', 260, 32, 6, 12, 1, '2 pieces', false),
  f('Chicken Curry', 'INDIAN_MEALS', 300, 26, 10, 18, 2, '1 bowl (200g)', false),
  f('Egg Curry', 'INDIAN_MEALS', 240, 16, 8, 16, 2, '1 bowl (2 eggs)', false),
  f('Fish Curry', 'INDIAN_MEALS', 220, 24, 8, 10, 1, '1 bowl (200g)', false),
  f('Mutton Curry', 'INDIAN_MEALS', 380, 26, 8, 28, 1, '1 bowl (200g)', false),
  f('Keema Matar', 'INDIAN_MEALS', 320, 24, 14, 20, 3, '1 bowl (200g)', false),
  f('Dal Fry', 'INDIAN_MEALS', 170, 9, 22, 5, 4, '1 bowl (200g)'),
  f('Moong Dal', 'INDIAN_MEALS', 150, 10, 22, 2, 4, '1 bowl (200g)'),
  f('Toor Dal', 'INDIAN_MEALS', 165, 9, 24, 3, 5, '1 bowl (200g)'),
  f('Raita (Boondi)', 'INDIAN_MEALS', 120, 5, 10, 6, 1, '1 bowl (150g)'),
  f('Cucumber Raita', 'INDIAN_MEALS', 80, 4, 6, 4, 1, '1 bowl (150g)'),
  f('Thepla', 'INDIAN_MEALS', 120, 3, 16, 5, 2, '1 thepla'),
  f('Dhokla', 'INDIAN_MEALS', 160, 6, 24, 4, 2, '4 pieces'),
  f('Khandvi', 'INDIAN_MEALS', 130, 5, 16, 5, 1, '6 pieces'),
  f('Pongal (Ven)', 'INDIAN_MEALS', 230, 6, 36, 7, 2, '1 bowl'),
  f('Uttapam', 'INDIAN_MEALS', 200, 5, 30, 6, 2, '1 uttapam'),
  f('Medu Vada', 'INDIAN_MEALS', 170, 6, 18, 8, 2, '2 pieces'),
  f('Paneer Tikka', 'INDIAN_MEALS', 280, 18, 8, 20, 2, '6 pieces'),

  // ══════════════════════════════════════════════
  // ── Protein Shakes & Supplements ──
  // ══════════════════════════════════════════════
  f('Whey Protein Shake (Water)', 'PROTEIN_SHAKES', 120, 24, 3, 1, 0, '1 scoop (30g)'),
  f('Whey Protein Shake (Milk)', 'PROTEIN_SHAKES', 250, 30, 15, 6, 0, '1 scoop + 250ml milk'),
  f('Casein Protein Shake', 'PROTEIN_SHAKES', 130, 26, 4, 1, 0, '1 scoop (33g)'),
  f('Mass Gainer Shake', 'PROTEIN_SHAKES', 650, 30, 110, 8, 3, '1 serving (150g)'),
  f('Plant Protein Shake', 'PROTEIN_SHAKES', 110, 20, 5, 2, 2, '1 scoop (30g)'),
  f('BCAA Drink', 'PROTEIN_SHAKES', 10, 2, 0, 0, 0, '1 serving (10g)'),
  f('Peanut Butter Protein Shake', 'PROTEIN_SHAKES', 350, 30, 20, 16, 3, '1 shake'),
  f('Banana Protein Smoothie', 'PROTEIN_SHAKES', 300, 28, 35, 5, 3, '1 glass (350ml)'),
  f('Oats Protein Shake', 'PROTEIN_SHAKES', 320, 30, 38, 6, 4, '1 glass'),
  f('Sattu Drink', 'PROTEIN_SHAKES', 180, 12, 28, 3, 4, '1 glass (40g sattu)'),
  f('Homemade Protein Shake (Egg)', 'PROTEIN_SHAKES', 280, 22, 30, 8, 2, '1 glass', false),

  // ══════════════════════════════════════════════
  // ── Fruits ──
  // ══════════════════════════════════════════════
  f('Apple', 'FRUITS', 95, 0.5, 25, 0.3, 4.4, '1 medium (182g)'),
  f('Banana', 'FRUITS', 105, 1.3, 27, 0.4, 3.1, '1 medium (118g)'),
  f('Mango', 'FRUITS', 100, 1.4, 25, 0.6, 2.6, '1 cup sliced (165g)'),
  f('Papaya', 'FRUITS', 62, 0.7, 16, 0.2, 2.5, '1 cup (145g)'),
  f('Guava', 'FRUITS', 68, 2.5, 14, 1, 5.4, '1 medium (100g)'),
  f('Orange', 'FRUITS', 62, 1.2, 15, 0.2, 3.1, '1 medium (131g)'),
  f('Watermelon', 'FRUITS', 46, 0.9, 12, 0.2, 0.6, '1 cup diced (152g)'),
  f('Grapes', 'FRUITS', 62, 0.6, 16, 0.3, 0.8, '1 cup (92g)'),
  f('Pomegranate', 'FRUITS', 83, 1.7, 19, 1.2, 4, '1/2 medium (100g)'),
  f('Pineapple', 'FRUITS', 82, 0.9, 22, 0.2, 2.3, '1 cup chunks (165g)'),
  f('Chikoo (Sapota)', 'FRUITS', 83, 0.4, 20, 1.1, 5.3, '1 medium (100g)'),
  f('Custard Apple', 'FRUITS', 94, 2.1, 24, 0.3, 4.4, '1 medium (100g)'),
  f('Lychee', 'FRUITS', 66, 0.8, 17, 0.4, 1.3, '10 pieces (100g)'),
  f('Kiwi', 'FRUITS', 42, 0.8, 10, 0.4, 2.1, '1 medium (69g)'),
  f('Strawberries', 'FRUITS', 49, 1, 12, 0.5, 3, '1 cup (152g)'),
  f('Blueberries', 'FRUITS', 84, 1.1, 21, 0.5, 3.6, '1 cup (148g)'),
  f('Jackfruit (Raw)', 'FRUITS', 95, 1.7, 23, 0.6, 1.5, '1 cup (100g)'),
  f('Coconut (Fresh)', 'FRUITS', 354, 3.3, 15, 33, 9, '1 cup grated (100g)'),
  f('Dates (Khajur)', 'FRUITS', 66, 0.4, 18, 0.1, 1.6, '2 dates (24g)'),
  f('Amla (Indian Gooseberry)', 'FRUITS', 44, 0.9, 10, 0.1, 3.4, '2 pieces (100g)'),

  // ══════════════════════════════════════════════
  // ── Vegetables ──
  // ══════════════════════════════════════════════
  f('Spinach (Palak)', 'VEGETABLES', 23, 2.9, 3.6, 0.4, 2.2, '1 cup cooked (180g)'),
  f('Broccoli', 'VEGETABLES', 55, 3.7, 11, 0.6, 5.1, '1 cup chopped (156g)'),
  f('Carrot', 'VEGETABLES', 41, 0.9, 10, 0.2, 2.8, '1 medium (100g)'),
  f('Cucumber', 'VEGETABLES', 16, 0.7, 3.6, 0.1, 0.5, '1 cup sliced (104g)'),
  f('Tomato', 'VEGETABLES', 22, 1.1, 4.8, 0.2, 1.5, '1 medium (123g)'),
  f('Onion', 'VEGETABLES', 44, 1.2, 10, 0.1, 1.4, '1 medium (110g)'),
  f('Capsicum (Bell Pepper)', 'VEGETABLES', 31, 1, 6, 0.3, 2.1, '1 medium (120g)'),
  f('Cauliflower (Gobi)', 'VEGETABLES', 25, 1.9, 5, 0.3, 2, '1 cup (100g)'),
  f('Potato', 'VEGETABLES', 161, 4.3, 37, 0.2, 3.8, '1 medium (213g)'),
  f('Sweet Potato', 'VEGETABLES', 103, 2.3, 24, 0.1, 3.8, '1 medium (130g)'),
  f('Bottle Gourd (Lauki)', 'VEGETABLES', 15, 0.6, 3.4, 0.1, 0.5, '1 cup (100g)'),
  f('Bitter Gourd (Karela)', 'VEGETABLES', 17, 1, 3.7, 0.2, 2.8, '1 cup (100g)'),
  f('Ridge Gourd (Turai)', 'VEGETABLES', 20, 1.2, 3.5, 0.3, 0.5, '1 cup (100g)'),
  f('Drumstick (Moringa)', 'VEGETABLES', 37, 2.1, 8.5, 0.2, 2, '1 cup (100g)'),
  f('Ladyfinger (Bhindi)', 'VEGETABLES', 33, 1.9, 7.5, 0.2, 3.2, '1 cup (100g)'),
  f('Beetroot', 'VEGETABLES', 43, 1.6, 10, 0.2, 2.8, '1 medium (100g)'),
  f('Peas (Matar)', 'VEGETABLES', 81, 5.4, 14, 0.4, 5.7, '1 cup (100g)'),
  f('Corn', 'VEGETABLES', 86, 3.3, 19, 1.4, 2.4, '1 medium ear (100g)'),
  f('Mushroom', 'VEGETABLES', 22, 3.1, 3.3, 0.3, 1, '1 cup (70g)'),
  f('Cabbage (Patta Gobi)', 'VEGETABLES', 22, 1.3, 5.2, 0.1, 2.5, '1 cup shredded (89g)'),

  // ══════════════════════════════════════════════
  // ── Snacks ──
  // ══════════════════════════════════════════════
  f('Peanuts (Roasted)', 'SNACKS', 170, 7, 5, 14, 2.4, '1/4 cup (28g)'),
  f('Almonds', 'SNACKS', 164, 6, 6, 14, 3.5, '23 almonds (28g)'),
  f('Cashews', 'SNACKS', 157, 5, 9, 12, 0.9, '18 cashews (28g)'),
  f('Walnuts', 'SNACKS', 185, 4.3, 3.9, 18, 1.9, '14 halves (28g)'),
  f('Mixed Dry Fruits', 'SNACKS', 175, 5, 8, 14, 2, '1/4 cup (30g)'),
  f('Makhana (Fox Nuts)', 'SNACKS', 100, 3.6, 18, 0.5, 1.4, '1 cup (30g)'),
  f('Chana Jor Garam', 'SNACKS', 140, 8, 20, 3, 4, '1/4 cup (30g)'),
  f('Roasted Chana', 'SNACKS', 120, 7, 18, 2, 5, '1/4 cup (30g)'),
  f('Murmura (Puffed Rice)', 'SNACKS', 110, 2, 25, 0.3, 0.5, '1 cup (30g)'),
  f('Bhel Puri', 'SNACKS', 200, 4, 32, 6, 2, '1 bowl (100g)'),
  f('Sev Puri', 'SNACKS', 250, 4, 28, 14, 2, '6 pieces'),
  f('Pani Puri', 'SNACKS', 180, 3, 28, 6, 2, '8 pieces'),
  f('Khakhra', 'SNACKS', 110, 3, 16, 4, 2, '2 pieces (30g)'),
  f('Mathri', 'SNACKS', 130, 2, 14, 7, 1, '2 pieces'),
  f('Namkeen Mix', 'SNACKS', 160, 4, 16, 9, 2, '1/4 cup (30g)'),
  f('Protein Bar', 'SNACKS', 200, 20, 22, 6, 3, '1 bar (60g)'),
  f('Granola Bar', 'SNACKS', 140, 3, 24, 4, 2, '1 bar (35g)'),
  f('Dark Chocolate (70%)', 'SNACKS', 170, 2, 13, 12, 3, '30g'),
  f('Biscuits (Parle-G)', 'SNACKS', 130, 2, 22, 4, 0.5, '4 biscuits'),
  f('Rusk', 'SNACKS', 90, 2, 16, 2, 0.5, '2 pieces'),

  // ══════════════════════════════════════════════
  // ── Dairy ──
  // ══════════════════════════════════════════════
  f('Milk (Full Cream)', 'DAIRY', 150, 8, 12, 8, 0, '1 glass (250ml)'),
  f('Milk (Toned)', 'DAIRY', 120, 8, 12, 5, 0, '1 glass (250ml)'),
  f('Milk (Skimmed)', 'DAIRY', 83, 8, 12, 0.2, 0, '1 glass (250ml)'),
  f('Curd / Yogurt', 'DAIRY', 98, 5, 8, 5, 0, '1 bowl (200g)'),
  f('Greek Yogurt', 'DAIRY', 130, 12, 8, 5, 0, '1 cup (170g)'),
  f('Paneer', 'DAIRY', 265, 18, 4, 20, 0, '100g'),
  f('Cottage Cheese (Low Fat)', 'DAIRY', 163, 28, 6, 2, 0, '1 cup (226g)'),
  f('Buttermilk (Chaas)', 'DAIRY', 40, 2, 5, 1, 0, '1 glass (250ml)'),
  f('Lassi (Sweet)', 'DAIRY', 180, 6, 28, 5, 0, '1 glass (300ml)'),
  f('Lassi (Salted)', 'DAIRY', 100, 5, 8, 5, 0, '1 glass (300ml)'),
  f('Cheese Slice', 'DAIRY', 70, 4, 1, 5.5, 0, '1 slice (20g)'),
  f('Ghee', 'DAIRY', 112, 0, 0, 12.7, 0, '1 tbsp (14g)'),
  f('Butter', 'DAIRY', 102, 0.1, 0, 11.5, 0, '1 tbsp (14g)'),
  f('Kheer', 'DAIRY', 220, 6, 34, 7, 0.5, '1 bowl (150g)'),
  f('Shrikhand', 'DAIRY', 260, 8, 40, 8, 0, '1 bowl (150g)'),

  // ══════════════════════════════════════════════
  // ── Grains & Bread ──
  // ══════════════════════════════════════════════
  f('Oats (Cooked)', 'GRAINS', 150, 5, 27, 3, 4, '1 bowl (175g)'),
  f('Muesli', 'GRAINS', 200, 6, 36, 4, 4, '1/2 cup (50g)'),
  f('Corn Flakes', 'GRAINS', 140, 2, 32, 0.3, 1, '1 cup (30g) + milk'),
  f('Brown Bread', 'GRAINS', 70, 3, 13, 1, 2, '1 slice (30g)'),
  f('White Bread', 'GRAINS', 66, 2, 13, 0.8, 0.6, '1 slice (25g)'),
  f('Multigrain Bread', 'GRAINS', 75, 4, 12, 1.5, 2, '1 slice (30g)'),
  f('Daliya (Broken Wheat)', 'GRAINS', 160, 5, 30, 2, 4, '1 bowl (200g)'),
  f('Ragi Roti', 'GRAINS', 110, 3, 22, 1.5, 4, '1 roti'),
  f('Jowar Roti', 'GRAINS', 115, 4, 24, 1, 3, '1 roti'),
  f('Bajra Roti', 'GRAINS', 120, 3, 22, 2, 3, '1 roti'),
  f('Quinoa (Cooked)', 'GRAINS', 222, 8, 39, 3.5, 5, '1 cup (185g)'),
  f('Vermicelli (Sevai)', 'GRAINS', 200, 4, 38, 3, 1, '1 bowl (200g)'),

  // ══════════════════════════════════════════════
  // ── Non-Veg (Meats & Eggs) ──
  // ══════════════════════════════════════════════
  f('Boiled Egg', 'NON_VEG', 78, 6, 0.6, 5, 0, '1 large', false),
  f('Egg Omelette (2 eggs)', 'NON_VEG', 190, 13, 1, 15, 0, '2 eggs', false),
  f('Egg Bhurji', 'NON_VEG', 220, 14, 4, 16, 0.5, '2 eggs', false),
  f('Chicken Breast (Grilled)', 'NON_VEG', 165, 31, 0, 3.6, 0, '100g', false),
  f('Chicken Thigh', 'NON_VEG', 209, 26, 0, 11, 0, '100g', false),
  f('Chicken Seekh Kebab', 'NON_VEG', 180, 20, 4, 9, 1, '2 kebabs', false),
  f('Chicken Momos', 'NON_VEG', 230, 14, 26, 8, 1, '8 pieces', false),
  f('Chicken Shawarma', 'NON_VEG', 350, 22, 34, 14, 2, '1 wrap', false),
  f('Fish (Rohu) Fry', 'NON_VEG', 180, 22, 6, 8, 0, '1 piece (100g)', false),
  f('Fish Tikka', 'NON_VEG', 160, 24, 4, 5, 1, '4 pieces', false),
  f('Prawns (Jhinga) Curry', 'NON_VEG', 200, 22, 6, 10, 1, '1 bowl (150g)', false),
  f('Mutton (Leg) Cooked', 'NON_VEG', 250, 26, 0, 16, 0, '100g', false),
  f('Mutton Seekh Kebab', 'NON_VEG', 220, 18, 4, 14, 1, '2 kebabs', false),
  f('Keema (Minced Mutton)', 'NON_VEG', 280, 22, 2, 20, 0, '100g', false),
  f('Liver (Kaleji)', 'NON_VEG', 135, 21, 4, 4, 0, '100g', false),

  // ══════════════════════════════════════════════
  // ── Beverages ──
  // ══════════════════════════════════════════════
  f('Chai (Milk Tea)', 'BEVERAGES', 80, 2, 10, 3, 0, '1 cup (200ml)'),
  f('Black Tea', 'BEVERAGES', 2, 0, 0.5, 0, 0, '1 cup (200ml)'),
  f('Green Tea', 'BEVERAGES', 2, 0, 0.5, 0, 0, '1 cup (200ml)'),
  f('Black Coffee', 'BEVERAGES', 5, 0.3, 0, 0, 0, '1 cup (200ml)'),
  f('Coffee (with Milk & Sugar)', 'BEVERAGES', 80, 2, 12, 3, 0, '1 cup (200ml)'),
  f('Filter Coffee (South Indian)', 'BEVERAGES', 100, 3, 10, 5, 0, '1 cup (200ml)'),
  f('Nimbu Pani (Lemonade)', 'BEVERAGES', 60, 0.2, 16, 0, 0, '1 glass (250ml)'),
  f('Coconut Water', 'BEVERAGES', 46, 1.7, 9, 0.5, 2.6, '1 glass (240ml)'),
  f('Sugarcane Juice', 'BEVERAGES', 180, 0.4, 44, 0, 0, '1 glass (300ml)'),
  f('Mango Shake', 'BEVERAGES', 220, 5, 40, 5, 2, '1 glass (300ml)'),
  f('Banana Shake', 'BEVERAGES', 200, 6, 32, 5, 2, '1 glass (300ml)'),
  f('Jaljeera', 'BEVERAGES', 30, 0.5, 7, 0.2, 0.5, '1 glass (200ml)'),
  f('Aam Panna', 'BEVERAGES', 70, 0.5, 18, 0.1, 0.5, '1 glass (200ml)'),
];
