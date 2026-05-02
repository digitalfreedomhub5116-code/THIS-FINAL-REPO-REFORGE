import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, ChevronLeft, Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react';
import { FOOD_DATABASE, FOOD_CATEGORIES, FoodCategory, FoodDBItem } from '../lib/foodDatabase';
import { MealLog, MealType } from '../types';

interface FoodLibraryProps {
  onClose: () => void;
  onLogFood: (meal: MealLog) => void;
  selectedMealType: MealType;
}

const FoodLibrary: React.FC<FoodLibraryProps> = ({ onClose, onLogFood, selectedMealType }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<FoodCategory | 'ALL'>('ALL');
  const [selectedItem, setSelectedItem] = useState<FoodDBItem | null>(null);
  const [servings, setServings] = useState(1);

  const filtered = useMemo(() => {
    let items = FOOD_DATABASE;
    if (activeCategory !== 'ALL') {
      items = items.filter(i => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [search, activeCategory]);

  const logItem = (item: FoodDBItem, qty: number) => {
    const meal: MealLog = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: qty > 1 ? `${item.name} x${qty}` : item.name,
      items: [{
        id: item.id,
        name: item.name,
        calories: Math.round(item.calories * qty),
        protein: Math.round(item.protein * qty),
        carbs: Math.round(item.carbs * qty),
        fats: Math.round(item.fats * qty),
        servingSize: item.servingSize,
        fiber: item.fiber ? Math.round(item.fiber * qty) : undefined,
        quantity: qty,
      }],
      totalCalories: Math.round(item.calories * qty),
      totalProtein: Math.round(item.protein * qty),
      totalCarbs: Math.round(item.carbs * qty),
      totalFats: Math.round(item.fats * qty),
      timestamp: Date.now(),
      mealType: selectedMealType,
    };
    onLogFood(meal);
    setSelectedItem(null);
    setServings(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] bg-black/95 flex flex-col font-mono"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-black text-white tracking-widest">FOOD LIBRARY</h2>
          <div className="text-[9px] text-gray-500 tracking-widest uppercase">
            Logging as {selectedMealType.charAt(0) + selectedMealType.slice(1).toLowerCase()}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search food items..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-1 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 min-w-max">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest border transition-all whitespace-nowrap ${
              activeCategory === 'ALL'
                ? 'border-[#00d4ff]/50 bg-[#00d4ff]/10 text-[#00d4ff]'
                : 'border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            🍽️ ALL
          </button>
          {FOOD_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest border transition-all whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'border-[#00d4ff]/50 bg-[#00d4ff]/10 text-[#00d4ff]'
                  : 'border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {cat.emoji} {cat.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-1">
        <div className="text-[9px] text-gray-600 tracking-widest">{filtered.length} ITEMS</div>
      </div>

      {/* Food List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="space-y-1.5">
          {filtered.map(item => (
            <motion.button
              key={item.id}
              onClick={() => { setSelectedItem(item); setServings(1); }}
              className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-3 py-2.5 transition-all group"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{item.name}</span>
                    {item.isVeg && <Leaf size={10} className="text-green-500 flex-shrink-0" />}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{item.servingSize}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-white">{item.calories}</div>
                    <div className="text-[8px] text-gray-600">KCAL</div>
                  </div>
                  <div className="flex gap-2 text-[8px]">
                    <span className="text-blue-400 font-bold">P{item.protein}</span>
                    <span className="text-green-400 font-bold">C{item.carbs}</span>
                    <span className="text-yellow-400 font-bold">F{item.fats}</span>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-600 text-sm">No items found</div>
              <div className="text-gray-700 text-[10px] mt-1">Try a different search term</div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] bg-black/80 flex items-end justify-center"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#0a0a14] border-t border-white/10 rounded-t-3xl p-5 pb-24 space-y-4"
            >
              {/* Item Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedItem.name}</h3>
                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                    {selectedItem.servingSize}
                    {selectedItem.isVeg && <span className="text-green-500 flex items-center gap-0.5"><Leaf size={10} /> Veg</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Macros for selected servings */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-500" />
                    <span className="text-xs font-bold text-gray-400 tracking-widest">TOTAL</span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {Math.round(selectedItem.calories * servings)} <span className="text-xs font-normal text-gray-500">KCAL</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-black/30 rounded-lg">
                    <div className="text-[9px] text-blue-400 font-bold flex items-center justify-center gap-1"><Beef size={9} /> PRO</div>
                    <div className="text-sm font-black text-white">{Math.round(selectedItem.protein * servings)}g</div>
                  </div>
                  <div className="text-center p-2 bg-black/30 rounded-lg">
                    <div className="text-[9px] text-green-400 font-bold flex items-center justify-center gap-1"><Wheat size={9} /> CARB</div>
                    <div className="text-sm font-black text-white">{Math.round(selectedItem.carbs * servings)}g</div>
                  </div>
                  <div className="text-center p-2 bg-black/30 rounded-lg">
                    <div className="text-[9px] text-yellow-400 font-bold flex items-center justify-center gap-1"><Droplets size={9} /> FAT</div>
                    <div className="text-sm font-black text-white">{Math.round(selectedItem.fats * servings)}g</div>
                  </div>
                </div>
                {selectedItem.fiber > 0 && (
                  <div className="mt-2 text-center text-[9px] text-[#00d4ff]">Fiber: {Math.round(selectedItem.fiber * servings)}g</div>
                )}
              </div>

              {/* Serving Selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 tracking-widest">SERVINGS</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setServings(s => Math.max(0.5, s - 0.5))}
                    className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xl font-black text-white w-12 text-center">{servings}</span>
                  <button
                    onClick={() => setServings(s => Math.min(10, s + 0.5))}
                    className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Log Button */}
              <button
                onClick={() => logItem(selectedItem, servings)}
                className="w-full py-3.5 rounded-xl bg-[#00d4ff] text-black font-black text-sm tracking-widest hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,212,255,0.3)] flex items-center justify-center gap-2"
              >
                <Plus size={16} /> LOG {Math.round(selectedItem.calories * servings)} KCAL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FoodLibrary;
