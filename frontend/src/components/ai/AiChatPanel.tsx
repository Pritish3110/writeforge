import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowUp,
  BookOpenText,
  type LucideIcon,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  type AiChatMessage,
  useAiAssistant,
} from "@/contexts/AiAssistantContext";
import { cn } from "@/lib/utils";
import { AiSparkIcon } from "./AiSparkIcon";

const panelMotion = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.985 },
};

const messageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

const starterPrompts = [
  {
    title: "Refine a scene",
    prompt: "Help me tighten this scene without losing the emotional tension.",
  },
  {
    title: "Develop a character",
    prompt: "Give me three ways to make my protagonist feel more layered.",
  },
  {
    title: "Polish the prose",
    prompt: "Rewrite this paragraph so it feels cleaner, sharper, and more vivid.",
  },
];

type MessageGroup = {
  id: string;
  role: AiChatMessage["role"];
  messages: AiChatMessage[];
};

const formatMessageTime = (timestamp: number) => format(timestamp, "h:mm a");

const buildMessageGroups = (messages: AiChatMessage[]) =>
  messages.reduce<MessageGroup[]>((groups, message) => {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.role === message.role) {
      lastGroup.messages.push(message);
      return groups;
    }

    groups.push({
      id: message.id,
      role: message.role,
      messages: [message],
    });

    return groups;
  }, []);

const bubbleShape = (
  role: AiChatMessage["role"],
  index: number,
  groupLength: number,
) => {
  if (groupLength === 1) {
    return "rounded-[16px]";
  }

  if (role === "user") {
    if (index === 0) {
      return "rounded-[16px] rounded-br-[8px]";
    }

    if (index === groupLength - 1) {
      return "rounded-[16px] rounded-tr-[8px]";
    }

    return "rounded-[16px] rounded-r-[8px]";
  }

  if (index === 0) {
    return "rounded-[16px] rounded-bl-[8px]";
  }

  if (index === groupLength - 1) {
    return "rounded-[16px] rounded-tl-[8px]";
  }

  return "rounded-[16px] rounded-l-[8px]";
};

const MessageGroupLabel = ({ role }: { role: AiChatMessage["role"] }) => {
  if (role === "user") {
    return (
      <div className="mb-2 flex items-center justify-end px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>You</span>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-neon-purple">
        <AiSparkIcon className="h-3.5 w-3.5" />
      </span>
      <span>WriterZ AI</span>
    </div>
  );
};

const TypingIndicator = () => (
  <motion.div
    className="flex justify-start"
    {...messageMotion}
    transition={{ duration: 0.18, ease: "easeOut" }}
    role="status"
    aria-live="polite"
    aria-label="WriterZ AI is thinking"
  >
    <div className="max-w-[82%] sm:max-w-[72%]">
      <MessageGroupLabel role="assistant" />
      <div className="rounded-[16px] border border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-neon-purple"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: index * 0.12,
                }}
              />
            ))}
          </div>
          <span>Thinking</span>
        </div>

        <div className="mt-3 space-y-2">
          <div className="writerz-shimmer h-2 rounded-full" />
          <div className="writerz-shimmer h-2 w-[78%] rounded-full" />
        </div>
      </div>
    </div>
  </motion.div>
);

const AssistantErrorCard = ({
  detail,
  isRetrying,
  onRetry,
}: {
  detail: string;
  isRetrying: boolean;
  onRetry: () => void;
}) => (
  <motion.div
    className="flex justify-start"
    {...messageMotion}
    transition={{ duration: 0.18, ease: "easeOut" }}
    role="status"
    aria-live="polite"
  >
    <div className="max-w-[82%] sm:max-w-[72%]">
      <MessageGroupLabel role="assistant" />
      <div className="rounded-[16px] border border-destructive/20 bg-destructive/5 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Response unavailable</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 h-8 rounded-full px-3"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          Retry
        </Button>
      </div>
    </div>
  </motion.div>
);

const ComposerToggle = ({
  active,
  icon: Icon,
  label,
  iconClassName,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  iconClassName: string;
  onClick: () => void;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors duration-150",
      active
        ? "border-border bg-secondary text-foreground"
        : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/55 hover:text-foreground",
    )}
  >
    <Icon className={cn("h-3.5 w-3.5", active ? iconClassName : "text-muted-foreground")} />
    <span className="font-medium">{label}</span>
  </motion.button>
);

