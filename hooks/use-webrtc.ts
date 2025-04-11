"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Conversation,
  Tool,
  DetectedAction,
  RegisterableFunction,
  ActionData,
} from "@/types";
import { useTranslations } from "@/components/translations-context";

/**
 * The return type for the hook, matching Approach A
 * (RefObject<HTMLDivElement | null> for the audioIndicatorRef).
 */
interface UseWebRTCAudioSessionReturn {
  status: string;
  isSessionActive: boolean;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => void;
  registerFunction: (name: string, fn: RegisterableFunction) => void;
  msgs: Record<string, unknown>[];
  currentVolume: number;
  conversation: Conversation[];
  sendTextMessage: (text: string) => void;
  messageLanguages: Record<string, string>;
  conversationSummary: string;
  detectedActions: DetectedAction[];
  setDetectedActions: React.Dispatch<React.SetStateAction<DetectedAction[]>>;
  setConversationSummary: React.Dispatch<React.SetStateAction<string>>;
}

const VOICE = "ash";

/**
 * Hook to manage a real-time session with OpenAI's Realtime endpoints.
 */
export default function useWebRTCAudioSession(
  onConversationEnd?: () => void,
  tools?: Tool[]
): UseWebRTCAudioSessionReturn {
  const { t, locale } = useTranslations();
  // Connection/session states
  const [status, setStatus] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Audio references for local mic
  // Approach A: explicitly typed as HTMLDivElement | null
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Keep track of all raw events/messages
  const [msgs, setMsgs] = useState<Record<string, unknown>[]>([]);

  // Main conversation state
  const [conversation, setConversation] = useState<Conversation[]>([]);

  // Track the language of each message
  const [messageLanguages, setMessageLanguages] = useState<
    Record<string, string>
  >({});

  // Track conversation summary
  const [conversationSummary, setConversationSummary] = useState<string>("");

  // Track detected actions
  const [detectedActions, setDetectedActions] = useState<DetectedAction[]>([]);

  // For function calls (AI "tools")
  const functionRegistry = useRef<Record<string, RegisterableFunction>>({});

  // Store previous doctor's message for "repeat that" functionality
  const previousDoctorMessageRef = useRef<string>("");

  // Volume analysis (assistant inbound audio)
  const [currentVolume, setCurrentVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  /**
   * We track only the ephemeral user message **ID** here.
   * While user is speaking, we update that conversation item by ID.
   */
  const ephemeralUserMessageIdRef = useRef<string | null>(null);

  /**
   * Register a function (tool) so the AI can call it.
   */
  function registerFunction(name: string, fn: RegisterableFunction) {
    functionRegistry.current[name] = fn;
  }

  /**
   * Configure the data channel on open, sending a session update to the server.
   */
  function configureDataChannel(dataChannel: RTCDataChannel) {
    // We now handle tools separately through registerFunction

    // Set up basic session parameters (with tools)
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        tools: tools || [], // Include tools in the session update
        input_audio_transcription: {
          model: "whisper-1",
        },
      },
    };

    // Log the full session update for debugging
    console.log("Sending session update:", JSON.stringify(sessionUpdate));
    dataChannel.send(JSON.stringify(sessionUpdate));

    console.log("Setting locale: " + t("language") + " : " + locale);

    // Send language preference message
    const languageMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: t("languagePrompt"),
          },
        ],
      },
    };
    dataChannel.send(JSON.stringify(languageMessage));
  }

  /**
   * Return an ephemeral user ID, creating a new ephemeral message in conversation if needed.
   */
  function getOrCreateEphemeralUserId(): string {
    let ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) {
      // Use uuidv4 for a robust unique ID
      ephemeralId = uuidv4();
      ephemeralUserMessageIdRef.current = ephemeralId;

      const newMessage: Conversation = {
        id: ephemeralId,
        role: "user",
        text: "",
        timestamp: new Date().toISOString(),
        isFinal: false,
        status: "speaking",
      };

      // Append the ephemeral item to conversation
      setConversation((prev) => [...prev, newMessage]);
    }
    return ephemeralId;
  }

  /**
   * Update the ephemeral user message (by ephemeralUserMessageIdRef) with partial changes.
   */
  function updateEphemeralUserMessage(partial: Partial<Conversation>) {
    const ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) return; // no ephemeral user message to update

    setConversation((prev) =>
      prev.map((msg) => {
        if (msg.id === ephemeralId) {
          return { ...msg, ...partial };
        }
        return msg;
      })
    );
  }

  /**
   * Clear ephemeral user message ID so the next user speech starts fresh.
   */
  function clearEphemeralUserMessage() {
    ephemeralUserMessageIdRef.current = null;
  }

  /**
   * Main data channel message handler: interprets events from the server.
   */
  async function handleDataChannelMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data);
      // console.log("Incoming dataChannel message:", msg);

      switch (msg.type) {
        /**
         * User speech started
         */
        case "input_audio_buffer.speech_started": {
          getOrCreateEphemeralUserId();
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * User speech stopped
         */
        case "input_audio_buffer.speech_stopped": {
          // optional: you could set "stopped" or just keep "speaking"
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * Audio buffer committed => "Processing speech..."
         */
        case "input_audio_buffer.committed": {
          updateEphemeralUserMessage({
            text: "Processing speech...",
            status: "processing",
          });
          break;
        }

        /**
         * Partial user transcription
         */
        case "conversation.item.input_audio_transcription": {
          const partialText =
            msg.transcript ?? msg.text ?? "User is speaking...";
          updateEphemeralUserMessage({
            text: partialText,
            status: "speaking",
            isFinal: false,
          });
          break;
        }

        /**
         * Final user transcription
         */
        case "conversation.item.input_audio_transcription.completed": {
          // console.log("Final user transcription:", msg.transcript);
          const transcript = msg.transcript || "";

          // Detect language of the message
          const messageId = ephemeralUserMessageIdRef.current;
          if (messageId) {
            const isSpanish = detectSpanishLanguage(transcript);
            setMessageLanguages((prev) => ({
              ...prev,
              [messageId]: isSpanish ? "spanish" : "english",
            }));

            // If this is a "repeat that" request in Spanish
            if (
              isSpanish &&
              isRepeatRequest(transcript) &&
              previousDoctorMessageRef.current
            ) {
              // Send a request to repeat the previous doctor message
              if (dataChannelRef.current) {
                const repeatMessage = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: `Please repeat the following message in Spanish: "${previousDoctorMessageRef.current}"`,
                      },
                    ],
                  },
                };
                dataChannelRef.current.send(JSON.stringify(repeatMessage));

                const responseCreate = {
                  type: "response.create",
                };
                dataChannelRef.current.send(JSON.stringify(responseCreate));
              }
            }
          }

          updateEphemeralUserMessage({
            text: transcript,
            isFinal: true,
            status: "final",
          });
          clearEphemeralUserMessage();
          break;
        }

        /**
         * Streaming AI transcripts (assistant partial)
         */
        case "response.audio_transcript.delta": {
          const newMessageId = uuidv4();
          const newMessage: Conversation = {
            id: newMessageId,
            role: "assistant",
            text: msg.delta,
            timestamp: new Date().toISOString(),
            isFinal: false,
          };

          setConversation((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isFinal) {
              // Append to existing assistant partial
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + msg.delta,
              };
              return updated;
            } else {
              // Start a new assistant partial
              return [...prev, newMessage];
            }
          });
          break;
        }

        /**
         * Mark the last assistant message as final
         */
        case "response.audio_transcript.done": {
          setConversation((prev) => {
            if (prev.length === 0) return prev;

            const lastMessageIndex = prev.length - 1;
            const lastMessage = prev[lastMessageIndex];

            // If this appears to be a doctor's message (English to Spanish translation)
            // Store it for potential "repeat that" functionality
            const isLastMessageFromDoctor = detectDoctorMessage(
              lastMessage.text
            );
            if (isLastMessageFromDoctor) {
              previousDoctorMessageRef.current = lastMessage.text;
            }

            // Check if this is a summary generation
            if (
              lastMessage.text.includes("SUMMARY:") ||
              lastMessage.text.includes("RESUMEN:") ||
              lastMessage.text.toLowerCase().includes("summary") ||
              lastMessage.text.toLowerCase().includes("resumen") ||
              lastMessage.text.match(/^(here is |here's )?a summary/i)
            ) {
              console.log("Summary detected in message:", lastMessage.text);
              setConversationSummary(lastMessage.text);
            }

            // Check if this message indicates the conversation is ending
            if (isConversationEnding(lastMessage.text)) {
              console.log(
                "Conversation ending detected in message:",
                lastMessage.text
              );

              // If we haven't already set a summary, use this message as the summary
              if (!conversationSummary) {
                console.log("Setting message as conversation summary");
                setConversationSummary(lastMessage.text);
              }

              // Call the onConversationEnd callback if provided
              if (onConversationEnd) {
                console.log("Triggering conversation end callback");
                // Use setTimeout to ensure state updates complete first
                setTimeout(() => {
                  onConversationEnd();
                }, 1000);
              }
            }

            const updated = [...prev];
            updated[lastMessageIndex].isFinal = true;
            return updated;
          });
          break;
        }

        /**
         * AI calls a function (tool)
         */
        case "response.function_call_arguments.done": {
          console.log(
            "Function call detected:",
            msg.name,
            "with arguments:",
            msg.arguments
          );

          const fn = functionRegistry.current[msg.name];
          if (fn) {
            const args = JSON.parse(msg.arguments);
            console.log(
              "Executing function:",
              msg.name,
              "with parsed args:",
              args
            );

            try {
              const result = await fn(args);
              console.log("Function result:", result);

              // If the function returns a summary, update the conversation summary
              if (
                msg.name === "generateConversationSummary" &&
                result.summary
              ) {
                console.log(
                  "Setting conversation summary from tool result:",
                  result.summary
                );
                setConversationSummary(result.summary);
              }

              // Respond with function output
              const response = {
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: msg.call_id,
                  output: JSON.stringify(result),
                },
              };
              dataChannelRef.current?.send(JSON.stringify(response));

              const responseCreate = {
                type: "response.create",
              };
              dataChannelRef.current?.send(JSON.stringify(responseCreate));
            } catch (error) {
              console.error("Error executing function:", error);
            }
          } else {
            console.warn("Function not found in registry:", msg.name);
          }
          break;
        }

        default: {
          // console.warn("Unhandled message type:", msg.type);
          break;
        }
      }

      // Always log the raw message
      setMsgs((prevMsgs) => [...prevMsgs, msg]);
      return msg;
    } catch (error) {
      console.error("Error handling data channel message:", error);
    }
  }

  /**
   * Fetch ephemeral token from your Next.js endpoint
   */
  async function getEphemeralToken() {
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }
      const data = await response.json();
      return data.client_secret.value;
    } catch (err) {
      console.error("getEphemeralToken error:", err);
      throw err;
    }
  }

  /**
   * Sets up a local audio visualization for mic input (toggle wave CSS).
   */
  function setupAudioVisualization(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIndicator = () => {
      if (!audioContext) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Toggle an "active" class if volume is above a threshold
      if (audioIndicatorRef.current) {
        audioIndicatorRef.current.classList.toggle("active", average > 30);
      }
      requestAnimationFrame(updateIndicator);
    };
    updateIndicator();

    audioContextRef.current = audioContext;
  }

  /**
   * Calculate RMS volume from inbound assistant audio
   */
  function getVolume(): number {
    if (!analyserRef.current) return 0;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128;
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Start a new session:
   */
  async function startSession() {
    try {
      setStatus("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      setStatus("Fetching ephemeral token...");
      const ephemeralToken = await getEphemeralToken();

      setStatus("Establishing connection...");
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Hidden <audio> element for inbound assistant TTS
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;

      // Inbound track => assistant's TTS
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];

        // Optional: measure inbound volume
        const audioCtx = new (window.AudioContext || window.AudioContext)();
        const src = audioCtx.createMediaStreamSource(event.streams[0]);
        const inboundAnalyzer = audioCtx.createAnalyser();
        inboundAnalyzer.fftSize = 256;
        src.connect(inboundAnalyzer);
        analyserRef.current = inboundAnalyzer;

        // Start volume monitoring
        volumeIntervalRef.current = window.setInterval(() => {
          setCurrentVolume(getVolume());
        }, 100);
      };

      // Data channel for transcripts
      const dataChannel = pc.createDataChannel("response");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        // console.log("Data channel open");
        configureDataChannel(dataChannel);
      };
      dataChannel.onmessage = handleDataChannelMessage;

      // Add local (mic) track
      pc.addTrack(stream.getTracks()[0]);

      // Create offer & set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const response = await fetch(`${baseUrl}?model=${model}&voice=${VOICE}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
      });

      // Set remote description
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsSessionActive(true);
      setStatus("Session established successfully!");
    } catch (err) {
      console.error("startSession error:", err);
      setStatus(`Error: ${err}`);
      stopSession();
    }
  }

  /**
   * Stop the session & cleanup
   * Enhanced to ensure complete cleanup of all resources
   */
  function stopSession() {
    console.log("Cleaning up session resources...");

    // Clean up data channel
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (e) {
        console.error("Error closing data channel:", e);
      }
      dataChannelRef.current = null;
    }

    // Clean up peer connection
    if (peerConnectionRef.current) {
      try {
        // Close all transceivers if available
        const transceivers = peerConnectionRef.current.getTransceivers();
        if (transceivers && transceivers.length) {
          transceivers.forEach((transceiver) => {
            try {
              transceiver.stop();
            } catch (e) {
              // Ignore errors
            }
          });
        }

        // Close the peer connection
        peerConnectionRef.current.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
      peerConnectionRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.error("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }

    // Clean up audio stream tracks
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.error("Error stopping audio tracks:", e);
      }
      audioStreamRef.current = null;
    }

    // Clean up UI elements
    if (audioIndicatorRef.current) {
      audioIndicatorRef.current.classList.remove("active");
    }

    // Clear interval
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Reset other refs
    analyserRef.current = null;
    ephemeralUserMessageIdRef.current = null;

    // Update state
    setCurrentVolume(0);
    setIsSessionActive(false);
    setStatus("Session stopped");

    // Note: We're intentionally NOT clearing detectedActions here
    // So they persist for the summary screen

    // Clear WebRTC-related state
    setMsgs([]);
    setConversation([]);

    console.log("Session cleanup complete");
  }

  /**
   * Toggle start/stop from a single button
   * Enhanced to ensure proper cleanup before starting a new session
   */
  function handleStartStopClick() {
    if (isSessionActive) {
      console.log("Stopping active session");
      stopSession();
    } else {
      console.log("Starting new session");
      // First ensure any previous session is completely cleaned up
      stopSession();
      // Wait a short delay to ensure resources are freed
      setTimeout(() => {
        startSession();
      }, 150);
    }
  }

  /**
   * Send a text message through the data channel
   */
  function sendTextMessage(text: string) {
    if (
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== "open"
    ) {
      console.error("Data channel not ready");
      return;
    }

    const messageId = uuidv4();

    // Add message to conversation immediately
    const newMessage: Conversation = {
      id: messageId,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
      isFinal: true,
      status: "final",
    };

    setConversation((prev) => [...prev, newMessage]);

    // Send message through data channel
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text,
          },
        ],
      },
    };

    const response = {
      type: "response.create",
    };

    dataChannelRef.current.send(JSON.stringify(message));
    dataChannelRef.current.send(JSON.stringify(response));
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Detect if text is likely in Spanish
   */
  function detectSpanishLanguage(text: string): boolean {
    // Spanish-specific characters and common words
    const spanishPatterns = [
      /[áéíóúüñ¿¡]/i,
      /\b(el|la|los|las|un|una|unos|unas)\b/i,
      /\b(es|está|son|están)\b/i,
      /\b(y|o|pero|porque|como|cuando|donde|qué|quién|cómo|por qué)\b/i,
    ];

    return spanishPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect if this is a "repeat that" request in Spanish
   */
  function isRepeatRequest(text: string): boolean {
    const repeatPatterns = [
      /repite eso/i,
      /repítelo/i,
      /dilo otra vez/i,
      /puedes repetir/i,
      /no entendí/i,
      /no entiendo/i,
      /repita/i,
      /repetir/i,
    ];

    return repeatPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect if a message is from the doctor (English content)
   */
  function detectDoctorMessage(text: string): boolean {
    // Simple heuristic: if message has more English words than Spanish
    const englishWords = [
      /\b(the|a|an|is|are|have|has|was|were|will|would|can|could|should|may|might)\b/i,
      /\b(I|you|he|she|it|we|they|my|your|his|her|its|our|their)\b/i,
      /\b(this|that|these|those|here|there|now|then|today|tomorrow|yesterday)\b/i,
    ];

    const spanishWords = [
      /\b(el|la|los|las|un|una|unos|unas|es|son|estar|tener|fue|fueron|será|sería)\b/i,
      /\b(yo|tú|él|ella|eso|nosotros|ellos|mi|tu|su|nuestro|sus)\b/i,
      /\b(este|esta|estos|estas|aquí|allí|ahora|entonces|hoy|mañana|ayer)\b/i,
    ];

    const englishMatches = englishWords.filter((pattern) =>
      pattern.test(text)
    ).length;
    const spanishMatches = spanishWords.filter((pattern) =>
      pattern.test(text)
    ).length;

    return englishMatches > spanishMatches;
  }

  /**
   * Detect if the message contains phrases indicating the conversation is ending
   */
  function isConversationEnding(text: string): boolean {
    const endingPhrases = [
      /thank you for (the|your) time/i,
      /have a (good|great|nice) day/i,
      /that('s| is) all for today/i,
      /appointment (is|has been) scheduled/i,
      /we('| a)re done/i,
      /conversation (is|has) ended/i,
      /end of (the|our) (session|appointment|visit)/i,
      /gracias por (su|tu) tiempo/i,
      /que (tenga|tengas) un buen día/i,
      /eso es todo por hoy/i,
      /hemos terminado/i,
      /(here is|here's|I have prepared) (a|the) summary/i,
      /summary of (our|the|today's) (conversation|visit|appointment)/i,
    ];

    return endingPhrases.some((phrase) => phrase.test(text));
  }

  return {
    status,
    isSessionActive,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    msgs,
    currentVolume,
    conversation,
    sendTextMessage,
    messageLanguages,
    conversationSummary,
    detectedActions,
    setDetectedActions,
    setConversationSummary,
  };
}
