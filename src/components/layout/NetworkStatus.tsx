import React from 'react';
import { useNetwork } from 'react-use';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
export function NetworkStatus() {
  const networkState = useNetwork();
  const isOffline = !networkState.online;
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm pointer-events-auto">
            <WifiOff className="w-4 h-4" />
            <span>No Internet Connection. Reconnecting...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}