"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendMessage, MessageTurn, ApiError } from "@/services/api";
import PersonalitySelector from "@/components/PersonalitySelector";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageActions from "@/components/MessageActions";
import OnboardingSlider from "@/components/OnboardingSlider";
import ToastContainer from "@/components/ToastContainer";
import TypingIndicator from "@/components/TypingIndicator";
import { useChatStore } from "@/store/chatStore";
import {
  getWelcomeMessage,
  type PersonalityPreset,
} from "@/lib/chatPersonality";

type AttachmentKind = "photo" | "camera" | "file" | "drive" | "notebook";

type ComposerAttachment = {
  id: string;
  label: string;
  kind: AttachmentKind;
  meta?: string;
};

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
    isFinal?: boolean;
    length: number;
  }>;
};

type CameraState = "idle" | "loading" | "ready" | "error";

type ErrorViewState = {
  title: string;
  copy: string;
};

type ChatExperienceProps = {
  variant?: "panel" | "immersive";
};

function takeNextDisplayToken(buffer: string, force = false) {
  if (!buffer) {
    return "";
  }

  if (buffer.startsWith("\n")) {
    return "\n";
  }

  const leadingWhitespace = buffer.match(/^[ \t]+/);
  if (leadingWhitespace) {
    return leadingWhitespace[0];
  }

  const wordWithBoundary = buffer.match(/^[^\s]+(?:\s+|$)/);
  if (wordWithBoundary) {
    const token = wordWithBoundary[0];
    if (/\s$/.test(token) || /[.,!?;:)\]]$/.test(token) || force) {
      return token;
    }
  }

  if (buffer.length >= 12) {
    return buffer.slice(0, Math.min(4, buffer.length));
  }

  return force ? buffer : "";
}

function getStreamDelay(token: string) {
  if (!token.trim()) {
    return 12;
  }

  if (token.includes("\n")) {
    return 44;
  }

  if (/[.,!?]$/.test(token.trim())) {
    return 54;
  }

  return Math.min(42, Math.max(18, token.length * 6));
}

function createComposerAttachment(
  label: string,
  kind: AttachmentKind,
  meta?: string,
): ComposerAttachment {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    kind,
    meta,
  };
}

