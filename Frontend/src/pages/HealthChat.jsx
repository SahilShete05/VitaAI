import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Bot,
  Send,
  UserRound,
  LoaderCircle,
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  Mic,
  Square,
  X,
  AudioLines,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../components/lib/api";
import { useAuth } from "../context/AuthContext";

export default function HealthChat() {
  const { user } = useAuth();

  const [language, setLanguage] = useState(
    user?.language || "en"
  );

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi${user?.name ? ` ${user.name}` : ""}! I'm VitaAI, your health information assistant. Tell me what symptoms or health questions you'd like help with.`,
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [emergency, setEmergency] = useState(false);

  // Voice transcription state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const bottomRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingSecondsRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    setVoiceSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );

    return () => {
      mountedRef.current = false;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (
        recorderRef.current &&
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  function stopMicrophoneTracks() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  async function transcribeRecordedAudio(blob, mimeType) {
    if (!blob || blob.size === 0) {
      setError("No audio was recorded. Please try again.");
      return;
    }

    // The backend accepts audio/webm. Normalize codec parameters
    // from MediaRecorder's MIME type before creating the upload.
    const normalizedMimeType = mimeType
      .split(";")[0]
      .trim()
      .toLowerCase();

    const extensionByType = {
      "audio/webm": "webm",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/aac": "aac",
      "audio/flac": "flac",
    };

    if (!extensionByType[normalizedMimeType]) {
      setError(
        "Your browser recorded an unsupported audio format. Please try another browser."
      );
      return;
    }

    const audioFile = new File(
      [blob],
      `vitaai-recording.${extensionByType[normalizedMimeType]}`,
      { type: normalizedMimeType }
    );

    if (audioFile.size > 10 * 1024 * 1024) {
      setError("The recording exceeds the 10 MB upload limit.");
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioFile);

    setTranscribing(true);
    setError("");

    try {
      const response = await api.post(
        "/voice/transcribe",
        formData,
        {
          headers: {
            "Content-Type": undefined,
          },
        }
      );

      const data = response.data;

      if (
        !data?.success ||
        typeof data?.data?.transcript !== "string" ||
        !data.data.transcript.trim()
      ) {
        throw new Error(
          data?.message || "No transcript was returned."
        );
      }

      if (mountedRef.current) {
        // Let the user review and edit the transcript before sending.
        setInput((previous) => {
          const existing = previous.trim();

          return existing
            ? `${existing} ${data.data.transcript.trim()}`
            : data.data.transcript.trim();
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to transcribe your recording. Please try again."
        );
      }
    } finally {
      if (mountedRef.current) {
        setTranscribing(false);
      }
    }
  }

  async function startRecording() {
    if (recording || transcribing || sending) return;

    setError("");

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceSupported(false);
      setError(
        "Voice recording is not supported by this browser. Try a recent version of Chrome or Edge."
      );
      return;
    }

    if (!window.isSecureContext) {
      setError(
        "Microphone access requires HTTPS or localhost. Open VitaAI on localhost or use a secure connection."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (mountedRef.current) {
          setError(
            "An error occurred while recording. Please try again."
          );
          setRecording(false);
        }

        stopRecordingTimer();
        stopMicrophoneTracks();
      };

      recorder.onstop = async () => {
        stopRecordingTimer();
        stopMicrophoneTracks();

        if (!mountedRef.current) return;

        setRecording(false);

        const actualMimeType =
          recorder.mimeType || mimeType || "audio/webm";

        const audioBlob = new Blob(chunksRef.current, {
          type: actualMimeType,
        });

        chunksRef.current = [];

        await transcribeRecordedAudio(
          audioBlob,
          actualMimeType
        );
      };

      recorder.start(1000);
      setRecording(true);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;

        if (mountedRef.current) {
          setRecordingSeconds(recordingSecondsRef.current);
        }

        // Keep recordings to a reasonable duration.
        if (recordingSecondsRef.current >= 120) {
          if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (err) {
      stopMicrophoneTracks();

      const message =
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
          ? "Microphone permission was denied. Allow microphone access in your browser settings and try again."
          : err.name === "NotFoundError"
          ? "No microphone was found. Connect a microphone and try again."
          : "Could not start recording. Check your microphone and try again.";

      setError(message);
      setRecording(false);
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function cancelRecording() {
    stopRecordingTimer();

    const recorder = recorderRef.current;

    if (recorder) {
      // Remove the stop handler so cancelled audio is not uploaded.
      recorder.onstop = null;

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    chunksRef.current = [];
    stopMicrophoneTracks();

    setRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || sending || recording || transcribing) return;

    setError("");
    setEmergency(false);
    setInput("");

    // Send recent conversation context to the backend.
    const history = messages
      .filter(
        (item) =>
          item.role === "user" || item.role === "assistant"
      )
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    setSending(true);

    try {
      const response = await api.post(
        "/health-chat/message",
        {
          message,
          history,
          language,
        }
      );

      const data = response.data;

      if (!data.success || typeof data.reply !== "string") {
        throw new Error(
          data.message || "VitaAI could not generate a reply."
        );
      }

      setEmergency(data.emergency === true);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply,
          emergency: data.emergency === true,
          disclaimer: data.disclaimer || "",
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to send your message. Check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900 dark:bg-[#0d0c19] dark:text-white">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#151326]/90 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="rounded-xl border border-slate-200 p-2.5 hover:bg-purple-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <ArrowLeft size={19} />
          </Link>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20">
            <HeartPulse size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-bold">VitaAI Health Chat</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              General health information and guidance
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              Language
            </span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={sending || recording || transcribing}
              aria-label="Chat language"
              className="max-w-28 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-purple-400 dark:border-white/10 dark:bg-[#201b35]"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto flex h-[calc(100dvh-77px)] max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-6">
        <section className="mb-4 flex items-start gap-3 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:border-white/10 dark:from-purple-500/10 dark:to-blue-500/10">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-300"
            size={20}
          />
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">
            VitaAI provides general health information, not a
            medical diagnosis. For severe or life-threatening
            symptoms, seek emergency care immediately.
          </p>
        </section>

        <section
          aria-label="Chat messages"
          aria-live="polite"
          className="flex-1 space-y-5 overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/[0.03]"
        >
          {messages.map((item, index) => (
            <div
              key={`${index}-${item.role}`}
              className={`flex items-start gap-3 ${
                item.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.role === "assistant"
                    ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white"
                }`}
              >
                {item.role === "assistant" ? (
                  <Bot size={19} />
                ) : (
                  <UserRound size={19} />
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                  item.role === "user"
                    ? "rounded-tr-sm bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                    : "rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                }`}
              >
                {item.emergency && (
                  <div className="mb-2 flex items-center gap-2 font-semibold text-red-600 dark:text-red-300">
                    <AlertTriangle size={17} />
                    Emergency warning
                  </div>
                )}

                <p className="whitespace-pre-wrap break-words">
                  {item.content}
                </p>

                {item.emergency && (
                  <a
                    href="tel:112"
                    className="mt-3 inline-flex items-center rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                  >
                    Call emergency services — 112
                  </a>
                )}

                {item.disclaimer && (
                  <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                    {item.disclaimer}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300">
                <Bot size={19} />
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                <LoaderCircle size={16} className="animate-spin" />
                VitaAI is thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        {(recording || transcribing) && (
          <section
            aria-live="polite"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-400/20 dark:bg-purple-500/10"
          >
            {recording ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Recording your symptoms
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-200/80">
                    Speak clearly. Maximum recording time: 2 minutes.
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatDuration(recordingSeconds)}
                </span>
              </>
            ) : (
              <>
                <LoaderCircle
                  size={19}
                  className="animate-spin text-purple-600 dark:text-purple-300"
                />
                <div>
                  <p className="text-sm font-semibold">
                    Transcribing your audio...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This may take a few moments.
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {!voiceSupported && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Voice recording is unavailable in this browser. You can
            still type your symptoms below.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
          >
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-400/10"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/30 focus-within:border-purple-300 dark:border-white/10 dark:bg-[#151326] dark:shadow-black/10"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Describe your symptoms or ask a health question..."
            aria-label="Your health question"
            rows={2}
            maxLength={3000}
            className="max-h-36 min-h-12 w-full resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
            disabled={sending || recording || transcribing}
          />

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-2">
              {recording ? (
                <>
                  <button
                    type="button"
                    onClick={finishRecording}
                    aria-label="Stop recording and transcribe"
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 px-3 text-sm font-semibold text-white shadow-md shadow-purple-500/20 hover:brightness-110"
                  >
                    <Square size={15} fill="currentColor" />
                    <span>Stop & transcribe</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelRecording}
                    aria-label="Cancel recording"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={
                    !voiceSupported || sending || transcribing
                  }
                  aria-label="Record symptoms using microphone"
                  title="Speak your symptoms"
                  className="flex h-10 items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-200 dark:hover:bg-purple-400/20"
                >
                  <Mic size={18} />
                  <span className="hidden sm:inline">
                    {transcribing ? "Transcribing..." : "Speak symptoms"}
                  </span>
                  <span className="sm:hidden">Voice</span>
                </button>
              )}

              {input.trim() && !recording && !transcribing && (
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    setError("");
                  }}
                  aria-label="Clear message"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
                  title="Clear text"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={
                sending ||
                recording ||
                transcribing ||
                !input.trim()
              }
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : transcribing ? (
                <AudioLines size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>

        {input.trim() && !recording && !transcribing && (
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-slate-400">
            <Check size={12} />
            Review the text above, edit if needed, then send it to VitaAI.
          </p>
        )}

        <p className="mt-2 text-center text-[11px] text-slate-400">
          For emergencies in India, call 112. Do not wait for an AI response.
        </p>
      </main>
    </div>
  );
}
