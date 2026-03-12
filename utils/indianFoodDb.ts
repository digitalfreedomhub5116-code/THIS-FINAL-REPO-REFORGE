
import { FoodItem } from '../types';

// Helper to create IDs
const id = (prefix: string, idx: number) => `${prefix}_${idx}`;

export const INDIAN_FOOD_DB: FoodItem[] = [
    // --- PUNJAB / NORTH ---
    { id: id('pb', 1), name: 'Butter Chicken (1 bowl)', calories: 450, protein: 25, carbs: 12, fats: 35, servingSize: '1 bowl', region: 'Punjab' },
    { id: id('pb', 2), name: 'Sarson Da Saag', calories: 280, protein: 8, carbs: 15, fats: 22, servingSize: '1 bowl', region: 'Punjab' },
    { id: id('pb', 3), name: 'Makki Di Roti', calories: 180, protein: 4, carbs: 28, fats: 6, servingSize: '1 roti', region: 'Punjab' },
    { id: id('pb', 4), name: 'Chole Bhature (2 pcs)', calories: 650, protein: 18, carbs: 75, fats: 30, servingSize: '1 plate', region: 'Punjab' },
    { id: id('pb', 5), name: 'Rajma Chawal', calories: 350, protein: 12, carbs: 55, fats: 8, servingSize: '1 bowl', region: 'Punjab' },
    { id: id('pb', 6), name: 'Aloo Paratha', calories: 290, protein: 6, carbs: 40, fats: 12, servingSize: '1 pc', region: 'Punjab' },
    { id: id('pb', 7), name: 'Paneer Tikka (6 pcs)', calories: 280, protein: 22, carbs: 5, fats: 18, servingSize: '1 plate', region: 'Punjab' },
    { id: id('pb', 8), name: 'Dal Makhani', calories: 380, protein: 14, carbs: 25, fats: 24, servingSize: '1 bowl', region: 'Punjab' },
    { id: id('pb', 9), name: 'Lassi (Sweet)', calories: 250, protein: 8, carbs: 35, fats: 10, servingSize: '1 glass', region: 'Punjab' },
    { id: id('pb', 10), name: 'Amritsari Kulcha', calories: 320, protein: 9, carbs: 50, fats: 10, servingSize: '1 pc', region: 'Punjab' },

    // --- SOUTH INDIA ---
    { id: id('si', 1), name: 'Idli (2 pcs)', calories: 120, protein: 4, carbs: 24, fats: 1, servingSize: '2 pcs', region: 'South' },
    { id: id('si', 2), name: 'Masala Dosa', calories: 350, protein: 6, carbs: 45, fats: 14, servingSize: '1 pc', region: 'South' },
    { id: id('si', 3), name: 'Sambar', calories: 130, protein: 6, carbs: 18, fats: 4, servingSize: '1 bowl', region: 'South' },
    { id: id('si', 4), name: 'Vada (Medhu)', calories: 180, protein: 4, carbs: 15, fats: 12, servingSize: '1 pc', region: 'South' },
    { id: id('si', 5), name: 'Uttapam', calories: 220, protein: 5, carbs: 35, fats: 8, servingSize: '1 pc', region: 'South' },
    { id: id('si', 6), name: 'Chicken Chettinad', calories: 320, protein: 28, carbs: 8, fats: 20, servingSize: '1 bowl', region: 'South' },
    { id: id('si', 7), name: 'Hyderabadi Biryani (Chicken)', calories: 550, protein: 25, carbs: 65, fats: 22, servingSize: '1 plate', region: 'South' },
    { id: id('si', 8), name: 'Curd Rice', calories: 280, protein: 8, carbs: 40, fats: 10, servingSize: '1 bowl', region: 'South' },
    { id: id('si', 9), name: 'Rasam', calories: 60, protein: 1, carbs: 12, fats: 1, servingSize: '1 bowl', region: 'South' },
    { id: id('si', 10), name: 'Appam & Stew', calories: 300, protein: 6, carbs: 45, fats: 12, servingSize: '1 plate', region: 'South' },

    // --- MAHARASHTRA / WEST ---
    { id: id('mh', 1), name: 'Vada Pav', calories: 280, protein: 6, carbs: 35, fats: 14, servingSize: '1 pc', region: 'West' },
    { id: id('mh', 2), name: 'Pav Bhaji', calories: 400, protein: 10, carbs: 55, fats: 18, servingSize: '1 plate', region: 'West' },
    { id: id('mh', 3), name: 'Pohan', calories: 250, protein: 4, carbs: 45, fats: 7, servingSize: '1 bowl', region: 'West' },
    { id: id('mh', 4), name: 'Misal Pav', calories: 450, protein: 15, carbs: 50, fats: 22, servingSize: '1 plate', region: 'West' },
    { id: id('mh', 5), name: 'Thalipeeth', calories: 200, protein: 6, carbs: 30, fats: 8, servingSize: '1 pc', region: 'West' },
    { id: id('mh', 6), name: 'Sabudana Khichdi', calories: 350, protein: 2, carbs: 60, fats: 12, servingSize: '1 bowl', region: 'West' },
    { id: id('mh', 7), name: 'Dhokla (3 pcs)', calories: 160, protein: 6, carbs: 25, fats: 5, servingSize: '3 pcs', region: 'West' },
    { id: id('mh', 8), name: 'Thepla', calories: 120, protein: 3, carbs: 18, fats: 5, servingSize: '1 pc', region: 'West' },
    { id: id('mh', 9), name: 'Modak (Steamed)', calories: 150, protein: 2, carbs: 25, fats: 5, servingSize: '1 pc', region: 'West' },
    { id: id('mh', 10), name: 'Bombil Fry (Fish)', calories: 220, protein: 20, carbs: 5, fats: 14, servingSize: '2 pcs', region: 'West' },

    // --- EAST / BENGAL ---
    { id: id('wb', 1), name: 'Machher Jhol (Fish Curry)', calories: 250, protein: 22, carbs: 6, fats: 15, servingSize: '1 bowl', region: 'East' },
    { id: id('wb', 2), name: 'Rosogolla (1 pc)', calories: 140, protein: 3, carbs: 28, fats: 2, servingSize: '1 pc', region: 'East' },
    { id: id('wb', 3), name: 'Luchi & Alur Dom', calories: 450, protein: 8, carbs: 55, fats: 24, servingSize: '1 plate', region: 'East' },
    { id: id('wb', 4), name: 'Mutton Kosha', calories: 550, protein: 30, carbs: 10, fats: 40, servingSize: '1 bowl', region: 'East' },
    { id: id('wb', 5), name: 'Shukto', calories: 180, protein: 5, carbs: 25, fats: 8, servingSize: '1 bowl', region: 'East' },
    { id: id('wb', 6), name: 'Momos (Steamed Chicken)', calories: 250, protein: 12, carbs: 35, fats: 6, servingSize: '6 pcs', region: 'East' },
    { id: id('wb', 7), name: 'Chingri Malai Curry', calories: 380, protein: 20, carbs: 12, fats: 28, servingSize: '1 bowl', region: 'East' },
    { id: id('wb', 8), name: 'Mishti Doi', calories: 220, protein: 6, carbs: 30, fats: 9, servingSize: '1 cup', region: 'East' },

    // --- STAPLES ---
    { id: id('st', 1), name: 'Roti / Chapati', calories: 100, protein: 3, carbs: 18, fats: 2, servingSize: '1 pc', region: 'Common' },
    { id: id('st', 2), name: 'White Rice (Cooked)', calories: 130, protein: 2, carbs: 28, fats: 0, servingSize: '1 small bowl', region: 'Common' },
    { id: id('st', 3), name: 'Brown Rice', calories: 110, protein: 3, carbs: 23, fats: 1, servingSize: '1 small bowl', region: 'Common' },
    { id: id('st', 4), name: 'Dal Tadka', calories: 180, protein: 10, carbs: 22, fats: 7, servingSize: '1 bowl', region: 'Common' },
    { id: id('st', 5), name: 'Boiled Egg', calories: 70, protein: 6, carbs: 1, fats: 5, servingSize: '1 pc', region: 'Common' },
    { id: id('st', 6), name: 'Chicken Breast (Grilled)', calories: 165, protein: 31, carbs: 0, fats: 3.6, servingSize: '100g', region: 'Common' },
    { id: id('st', 7), name: 'Paneer (Raw)', calories: 265, protein: 18, carbs: 1, fats: 20, servingSize: '100g', region: 'Common' },
    { id: id('st', 8), name: 'Curd / Yogurt', calories: 100, protein: 4, carbs: 5, fats: 6, servingSize: '1 bowl', region: 'Common' },
    { id: id('st', 9), name: 'Banana', calories: 105, protein: 1, carbs: 27, fats: 0, servingSize: '1 pc', region: 'Common' },
    { id: id('st', 10), name: 'Apple', calories: 95, protein: 0, carbs: 25, fats: 0, servingSize: '1 pc', region: 'Common' },
    { id: id('st', 11), name: 'Tea (With Milk & Sugar)', calories: 80, protein: 2, carbs: 10, fats: 3, servingSize: '1 cup', region: 'Common' },
    { id: id('st', 12), name: 'Coffee (Black)', calories: 2, protein: 0, carbs: 0, fats: 0, servingSize: '1 cup', region: 'Common' },
];
