import { Variants } from 'framer-motion';

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.1
    }
  }
};

export const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

export const glitchVariants: Variants = {
  hidden: { opacity: 1, skewX: 0 },
  visible: {
    opacity: [1, 0.8, 1, 0.9, 1],
    skewX: [0, 5, -5, 2, 0],
    x: [0, -2, 2, -1, 0],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
      times: [0, 0.2, 0.4, 0.6, 1]
    }
  }
};

export const borderGlowVariants: Variants = {
  initial: { boxShadow: "0 0 0px rgba(0, 210, 255, 0)" },
  hover: { 
    boxShadow: "0 0 15px rgba(0, 210, 255, 0.5)",
    borderColor: "#00d2ff",
    transition: { duration: 0.3 }
  }
};