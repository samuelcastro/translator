"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { TextInputProps } from "@/types";

export function TextInput({
  onSubmit,
  disabled = false,
  placeholder = "Type a message...",
}: TextInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        className="flex-1"
      />
      <Button type="submit" disabled={disabled || !text.trim()} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
