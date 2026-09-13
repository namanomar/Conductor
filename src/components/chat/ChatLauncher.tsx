"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, X } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

export function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-foreground text-background shadow-2xl"
        title="Conductor assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </motion.button>

      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
