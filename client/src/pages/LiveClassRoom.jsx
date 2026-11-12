
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

// Saves chat messages to MongoDB with the actual sender's ID.
// This component must be rendered inside LiveKitRoom.
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

        // Ignore messages without a valid sender or text.
        if (!senderId || !messageText) {
          continue;
        }

        const messageKey =
          message.id ||
          `${message.timestamp}-${senderId}-${messageText}`;

        if (savedMessages.current.has(messageKey)) {
          continue;
        }

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Connecting to your live class...
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-slate-900">
            Unable to Join Live Class
          </h1>

          <p className="mt-3 text-slate-600">
            {error ||
              'LiveKit connection details are unavailable.'}
          </p>

          <button
            onClick={handleLeave}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="flex items-center justify-between gap-4 bg-slate-900 px-4 py-3 text-white">
        <div>
          <h1 className="font-bold">Live Class</h1>
          <p className="text-xs text-slate-400">
            Connected to LiveKit
          </p>
        </div>

        <button
          onClick={handleLeave}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
        >
          Leave Class
        </button>
      </div>

      <div className="h-[calc(100vh-64px)]">
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          audio={true}
          video={true}
          onDisconnected={handleLeave}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />

          {isHost && <ChatRecorder classId={id} />}
        </LiveKitRoom>
      </div>
    </main>
  );
}
