import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";

interface SplitScreenLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplitScreenLoader({ onComplete, duration = 2000 }: SplitScreenLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <Box
          component={motion.div}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            pointerEvents: "none",
          }}
        >
          {/* Left Panel */}
          <Box
            component={motion.div}
            initial={{ x: 0 }}
            animate={{ x: "-100%" }}
            transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
            sx={{
              flex: 1,
              bgcolor: "#1A4A3A",
              height: "100%",
            }}
          />
          
          {/* Right Panel */}
          <Box
            component={motion.div}
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
            sx={{
              flex: 1,
              bgcolor: "#8FA998",
              height: "100%",
            }}
          />
        </Box>
      )}
    </AnimatePresence>
  );
}
