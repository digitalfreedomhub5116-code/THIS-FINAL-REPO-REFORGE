import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Gamepad2, Pizza, Tv, Moon, Users, Star, Lock, Trash2 } from 'lucide-react';
import { ShopItem } from '../types';

interface ShopItemCardProps {
  item: ShopItem;
  currentGold: number;
  onPurchase: (item: ShopItem) => void;
  onRemove: (id: string) => void;
}

// Icon mapper
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'gamepad': return <Gamepad2 size={24} />;
    case 'pizza': return <Pizza size={24} />;
    case 'tv': return <Tv size={24} />;
    case 'moon': return <Moon size={24} />;
    case 'users': return <Users size={24} />;
    case 'shopping-bag': return <ShoppingBag size={24} />;
    default: return <Star size={24} />;
  }
};

const ShopItemCard: React.FC<ShopItemCardProps> = ({ item, currentGold, onPurchase, onRemove }) => {
  const canAfford = currentGold >= item.cost;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group bg-system-card border ${canAfford ? 'border-system-warning/30' : 'border-system-border'} p-5 rounded-lg overflow-hidden flex flex-col justify-between h-full hover:border-system-warning transition-colors`}
    >
      {/* Background Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br from-system-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
           <div className={`p-3 rounded-lg ${canAfford ? 'bg-system-warning/10 text-system-warning' : 'bg-gray-900 text-gray-600'}`}>
              {getIcon(item.icon)}
           </div>
           
           <div className="flex flex-col items-end gap-2">
               {/* Delete Button */}
               <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                  }}
                  className="text-gray-700 hover:text-system-danger transition-colors p-1"
                  title="Remove Item"
               >
                   <Trash2 size={14} />
               </button>

               <span className={`font-mono font-bold text-lg ${canAfford ? 'text-system-warning' : 'text-gray-500'}`}>
                 {item.cost} G
               </span>
           </div>
        </div>

        <h3 className="font-bold text-gray-200 text-lg mb-2 font-mono">{item.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">{item.description}</p>
      </div>

      <button 
        onClick={() => onPurchase(item)}
        disabled={!canAfford}
        className={`relative z-10 w-full py-2 px-4 rounded font-mono text-xs font-bold tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-95
          ${canAfford 
            ? 'bg-system-warning text-black hover:bg-white hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
            : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
          }`}
      >
        {canAfford ? (
          'EXCHANGE'
        ) : (
          <>
            <Lock size={12} /> LOCKED
          </>
        )}
      </button>
    </motion.div>
  );
};

export default ShopItemCard;