export default function ChatExperience({
  variant = "panel",
}: ChatExperienceProps) {
  const RecognitionAPI =
    typeof window !== "undefined"
      ? ((window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).SpeechRecognition ??
        (window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).webkitSpeechRecognition)
      : undefined;
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const appendChunk = useChatStore((state) => state.appendChunk);
  const markComplete = useChatStore((state) => state.markComplete);
  const markFailed = useChatStore((state) => state.markFailed);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const clearHistory = useChatStore((state) => state.clearHistory);
  const pushToast = useChatStore((state) => state.pushToast);
  const conversationId = useChatStore((state) => state.conversationId);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const userProfile = useChatStore((state) => state.userProfile);
  const updateUserProfile = useChatStore((state) => state.updateUserProfile);

  const [input, setInput] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [errorState, setErrorState] = useState<ErrorViewState | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<
    ComposerAttachment[]
  >([]);
  const [activeTool, setActiveTool] = useState<"search" | "analyze" | "create">(
    "search",
  );
  const [isListening, setIsListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{
    stop: () => void;
  } | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const streamBufferRef = useRef("");
  const streamTimerRef = useRef<number | null>(null);
  const streamFinishedRef = useRef(false);
  const streamMessageIdRef = useRef<string | null>(null);
  const streamDrainResolverRef = useRef<(() => void) | null>(null);

  const isImmersive = variant === "immersive";
  const personality = userProfile.personality as PersonalityPreset;
  const showOnboarding = !userProfile.onboardingCompleted;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || showOnboarding || messages.length > 0) {
      return;
    }

    addMessage({
      sender: "ai",
      text: getWelcomeMessage(personality),
      status: "complete",
    });
  }, [addMessage, hasHydrated, messages.length, personality, showOnboarding]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        window.clearTimeout(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!composerMenuRef.current?.contains(event.target as Node)) {
        setComposerMenuOpen(false);
      }
    }

    if (composerMenuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [composerMenuOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  function resolveErrorState(apiError: ApiError): ErrorViewState {
    if (apiError.status === 429 || /rate limit|quota/i.test(apiError.message)) {
      return {
        title: "Clidy hit a rate limit",
        copy: "The backend is up, but the model is asking us to slow down for a moment. Give it a minute and retry.",
      };
    }

    if (
      apiError.status === 503 ||
      /server|network|connection/i.test(apiError.message)
    ) {
      return {
        title: "Connection got messy",
        copy: "The chat couldn't reach the backend cleanly. Check the server, then send again.",
      };
    }

    return {
      title: "Something went sideways",
      copy:
        apiError.message || "The stream broke before Clidy could finish that thought.",
    };
  }

  function settleQueuedStream() {
    if (streamTimerRef.current !== null) {
      window.clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    streamBufferRef.current = "";
    streamFinishedRef.current = false;
    streamMessageIdRef.current = null;
    streamDrainResolverRef.current?.();
    streamDrainResolverRef.current = null;
  }

  function drainQueuedStream() {
    const messageId = streamMessageIdRef.current;

    if (!messageId) {
      settleQueuedStream();
      return;
    }

    const nextToken = takeNextDisplayToken(
      streamBufferRef.current,
      streamFinishedRef.current,
    );

    if (!nextToken) {
      if (streamFinishedRef.current && !streamBufferRef.current) {
        settleQueuedStream();
        return;
      }

      streamTimerRef.current = window.setTimeout(drainQueuedStream, 16);
      return;
    }

    streamBufferRef.current = streamBufferRef.current.slice(nextToken.length);
    appendChunk(messageId, nextToken);

    if (!streamBufferRef.current && streamFinishedRef.current) {
      settleQueuedStream();
      return;
    }

    streamTimerRef.current = window.setTimeout(
      drainQueuedStream,
      getStreamDelay(nextToken),
    );
  }

  function queueSmoothChunk(messageId: string, chunk: string) {
    streamMessageIdRef.current = messageId;
    streamBufferRef.current += chunk;

    if (streamTimerRef.current === null) {
      drainQueuedStream();
    }
  }

  function finishSmoothStream(messageId: string) {
    streamMessageIdRef.current = messageId;
    streamFinishedRef.current = true;

    if (streamTimerRef.current === null) {
      drainQueuedStream();
    }

    return new Promise<void>((resolve) => {
      if (!streamBufferRef.current && streamTimerRef.current === null) {
        settleQueuedStream();
        resolve();
        return;
      }

      streamDrainResolverRef.current = resolve;
    });
  }

  function cancelSmoothStream() {
    settleQueuedStream();
  }

  function addComposerAttachments(next: ComposerAttachment[]) {
    setComposerAttachments((current) => [...current, ...next]);
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind,
  ) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    addComposerAttachments(
      files.map((file) =>
        createComposerAttachment(
          file.name,
          kind,
          `${Math.max(1, Math.round(file.size / 1024))} KB`,
        ),
      ),
    );
    setComposerMenuOpen(false);
    pushToast({
      type: "info",
      message: `${files.length} ${kind === "file" ? "file" : "image"} added to the composer`,
    });
    event.target.value = "";
  }

  function handleAddCloudSource(kind: "drive" | "notebook") {
    addComposerAttachments([
      createComposerAttachment(
        kind === "drive" ? "Google Drive source" : "Notebook source",
        kind,
        kind === "drive" ? "Cloud link" : "Research context",
      ),
    ]);
    setComposerMenuOpen(false);
    pushToast({
      type: "info",
      message:
        kind === "drive"
          ? "Drive source chip added. Connect backend sync next for real document fetch."
          : "Notebook source chip added. Source grounding UI is ready.",
    });
  }

  async function handleOpenCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      pushToast({
        type: "error",
        message: "Camera access is not supported in this browser.",
      });
      return;
    }

    try {
      setCameraOpen(true);
      setCameraState("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }

      setCameraState("ready");
      setComposerMenuOpen(false);
    } catch {
      setCameraState("error");
      pushToast({
        type: "error",
        message: "Camera open nahi ho paya. Permission allow karke phir try karo.",
      });
    }
  }

  function handleCloseCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraState("idle");
  }

  function handleCaptureFromCamera() {
    const video = cameraVideoRef.current;

    if (!video || !cameraStreamRef.current) {
      return;
    }

    addComposerAttachments([
      createComposerAttachment(
        `Camera capture ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        "camera",
        "Live capture",
      ),
    ]);
    pushToast({
      type: "info",
      message: "Camera capture composer me add ho gaya.",
    });
    handleCloseCamera();
  }

  function handleRemoveComposerAttachment(id: string) {
    setComposerAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  }

  function handleToggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!RecognitionAPI) {
      pushToast({
        type: "error",
        message: "Voice input is not supported in this browser yet.",
      });
      return;
    }

    const recognition = new RecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        setInput((current) =>
          `${current}${current.trim() ? " " : ""}${finalTranscript.trim()}`.trim(),
        );
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      pushToast({
        type: "error",
        message: "Voice capture stopped before transcription could finish.",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    setComposerMenuOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || showOnboarding) {
      return;
    }

    addMessage({
      sender: "user",
      text,
      status: "complete",
    });

    const aiMessageId = addMessage({
      sender: "ai",
      text: "",
      status: "pending",
    });

    setInput("");
    setErrorState(null);

    const priorHistory: MessageTurn[] = messages
      .filter(
        (message) =>
          message.text.trim().length > 0 && message.status !== "failed",
      )
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      }));
    const history: MessageTurn[] = [...priorHistory, { sender: "user", text }];
    let hasQueuedResponse = false;

    try {
      const response = await sendMessage(
        text,
        personality,
        history,
        {
          goals: userProfile.goals.trim(),
          interests: userProfile.interests.trim(),
        },
        conversationId,
      );

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      if (response.reply.trim()) {
        hasQueuedResponse = true;
        queueSmoothChunk(aiMessageId, response.reply);
        await finishSmoothStream(aiMessageId);
        markComplete(aiMessageId);
      } else {
        removeMessage(aiMessageId);
      }
    } catch (err) {
      const apiErr = err as ApiError;

      cancelSmoothStream();
      if (hasQueuedResponse) {
        markFailed(aiMessageId);
      } else {
        removeMessage(aiMessageId);
      }

      setErrorState(resolveErrorState(apiErr));
      pushToast({
        type: "error",
        message:
          apiErr.message || "Oops 😅 Something went wrong. Please try again!",
      });
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleRetry() {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.sender === "user");
    if (lastUser) {
      setInput(lastUser.text);
    }

    setErrorState(null);
    inputRef.current?.focus();
  }

  function handleStartEditMessage(id: string, text: string) {
    setEditingMessageId(id);
    setEditingText(text);
    setErrorState(null);
  }

  function handleCancelEditMessage() {
    setEditingMessageId(null);
    setEditingText("");
  }

  function handleSaveEditMessage() {
    const nextText = editingText.trim();

    if (!editingMessageId || !nextText) {
      return;
    }

    updateMessage(editingMessageId, nextText);
    setEditingMessageId(null);
    setEditingText("");
  }

  function handleRetryFromText(text: string) {
    setInput(text);
    setErrorState(null);
    inputRef.current?.focus();
    pushToast({
      type: "info",
      message: "Retry draft added to the input",
    });
  }

  function handleNewBranchFromText(text: string) {
    clearHistory();
    setConversationId(null);
    setErrorState(null);
    setInput(text);
    addMessage({
      sender: "ai",
      text: `${getWelcomeMessage(personality)}\n\nNew branch draft is ready below.`,
      status: "complete",
    });
    inputRef.current?.focus();
    pushToast({
      type: "info",
      message: "Started a new branch from this message",
    });
  }

  function finishOnboarding() {
    updateUserProfile({
      onboardingCompleted: true,
      personality,
    });
    inputRef.current?.focus();
  }

  const hasOnlyWelcomeMessage =
    messages.length === 1 &&
    messages[0]?.sender === "ai" &&
    messages[0]?.status === "complete";

  return (
    <div
      className={`chat-shell ${isImmersive ? "chat-shell--immersive" : ""}`.trim()}
    >
      <OnboardingSlider
        open={showOnboarding}
        personality={personality}
        goals={userProfile.goals}
        interests={userProfile.interests}
        onGoalsChange={(goals) => updateUserProfile({ goals })}
        onInterestsChange={(interests) => updateUserProfile({ interests })}
        onPersonalityChange={(nextPersonality) =>
          updateUserProfile({ personality: nextPersonality })
        }
        onFinish={finishOnboarding}
      />

      <div
        className={`chat-panel ${isImmersive ? "chat-panel--immersive" : ""}`.trim()}
      >
        <header className="chat-header">
          <Link href="/" className="back-btn" title="Back to home">
            ←
          </Link>
          <div className="chat-header-info">
            <div className="chat-avatar">✨</div>
            <div>
              <h1 className="chat-title">Clidy AI</h1>
              <div className="chat-status">
                <span className="status-dot" />{" "}
                {isImmersive ? "Focus mode, full chat flow" : "Always here for you"}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <Link
              href={isImmersive ? "/chat" : "/chat/live"}
              className="chat-mode-link"
            >
              {isImmersive ? "Compact view" : "Open full chat"}
            </Link>
          </div>
        </header>

        <PersonalitySelector
          selected={personality}
          onSelect={(id) =>
            updateUserProfile({ personality: id as PersonalityPreset })
          }
          disabled={isStreaming || showOnboarding}
        />

        <div className="chat-messages">
          <div className="chat-log" aria-live="polite" aria-label="Chat messages">
            {hasOnlyWelcomeMessage && !errorState && (
              <section className="chat-blank">
                <p className="chat-blank__eyebrow">
                  {isImmersive ? "Full chat room is live" : "Streaming is live now"}
                </p>
                <h2 className="chat-blank__title">
                  {isImmersive
                    ? "Talk without the cramped modal feel"
                    : "Start the first real convo"}
                </h2>
                <p className="chat-blank__copy">
                  Ask for advice, drop a messy thought, or paste markdown. Clidy now
                  streams replies with a smoother pace, keeps the same
                  conversation context alive across turns, and formats completed
                  AI messages cleanly.
                </p>
                <div className="chat-blank__prompts">
                  <button
                    type="button"
                    onClick={() => setInput("Help me plan my week in a calm way.")}
                  >
                    Calm planning
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput("Give me a funny pep talk before I study.")
                    }
                  >
                    Funny pep talk
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput("Explain async/await with a code example.")
                    }
                  >
                    Markdown + code
                  </button>
                </div>
              </section>
            )}

            {errorState && (
              <section className="chat-blank chat-blank--error" role="alert">
                <p className="chat-blank__eyebrow">Heads up</p>
                <h2 className="chat-blank__title">{errorState.title}</h2>
                <p className="chat-blank__copy">{errorState.copy}</p>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={handleRetry}
                >
                  Retry with last message
                </button>
              </section>
            )}

            {messages.map((msg, index) => (
              <article
                key={msg.id}
                className={`bubble bubble--${msg.sender === "ai" ? "ai" : "user"} ${
                  msg.status === "failed" ? "bubble--failed" : ""
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    ✨
                  </div>
                )}

                <div className="bubble-body">
                  {editingMessageId === msg.id && msg.sender === "user" ? (
                    <div className="edit-message-container">
                      <textarea
                        className="edit-message-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        autoFocus
                        aria-label="Edit message"
                      />
                      <div className="edit-actions">
                        <button
                          type="button"
                          className="edit-action-btn edit-action-btn--primary"
                          onClick={handleSaveEditMessage}
                          disabled={!editingText.trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="edit-action-btn"
                          onClick={handleCancelEditMessage}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  {msg.sender === "ai" && !msg.text ? (
                    <TypingIndicator label="Thinking..." />
                  ) : msg.sender === "ai" ? (
                    <MarkdownRenderer content={msg.text} />
                  ) : (
                    <p className="bubble-text bubble-text--plain">
                      {msg.text || "\u00A0"}
                    </p>
                  )}

                  {msg.status === "streaming" && (
                    <span className="bubble-status bubble-status--live">
                      Clidy is streaming...
                    </span>
                  )}

                  {msg.status === "failed" && (
                    <span className="bubble-status">Stream interrupted</span>
                  )}

                  {msg.text && (
                    <MessageActions
                      text={msg.text}
                      sender={msg.sender}
                      onRetry={
                        msg.sender === "ai"
                          ? () => {
                              const previousUserText =
                                [...messages.slice(0, index)]
                                  .reverse()
                                  .find((message) => message.sender === "user")?.text ?? "";

                              if (previousUserText) {
                                handleRetryFromText(previousUserText);
                              }
                            }
                          : undefined
                      }
                      onBranch={() => handleNewBranchFromText(msg.text)}
                      onEdit={
                        msg.sender === "user"
                          ? () => handleStartEditMessage(msg.id, msg.text)
                          : undefined
                      }
                    />
                  )}
                    </>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    👤
                  </div>
                )}
              </article>
            ))}

            <div ref={chatEndRef} />
          </div>
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => handleFileSelection(event, "photo")}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.ppt,.pptx"
            multiple
            hidden
            onChange={(event) => handleFileSelection(event, "file")}
          />

          <div className="composer-shell">
            <div className="composer-topbar" aria-label="Composer tools">
              <div className="composer-mode-row">
                {[
                  ["search", "Search"],
                  ["analyze", "Analyze"],
                  ["create", "Create"],
                ].map(([tool, label]) => (
                  <button
                    key={tool}
                    type="button"
                    className={`composer-mode-chip ${
                      activeTool === tool ? "composer-mode-chip--active" : ""
                    }`}
                    onClick={() =>
                      setActiveTool(tool as "search" | "analyze" | "create")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="composer-status-badge">
                {isListening ? "Listening" : activeTool}
              </div>
            </div>

            {composerAttachments.length > 0 && (
              <div className="composer-attachments" aria-label="Attached sources">
                {composerAttachments.map((attachment) => (
                  <div key={attachment.id} className="composer-attachment-pill">
                    <span className="composer-attachment-pill__kind">
                      {attachment.kind}
                    </span>
                    <span>{attachment.label}</span>
                    {attachment.meta && (
                      <span className="composer-attachment-pill__meta">
                        {attachment.meta}
                      </span>
                    )}
                    <button
                      type="button"
                      className="composer-attachment-pill__remove"
                      onClick={() => handleRemoveComposerAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="composer-input-wrap">
              <div className="composer-leading-tools" ref={composerMenuRef}>
                <button
                  type="button"
                  className={`composer-plus-btn ${
                    composerMenuOpen ? "composer-plus-btn--active" : ""
                  }`}
                  onClick={() => setComposerMenuOpen((current) => !current)}
                  aria-label="Add sources"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {composerMenuOpen && (
                  <div className="composer-menu">
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Photos
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={handleOpenCamera}
                    >
                      Camera
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Files
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => handleAddCloudSource("drive")}
                    >
                      Drive
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => handleAddCloudSource("notebook")}
                    >
                      Notebook
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                id="chat-input"
                className="composer-input composer-input--textarea"
                placeholder={
                  isImmersive
                    ? "Ask Clidy anything. This view is built for longer chats."
                    : "Talk to Clidy... 😊"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as FormEvent);
                  }
                }}
                disabled={isStreaming || showOnboarding}
                autoComplete="off"
                autoFocus
                rows={1}
                aria-label="Message input"
              />

              <button
                type="button"
                className={`composer-voice-btn ${
                  isListening ? "composer-voice-btn--active" : ""
                }`}
                onClick={handleToggleVoiceInput}
                disabled={isStreaming || showOnboarding}
                title={isListening ? "Stop voice input" : "Start voice input"}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 16a4 4 0 0 0 4-4V8a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm0 0v3m-5-6a5 5 0 0 0 10 0m-10 0v1a5 5 0 0 0 10 0v-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                className="composer-send"
                type="submit"
                disabled={isStreaming || showOnboarding || !input.trim()}
                title="Send message"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      {cameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera capture">
          <div className="camera-modal__card">
            <div className="camera-modal__header">
              <div>
                <p className="camera-modal__eyebrow">Live camera</p>
                <h3 className="camera-modal__title">Capture for Clidy</h3>
              </div>
              <button
                type="button"
                className="camera-modal__close"
                onClick={handleCloseCamera}
                aria-label="Close camera"
              >
                ×
              </button>
            </div>

            <div className="camera-modal__viewport">
              <video
                ref={cameraVideoRef}
                className="camera-modal__video"
                autoPlay
                muted
                playsInline
              />
              {cameraState !== "ready" && (
                <div className="camera-modal__overlay">
                  {cameraState === "loading"
                    ? "Opening camera..."
                    : "Camera preview unavailable"}
                </div>
              )}
            </div>

            <div className="camera-modal__actions">
              <button
                type="button"
                className="camera-modal__btn camera-modal__btn--ghost"
                onClick={handleCloseCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="camera-modal__btn camera-modal__btn--primary"
                onClick={handleCaptureFromCamera}
                disabled={cameraState !== "ready"}
              >
                Use capture
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
