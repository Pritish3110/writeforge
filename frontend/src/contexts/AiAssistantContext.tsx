import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { handleAIQuery } from "@/ai/aiRouter";
import { AI_INTENT } from "@/ai/intentDetector";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface AiAssistantErrorState {
  prompt: string;
  userMessageId: string;
  detail: string;
  createdAt: number;
}

interface AiAssistantContextValue {
  isOpen: boolean;
  isSending: boolean;
  messages: AiChatMessage[];
  lastError: AiAssistantErrorState | null;
  useWritingContext: boolean;
  creativeMode: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  toggleUseWritingContext: () => void;
  toggleCreativeMode: () => void;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

const RETRY_PROMPT_MESSAGE =
  "WriterZ AI hit a brief snag while drafting that response. Retry and it will take another pass.";

const createMessageId = () =>
  `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const WRITING_CONTEXT_HINT_PATTERN =
  /\b(draft|drafts|writing|story|stories|character|characters|note|notes|document|documents|scene|scenes|plot|plots|world|workspace)\b/i;

const toConversationHistory = (messages: AiChatMessage[]) =>
  messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

const shouldBiasTowardWritingContext = (content: string) =>
  WRITING_CONTEXT_HINT_PATTERN.test(content);

const getReplyIssue = (content: string) => {
  const normalized = content.trim();

  if (!normalized) {
    return RETRY_PROMPT_MESSAGE;
  }

  if (
    /^AI failed:/i.test(normalized) ||
    /missing gemini api key/i.test(normalized) ||
    /invalid api key/i.test(normalized) ||
    /model.+not found/i.test(normalized) ||
    /quota/i.test(normalized)
  ) {
    return RETRY_PROMPT_MESSAGE;
  }

  return null;
};

export const useAiAssistant = () => {
  const context = useContext(AiAssistantContext);

  if (!context) {
    throw new Error("useAiAssistant must be used inside AiAssistantProvider.");
  }

  return context;
};

export const AiAssistantProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [lastError, setLastError] = useState<AiAssistantErrorState | null>(null);
  const [useWritingContext, setUseWritingContext] = useState(false);
  const [creativeMode, setCreativeMode] = useState(false);
  const sendLockRef = useRef(false);

  const openAssistant = useCallback(() => setIsOpen(true), []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);
  const toggleAssistant = useCallback(
    () => setIsOpen((current) => !current),
    [],
  );
  const toggleUseWritingContext = useCallback(
    () => setUseWritingContext((current) => !current),
    [],
  );
  const toggleCreativeMode = useCallback(
    () => setCreativeMode((current) => !current),
    [],
  );

  const requestAssistantReply = useCallback(
    async ({
      prompt,
      conversationHistory,
      userMessageId,
    }: {
      prompt: string;
      conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
      userMessageId: string;
    }) => {
      if (sendLockRef.current) {
        return;
      }

      sendLockRef.current = true;
      setIsOpen(true);
      setIsSending(true);
      setLastError(null);

      try {
        const response = await handleAIQuery(prompt, {
          conversationHistory,
          contextHints:
            useWritingContext && shouldBiasTowardWritingContext(prompt)
              ? [AI_INTENT.USER_DATA]
              : [],
          creativeMode,
        });

        const replyIssue = getReplyIssue(response);

        if (replyIssue) {
          setLastError({
            prompt,
            userMessageId,
            detail: replyIssue,
            createdAt: Date.now(),
          });
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "assistant",
            content: response.trim(),
            createdAt: Date.now(),
          },
        ]);
      } catch (error) {
        console.error("Global AI assistant request failed.", error);
        setLastError({
          prompt,
          userMessageId,
          detail: RETRY_PROMPT_MESSAGE,
          createdAt: Date.now(),
        });
      } finally {
        setIsSending(false);
        sendLockRef.current = false;
      }
    },
    [creativeMode, useWritingContext],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();

      if (!trimmedContent || isSending || sendLockRef.current) {
        return;
      }

      const userMessage: AiChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedContent,
        createdAt: Date.now(),
      };

      const nextMessages = [...messages, userMessage];

      setMessages((current) => [...current, userMessage]);

      await requestAssistantReply({
        prompt: trimmedContent,
        conversationHistory: toConversationHistory(nextMessages),
        userMessageId: userMessage.id,
      });
    },
    [isSending, messages, requestAssistantReply],
  );

  const retryLastMessage = useCallback(async () => {
    if (!lastError || isSending || sendLockRef.current) {
      return;
    }

    await requestAssistantReply({
      prompt: lastError.prompt,
      conversationHistory: toConversationHistory(messages),
      userMessageId: lastError.userMessageId,
    });
  }, [isSending, lastError, messages, requestAssistantReply]);

  const value = useMemo(
    () => ({
      isOpen,
      isSending,
      messages,
      lastError,
      useWritingContext,
      creativeMode,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      toggleUseWritingContext,
      toggleCreativeMode,
      sendMessage,
      retryLastMessage,
    }),
    [
      closeAssistant,
      creativeMode,
      isOpen,
      isSending,
      lastError,
      messages,
      openAssistant,
      retryLastMessage,
      sendMessage,
      toggleAssistant,
      toggleCreativeMode,
      toggleUseWritingContext,
      useWritingContext,
    ],
  );

  return (
    <AiAssistantContext.Provider value={value}>
      {children}
    </AiAssistantContext.Provider>
  );
};
