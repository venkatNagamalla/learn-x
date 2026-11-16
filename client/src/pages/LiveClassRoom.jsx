
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useChat,
} from '@livekit/components-react';

import {
  getLiveClassToken,
  saveLiveClassMessage,
} from '../api/liveClassApi.js';

// Records chat messages with their actual sender IDs.
function ChatRecorder({ classId }) {
  const { chatMessages } = useChat();
  const savedMessages = useRef(new Set());

  useEffect(() => {
    let active = true;

    const saveMessages = async () => {
      for (const message of chatMessages) {
        if (!active) break;

        const senderId = message.from?.identity;
        const messageText = message.message?.trim();

        if (!senderId || !messageText) continue;

        const messageKey =
          message.id ||
          `${message.timestamp}-${senderId}-${messageText}`;

        if (savedMessages.current.has(messageKey)) continue;

        savedMessages.current.add(messageKey);

        try {
          await saveLiveClassMessage(
            classId,
            messageText,
            senderId
          );
        } catch (error) {
          savedMessages.current.delete(messageKey);

          if (active) {
            toast.error(
              error.response?.data?.message ||
                'Unable to save a chat message.'
            );
          }
        }
      }
    };

    saveMessages();

    return () => {
      active = false;
    };
  }, [chatMessages, classId]);

  return null;
}

function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-2xl font-extrabold tracking-tight"
    >
      <span style={{ color: '#A5B4FC' }}>Learn</span>
      <span className="text-white">X</span>
    </Link>
  );
}

function ConnectionLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/20">
          <svg
            className="h-10 w-10 animate-spin text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="3"
              opacity=".2"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-white">
          Preparing Your Classroom
        </h1>

        <p className="mt-3 text-base leading-7 text-slate-400">
          Connecting you to your instructor and classmates.
          Please wait a moment.
        </p>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-500" />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-500">
          Powered by Learn-X Live
        </p>
      </div>
    </main>
  );
}

function ConnectionError({ error, onBack }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div
          className="px-8 py-9 text-center"
          style={{
            background: 'linear-gradient(135deg, #991B1B, #DC2626)',
          }}
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/15">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-extrabold text-white">
            Unable to Join Class
          </h1>

          <p className="mt-3 text-base leading-7 text-white/90">
            We couldn't establish your classroom connection.
          </p>
        </div>

        <div className="p-8 text-center">
          <p className="text-base leading-7 text-slate-600">
            {error || 'LiveKit connection details are unavailable.'}
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-7 w-full rounded-xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-md transition hover:bg-indigo-700"
            style={{ color: '#FFFFFF' }}
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LiveClassRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const connectToClass = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getLiveClassToken(id);

        if (!data.token || !data.serverUrl) {
          throw new Error(
            'LiveKit connection details are missing.'
          );
        }

        if (active) {
          setToken(data.token);
          setServerUrl(data.serverUrl);
          setIsHost(data.isHost === true);
        }
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          'Unable to join the live class.';

        if (active) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    connectToClass();

    return () => {
      active = false;
    };
  }, [id]);

  const handleLeave = () => {
    navigate(-1);
  };

  if (loading) {
    return <ConnectionLoader />;
  }

  if (error || !token || !serverUrl) {
    return (
      <ConnectionError
        error={error}
        onBack={handleLeave}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#080D1B]">

      {/* Classroom Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#101729]">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-5">
            <Brand />

            <div className="hidden h-9 w-px bg-white/15 sm:block" />

            <div>
              <h1 className="text-base font-bold text-white sm:text-lg">
                Live Classroom
              </h1>

              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>

                <p className="text-xs font-medium text-slate-300 sm:text-sm">
                  Connected to classroom
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-4 py-2 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-extrabold text-white">
                {isHost ? 'I' : 'S'}
              </span>

              <span className="text-sm font-bold text-indigo-200">
                {isHost ? 'Instructor' : 'Student'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLeave}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:border-red-500 hover:bg-red-600 hover:text-white sm:px-5"
              style={{ color: '#FECACA' }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 15l3-3m0 0-3-3m3 3H9"
                />
              </svg>
              Leave Class
            </button>
          </div>
        </div>
      </header>

      
{/* Classroom Main Area */}
<section className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-3 py-4 sm:px-5 sm:py-6 lg:px-8">

  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p
        className="text-xs font-bold uppercase tracking-[0.18em]"
        style={{ color: '#A5B4FC' }}
      >
        LEARN-X LIVE
      </p>

      <h2
        className="mt-1 text-xl font-extrabold sm:text-2xl"
        style={{ color: '#FFFFFF' }}
      >
        Interactive Learning Session
      </h2>
    </div>

    <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span
        className="text-xs font-bold sm:text-sm"
        style={{ color: '#6EE7B7' }}
      >
        Live Session
      </span>
    </div>
  </div>

  <div className="min-h-[550px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl sm:min-h-[650px]">
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={handleLeave}
      style={{
        height: '100%',
        minHeight: '550px',
        color: '#FFFFFF',
        '--lk-fg': '#FFFFFF',
        '--lk-fg2': '#E2E8F0',
        '--lk-bg': '#111827',
        '--lk-bg2': '#1E293B',
      }}
    >
      <style>{`
        .lk-room-container,
        .lk-video-conference,
        .lk-chat,
        .lk-chat-messages,
        .lk-chat-entry,
        .lk-participant-tile,
        .lk-control-bar {
          color: #FFFFFF !important;
        }

        .lk-chat-header,
        .lk-chat-title,
        .lk-participant-name,
        .lk-participant-metadata,
        .lk-chat-message,
        .lk-chat-message-body,
        .lk-chat-message-text,
        .lk-chat p,
        .lk-chat h1,
        .lk-chat h2,
        .lk-chat h3 {
          color: #FFFFFF !important;
        }

        .lk-chat input,
        .lk-chat textarea,
        .lk-chat button,
        .lk-control-bar button {
          color: #FFFFFF !important;
        }

        .lk-chat input::placeholder,
        .lk-chat textarea::placeholder {
          color: #CBD5E1 !important;
        }
      `}</style>

      <VideoConference />
      <RoomAudioRenderer />

      {isHost && <ChatRecorder classId={id} />}
    </LiveKitRoom>
  </div>

  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101729] px-4 py-3">
    <p
      className="text-sm"
      style={{ color: '#E2E8F0' }}
    >
      Your connection is secured by LiveKit.
    </p>

    <p
      className="text-xs font-semibold"
      style={{ color: '#CBD5E1' }}
    >
      Learn-X · Learn Together. Grow Together.
    </p>
  </div>
</section>

    </main>
  );
}
