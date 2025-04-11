import React from "react";
import { motion } from "framer-motion";

export const SessionHeader: React.FC = () => {
  return (
    <motion.div
      className="mb-6 max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-semibold tracking-tight">
        Welcome to your session
      </h2>
      <p className="text-muted-foreground mt-1">
        Say <span className="font-semibold">"Hey Sully"</span> clearly to begin
        your interpreter session. Make sure your microphone is enabled and speak
        at a normal volume.
      </p>
    </motion.div>
  );
};