const EmptyState = ({
  onPromptSelect,
}: {
  onPromptSelect: (prompt: string) => void;
}) => (
  <div className="flex h-full min-h-[260px] flex-col justify-center py-6">
    <div className="rounded-[16px] border border-border bg-background px-5 py-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card text-neon-purple">
          <AiSparkIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">WriterZ AI</p>
          <p className="text-sm text-muted-foreground">
            Ask anything using your writing context.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {starterPrompts.map((starter) => (
          <motion.button
            key={starter.title}
            type="button"
            onClick={() => onPromptSelect(starter.prompt)}
            whileTap={{ scale: 0.99 }}
            className="w-full rounded-[14px] border border-border bg-card px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/55"
          >
            <p className="text-sm font-medium text-foreground">{starter.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {starter.prompt}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  </div>
);

export const AiChatPanel = () => {
  const {
    closeAssistant,
    creativeMode,
    isOpen,
    isSending,
    lastError,
    messages,
    retryLastMessage,
    sendMessage,
    toggleCreativeMode,
    toggleUseWritingContext,
    useWritingContext,
  } = useAiAssistant();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const messageGroups = useMemo(() => buildMessageGroups(messages), [messages]);

  const handleSend = async () => {
    const nextDraft = draft.trim();

    if (!nextDraft || isSending) {
      return;
    }

    setDraft("");
    await sendMessage(nextDraft);
  };

  const handlePromptSelect = (prompt: string) => {
    setDraft(prompt);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    textareaRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "56px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [isOpen, isSending, lastError, messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssistant();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAssistant, isOpen]);

  return (
    <motion.section
      id="writerz-ai-panel"
      aria-label="WriterZ AI chat"
      className={cn(
        "pointer-events-auto flex h-[min(78vh,760px)] min-h-[460px] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[20px] border border-border bg-card/95 text-card-foreground backdrop-blur-md",
        "shadow-[0_20px_50px_hsl(var(--foreground)/0.08)] sm:w-[420px] xl:w-[440px]",
      )}
      {...panelMotion}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-background text-neon-purple">
                <AiSparkIcon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">WriterZ AI</h2>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-neon-cyan" />
                    Online
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask anything using your writing context
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closeAssistant}
            className="h-9 w-9 rounded-full"
            aria-label="Close WriterZ AI"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-card to-transparent" />

        <ScrollArea className="h-full px-5">
          {messages.length === 0 ? (
            <EmptyState onPromptSelect={handlePromptSelect} />
          ) : (
            <AnimatePresence initial={false}>
              <div className="space-y-4 pb-5 pt-4">
                {messageGroups.map((group) => {
                  const isUser = group.role === "user";

                  return (
                    <motion.div
                      key={group.id}
                      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
                      {...messageMotion}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <div
                        className={cn(
                          "flex max-w-[82%] flex-col sm:max-w-[72%]",
                          isUser ? "items-end" : "items-start",
                        )}
                      >
                        <MessageGroupLabel role={group.role} />

                        <div className="space-y-2">
                          {group.messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              whileHover={{ y: -1 }}
                              className="group/message relative"
                            >
                              <div
                                className={cn(
                                  "border px-4 py-3 text-sm leading-6 transition-colors duration-150",
                                  bubbleShape(group.role, index, group.messages.length),
                                  isUser
                                    ? "border-[hsl(var(--neon-purple)/0.18)] bg-[hsl(var(--neon-purple)/0.10)] text-foreground hover:bg-[hsl(var(--neon-purple)/0.14)]"
                                    : "border-border bg-background text-foreground hover:bg-[hsl(var(--card-hover))]",
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>

                              <span
                                className={cn(
                                  "pointer-events-none absolute -bottom-5 text-[11px] text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/message:opacity-100",
                                  isUser ? "right-2" : "left-2",
                                )}
                              >
                                {formatMessageTime(message.createdAt)}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {isSending ? <TypingIndicator /> : null}

                {lastError && !isSending ? (
                  <AssistantErrorCard
                    detail={lastError.detail}
                    isRetrying={isSending}
                    onRetry={() => void retryLastMessage()}
                  />
                ) : null}

                <div ref={bottomRef} />
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>
      </div>

      <div className="border-t border-border px-5 py-4">
        <div className="rounded-[16px] border border-border bg-background px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ComposerToggle
              active={useWritingContext}
              icon={BookOpenText}
              label="Writing context"
              iconClassName="text-neon-cyan"
              onClick={toggleUseWritingContext}
            />
            <ComposerToggle
              active={creativeMode}
              icon={Sparkles}
              label="Creative mode"
              iconClassName="text-neon-purple"
              onClick={toggleCreativeMode}
            />
          </div>

          <div className="flex items-end gap-3">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask anything about your story..."
              className="min-h-[56px] max-h-[180px] resize-none border-transparent bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />

            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || isSending}
                className="h-10 w-10 rounded-full bg-neon-purple px-0 text-white hover:bg-neon-purple/90 dark:text-[hsl(var(--background))]"
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Enter sends. Shift + Enter starts a new line.
          </p>
        </div>
      </div>
    </motion.section>
  );
};

export default AiChatPanel;
