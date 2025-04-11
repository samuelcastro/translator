"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseWakeWordDetectionProps {
  wakeWord: string;
  onWakeWordDetected: () => void;
  enabled: boolean;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
  error?: string;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

/**
 * Hook to detect a wake word using the browser's SpeechRecognition API
 */
export default function useWakeWordDetection({
  wakeWord,
  onWakeWordDetected,
  enabled = true,
}: UseWakeWordDetectionProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<
    boolean | null
  >(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const lastTranscriptRef = useRef("");
  const recognitionStartTimeRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);

  // To reduce UI flashing, maintain listening state for some time even after recognition ends
  const maintainListeningStateRef = useRef<boolean>(false);

  // Check for microphone permissions
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // If we get here, permission was granted
      stream.getTracks().forEach((track) => track.stop()); // Clean up
      setHasMicrophonePermission(true);
      return true;
    } catch (err) {
      console.error("Microphone permission error:", err);
      setHasMicrophonePermission(false);
      setError("Microphone access is required for wake word detection.");
      return false;
    }
  }, []);

  // Clear any existing restart timeout
  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  // Stop current recognition instance
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
  };

  // Simple Levenshtein distance implementation for fuzzy matching
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  };

  // Process a transcript for wake word detection
  const processTranscript = (transcript: string, lang: string) => {
    // If we're already starting a session, ignore further wake word detections
    if (isStartingRef.current) {
      console.log("Ignoring transcript while session is starting");
      return false;
    }

    // Combine with previous transcript for better phrase detection
    const combinedTranscript = `${lastTranscriptRef.current} ${transcript}`
      .toLowerCase()
      .trim();

    // Keep only last 5 words to avoid too much noise
    const words = combinedTranscript.split(/\s+/);
    const limitedTranscript = words.slice(-5).join(" ");

    lastTranscriptRef.current = transcript;

    // Avoid logging too frequently
    const now = Date.now();
    if (now - recognitionStartTimeRef.current > 2000) {
      console.log(`Heard (${lang}):`, transcript);
      console.log(`Combined: "${limitedTranscript}"`);
    }

    // Check for exact wake word variations (case insensitive)
    const exactWakeWords = [
      wakeWord.toLowerCase(),
      "hey sully",
      "heys ully",
      "ey sully",
      "oye sully",
      "sully",
      "sullivan",
    ];

    // Fuzzy matches - these are common misrecognitions
    const fuzzyWakeWords = [
      "hey sally",
      "hey soul",
      "hey souly",
      "hey solley",
      "hey sulley",
      "heyso lee",
      "hay sully",
      "hey silly",
      "hey solely",
      "a sully",
      "hey slowly",
      "hi sully",
    ];

    // Combined list of all potential matches
    const allWakeWords = [...exactWakeWords, ...fuzzyWakeWords];

    // Set flag to block additional detections
    const triggerWakeWord = () => {
      // Set flag to prevent multiple activations
      isStartingRef.current = true;
      // Immediately stop recognition to prevent additional processing
      stopRecognition();
      clearRestartTimeout();
      // Call wake word handler
      onWakeWordDetected();
      return true;
    };

    // Check for exact matches
    for (const phrase of allWakeWords) {
      if (limitedTranscript.includes(phrase)) {
        console.log(
          `Wake word detected: "${phrase}" in "${limitedTranscript}"`
        );
        return triggerWakeWord();
      }
    }

    // Additional heuristic matches
    if (
      // Check for "hey" + something close to "sully"
      (limitedTranscript.includes("hey") ||
        limitedTranscript.includes("hi") ||
        limitedTranscript.includes("hay")) &&
      (limitedTranscript.includes("sul") ||
        limitedTranscript.includes("sull") ||
        limitedTranscript.includes("sol") ||
        limitedTranscript.includes("soll") ||
        limitedTranscript.includes("sal") ||
        limitedTranscript.match(/\bs\w{1,3}(y|i|ee|ey)/)) // Match short words starting with s and ending with y, i, ee, ey
    ) {
      console.log(`Fuzzy wake word match detected in: "${limitedTranscript}"`);
      return triggerWakeWord();
    }

    // Last resort: check for anything close to "hey sully" with Levenshtein distance
    // Split transcript into potential word pairs
    const targetPhrase = "hey sully";
    const wordPairs = [];
    for (let i = 0; i < words.length - 1; i++) {
      wordPairs.push(`${words[i]} ${words[i + 1]}`);
    }

    for (const pair of wordPairs) {
      const distance = levenshteinDistance(pair, targetPhrase);
      // Allow distance up to 3 (quite lenient but prevents false positives)
      if (distance <= 3) {
        console.log(`Levenshtein match: "${pair}" (distance: ${distance})`);
        return triggerWakeWord();
      }
    }

    return false;
  };

  // Initialize speech recognition
  const startListening = useCallback(async () => {
    if (!enabled) return;

    // Already listening or in the process of starting, don't start again
    if (isStartingRef.current || recognitionRef.current) return;

    // Set starting flag to prevent concurrent starts
    isStartingRef.current = true;

    // Clear any pending restart
    clearRestartTimeout();

    // Check microphone permissions first if we haven't yet
    if (hasMicrophonePermission === null) {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        // Try again after a delay
        const delay = 5000; // 5 seconds
        isStartingRef.current = false;
        clearRestartTimeout();
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, delay);
        return;
      }
    } else if (hasMicrophonePermission === false) {
      isStartingRef.current = false;
      setError("Microphone access is required for wake word detection.");
      return;
    }

    // Check browser compatibility
    if (
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      isStartingRef.current = false;
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      // Try to recognize wake word in multiple languages
      const startRecognition = (lang: string) => {
        // For visual consistency, show listening state immediately
        setIsListening(true);

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        // Set shorter speech segments for more responsive detection
        if ("maxAlternatives" in recognition) {
          recognition.maxAlternatives = 3; // Get alternative transcriptions
        }
        recognition.lang = lang;

        recognition.onstart = () => {
          // Limit the frequency of these logs to reduce console noise
          const now = Date.now();
          if (now - recognitionStartTimeRef.current > 5000) {
            console.log(`Recognition started (${lang})`);
          }

          setIsListening(true);
          setError(null);
          consecutiveErrorsRef.current = 0;
          lastTranscriptRef.current = ""; // Reset last transcript
          recognitionStartTimeRef.current = now;
          isStartingRef.current = false;
          maintainListeningStateRef.current = true;
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Handle different error types
          if (event.error === "no-speech") {
            // Don't log no-speech errors, they're normal
            // No-speech is normal when waiting, don't count as error
          } else if (event.error !== "aborted") {
            // Limit logging frequency to avoid console spam
            const now = Date.now();
            if (now - recognitionStartTimeRef.current > 5000) {
              console.error(`Speech recognition error (${lang}):`, event.error);
            }

            if (!isListening && !maintainListeningStateRef.current) {
              // Only set error if we're not in a listening or transition state
              setError(`Speech recognition error: ${event.error}`);
            }

            if (event.error === "network") {
              // Network errors might be temporary
              consecutiveErrorsRef.current += 0.5;
            } else {
              consecutiveErrorsRef.current++;
            }
          }
        };

        recognition.onend = () => {
          console.log(`Recognition ended (${lang})`);
          isStartingRef.current = false;
          recognitionRef.current = null;

          // Only set listening to false if we've been running for some time
          // This prevents UI flashing when recognition restarts quickly
          const recognitionDuration =
            Date.now() - recognitionStartTimeRef.current;

          if (recognitionDuration > 1000) {
            // Only change visual state if we've been listening for a while
            // Keep the listening state true for a short time to prevent UI flashing
            setTimeout(() => {
              if (!isStartingRef.current) {
                maintainListeningStateRef.current = false;
                setIsListening(false);
              }
            }, 500);
          } else {
            // Very short recognition - probably a browser quirk
            // Don't change the UI state to avoid flashing
          }

          // Restart listening if still enabled, with backoff for errors
          if (enabled) {
            // Calculate delay based on consecutive errors (exponential backoff)
            let delay = 300; // Default short delay

            // If very short recognition duration, delay more to prevent rapid restarts
            if (recognitionDuration < 500) {
              delay = 1000; // Longer delay for very short recognition sessions
            }
            // Add backoff for consecutive errors
            if (consecutiveErrorsRef.current > 0) {
              delay = Math.min(
                2000 * Math.pow(1.5, consecutiveErrorsRef.current - 1),
                10000
              );
            }

            clearRestartTimeout();
            restartTimeoutRef.current = setTimeout(() => {
              if (enabled) startListening();
            }, delay);
          }
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Get the transcript
          const transcripts = Array.from(
            Array.prototype.slice.call(event.results)
          ).map((result) => (result[0] as { transcript: string }).transcript);

          // Get the most recent transcript
          const latestTranscript =
            transcripts[transcripts.length - 1].toLowerCase();

          // Process the transcript
          processTranscript(latestTranscript, lang);
        };

        try {
          recognition.start();
          return recognition;
        } catch (err) {
          console.error(`Failed to start ${lang} recognition:`, err);
          return null;
        }
      };

      // Try to start English recognition
      const enRecognition = startRecognition("en-US");
      if (enRecognition) {
        recognitionRef.current = enRecognition;
      } else {
        // If English fails, try Spanish
        const esRecognition = startRecognition("es-ES");
        if (esRecognition) {
          recognitionRef.current = esRecognition;
        } else {
          setError("Failed to start speech recognition in any language");
          setIsListening(false);
          isStartingRef.current = false;
          maintainListeningStateRef.current = false;
          consecutiveErrorsRef.current++;

          // Try again after a longer delay with backoff
          const delay = Math.min(
            3000 * Math.pow(1.5, consecutiveErrorsRef.current - 1),
            30000
          );
          clearRestartTimeout();
          restartTimeoutRef.current = setTimeout(() => {
            if (enabled) startListening();
          }, delay);
        }
      }
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start speech recognition");
      setIsListening(false);
      isStartingRef.current = false;
      maintainListeningStateRef.current = false;
      consecutiveErrorsRef.current++;

      // Try again after a longer delay with backoff
      const delay = Math.min(
        3000 * Math.pow(1.5, consecutiveErrorsRef.current - 1),
        30000
      );
      clearRestartTimeout();
      restartTimeoutRef.current = setTimeout(() => {
        if (enabled) startListening();
      }, delay);
    }
  }, [
    wakeWord,
    onWakeWordDetected,
    enabled,
    isListening,
    hasMicrophonePermission,
    checkMicrophonePermission,
  ]);

  // Start/stop listening when enabled changes
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopRecognition();
      clearRestartTimeout();
    }

    // Cleanup on unmount
    return () => {
      stopRecognition();
      clearRestartTimeout();
    };
  }, [enabled, startListening]);

  // Expose a more stable listening state for UI
  const stableListeningState = isListening || maintainListeningStateRef.current;

  return {
    isListening: stableListeningState,
    error,
    hasMicrophonePermission,
  };
}

// Add TypeScript definitions for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
