
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

const emptyLesson = {
  title: '',
  description: '',
  duration: 0,
  isPreview: false,
};

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const STATUS_STYLES = {
  none: 'bg-slate-100 text-slate-700',
  uploaded: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

const primaryButton =
  'rounded-xl bg-indigo-600 px-5 py-3 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButton =
  'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

export default function CurriculumEditor() {
  const { id: courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [newLessons, setNewLessons] = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [busy, setBusy] = useState(false);

  const [selectedVideoFiles, setSelectedVideoFiles] = useState({});
  const [uploadingLessonId, setUploadingLessonId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadFeedback, setUploadFeedback] = useState({});
  const [retryingLessonId, setRetryingLessonId] = useState(null);

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get(`/courses/manage/${courseId}`);

      setCourse(data.course);
      setSections(data.sections || []);
    } catch (error) {
      setCourse(null);
      setSections([]);

      toast.error(
        error.response?.data?.message || 'Failed to load curriculum.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  // Automatically refresh pending video processing statuses.
  useEffect(() => {
    const pendingLessons = sections.flatMap((section) =>
      (section.lessons || [])
        .filter((lesson) =>
          ['uploaded', 'processing'].includes(lesson.processingStatus)
        )
        .map((lesson) => lesson._id)
    );

    if (pendingLessons.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const pollStatuses = async () => {
      await Promise.all(
        pendingLessons.map(async (lessonId) => {
          try {
            const { data } = await api.get(`/lessons/${lessonId}/status`);

            if (cancelled) return;

            setSections((previous) =>
              previous.map((section) => ({
                ...section,
                lessons: (section.lessons || []).map((lesson) =>
                  lesson._id === lessonId
                    ? {
                        ...lesson,
                        processingStatus: data.processingStatus,
                        duration: data.duration || lesson.duration,
                      }
                    : lesson
                ),
              }))
            );
          } catch (error) {
            if (!cancelled) {
              console.error(
                `Failed to poll lesson ${lessonId}:`,
                error.response?.data?.message || error.message
              );
            }
          }
        })
      );
    };

    const intervalId = window.setInterval(pollStatuses, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sections]);

  // SECTION MANAGEMENT

  const addSection = async (event) => {
    event.preventDefault();

    if (!newSectionTitle.trim()) {
      toast.error('Enter a section title.');
      return;
    }

    try {
      setAddingSection(true);

      await api.post(`/courses/${courseId}/sections`, {
        title: newSectionTitle.trim(),
        order: sections.length + 1,
      });

      toast.success('Section added successfully!');
      setNewSectionTitle('');
      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to add section.'
      );
    } finally {
      setAddingSection(false);
    }
  };

  const startEditingSection = (section) => {
    setEditingSectionId(section._id);
    setEditingTitle(section.title);
  };

  const updateSection = async (sectionId) => {
    if (!editingTitle.trim()) {
      toast.error('Section title cannot be empty.');
      return;
    }

    try {
      setBusy(true);

      await api.put(`/courses/sections/${sectionId}`, {
        title: editingTitle.trim(),
      });

      toast.success('Section updated!');
      setEditingSectionId(null);
      setEditingTitle('');
      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update section.'
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section and all its lessons?')) {
      return;
    }

    try {
      setBusy(true);

      await api.delete(`/courses/sections/${sectionId}`);

      toast.success('Section deleted.');
      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete section.'
      );
    } finally {
      setBusy(false);
    }
  };

  const moveSection = async (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const currentSection = sections[index];
    const targetSection = sections[targetIndex];

    try {
      setBusy(true);

      await Promise.all([
        api.put(`/courses/sections/${currentSection._id}`, {
          order: targetSection.order,
        }),
        api.put(`/courses/sections/${targetSection._id}`, {
          order: currentSection.order,
        }),
      ]);

      await loadCurriculum();
      toast.success('Section order updated.');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to reorder sections.'
      );
    } finally {
      setBusy(false);
    }
  };

  // LESSON MANAGEMENT

  const handleNewLessonChange = (sectionId, field, value) => {
    setNewLessons((previous) => ({
      ...previous,
      [sectionId]: {
        ...emptyLesson,
        ...previous[sectionId],
        [field]: value,
      },
    }));
  };

  const addLesson = async (event, section) => {
    event.preventDefault();

    const lesson = newLessons[section._id] || emptyLesson;

    if (!lesson.title.trim()) {
      toast.error('Enter a lesson title.');
      return;
    }

    try {
      setBusy(true);

      await api.post(
        `/courses/${courseId}/sections/${section._id}/lessons`,
        {
          title: lesson.title.trim(),
          description: lesson.description.trim(),
          duration: Number(lesson.duration) || 0,
          isPreview: lesson.isPreview,
          order: (section.lessons?.length || 0) + 1,
        }
      );

      toast.success('Lesson added successfully!');

      setNewLessons((previous) => ({
        ...previous,
        [section._id]: emptyLesson,
      }));

      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to add lesson.'
      );
    } finally {
      setBusy(false);
    }
  };

  const startEditingLesson = (lesson, sectionId) => {
    setEditingLesson({
      ...lesson,
      sectionId,
      duration: lesson.duration || 0,
      description: lesson.description || '',
    });
  };

  const updateLesson = async () => {
    if (!editingLesson?.title.trim()) {
      toast.error('Lesson title cannot be empty.');
      return;
    }

    try {
      setBusy(true);

      await api.put(`/courses/lessons/${editingLesson._id}`, {
        title: editingLesson.title.trim(),
        description: editingLesson.description.trim(),
        duration: Number(editingLesson.duration) || 0,
        isPreview: editingLesson.isPreview,
      });

      toast.success('Lesson updated!');
      setEditingLesson(null);
      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update lesson.'
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      setBusy(true);

      await api.delete(`/courses/lessons/${lessonId}`);

      toast.success('Lesson deleted.');
      await loadCurriculum();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete lesson.'
      );
    } finally {
      setBusy(false);
    }
  };

  const moveLesson = async (section, index, direction) => {
    const lessons = section.lessons || [];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const currentLesson = lessons[index];
    const targetLesson = lessons[targetIndex];

    try {
      setBusy(true);

      await Promise.all([
        api.put(`/courses/lessons/${currentLesson._id}`, {
          order: targetLesson.order,
        }),
        api.put(`/courses/lessons/${targetLesson._id}`, {
          order: currentLesson.order,
        }),
      ]);

      await loadCurriculum();
      toast.success('Lesson order updated.');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to reorder lessons.'
      );
    } finally {
      setBusy(false);
    }
  };

  // UPDATE VIDEO STATUS IN THE UI

  const updateLessonStatus = (lessonId, status) => {
    setSections((previous) =>
      previous.map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) =>
          lesson._id === lessonId
            ? { ...lesson, processingStatus: status }
            : lesson
        ),
      }))
    );
  };

  // VIDEO FILE SELECTION

  const handleVideoFileChange = (lessonId, event) => {
    const file = event.target.files?.[0] || null;

    setSelectedVideoFiles((previous) => ({
      ...previous,
      [lessonId]: file,
    }));

    setUploadFeedback((previous) => ({
      ...previous,
      [lessonId]: '',
    }));

    setUploadProgress((previous) => ({
      ...previous,
      [lessonId]: 0,
    }));

    event.target.value = '';
  };

  // DIRECT S3 UPLOAD WITH PROGRESS

  const uploadFileToS3 = (uploadUrl, file, lessonId) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round(
            (event.loaded / event.total) * 100
          );

          setUploadProgress((previous) => ({
            ...previous,
            [lessonId]: percentage,
          }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `S3 upload failed (${xhr.status}). ${
                xhr.responseText || 'Please check your AWS configuration.'
              }`
            )
          );
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading video to S3.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Video upload was cancelled.'));
      });

      xhr.send(file);
    });

  // VIDEO UPLOAD TO AWS S3

  const uploadLessonVideo = async (lessonId) => {
    const file = selectedVideoFiles[lessonId];

    if (!file) {
      toast.error('Please select a video first.');
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Only MP4, MOV and WEBM videos are allowed.');
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      toast.error(
        'Video size must be greater than 0 and no more than 200 MB.'
      );
      return;
    }

    try {
      setUploadingLessonId(lessonId);

      setUploadProgress((previous) => ({
        ...previous,
        [lessonId]: 0,
      }));

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]: 'Generating secure upload URL...',
      }));

      const { data } = await api.post(
        `/lessons/${lessonId}/upload-url`,
        {
          contentType: file.type,
          fileSize: file.size,
        }
      );

      if (!data.uploadUrl) {
        throw new Error('Upload URL was not returned by the server.');
      }

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]: 'Uploading video to AWS S3...',
      }));

      await uploadFileToS3(data.uploadUrl, file, lessonId);

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]: 'Verifying video and starting processing...',
      }));

      const { data: completeData } = await api.post(
        `/lessons/${lessonId}/upload-complete`
      );

      setSelectedVideoFiles((previous) => ({
        ...previous,
        [lessonId]: null,
      }));

      updateLessonStatus(lessonId, 'uploaded');

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]:
          completeData.message ||
          'Video uploaded successfully. Processing has been queued.',
      }));

      toast.success('Video uploaded and processing queued!');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Video upload failed.';

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]: `Upload failed: ${message}`,
      }));

      toast.error(message);
    } finally {
      setUploadingLessonId(null);
    }
  };

  // RETRY FAILED VIDEO PROCESSING

  const retryLessonVideo = async (lessonId) => {
    try {
      setRetryingLessonId(lessonId);

      const { data } = await api.post(`/lessons/${lessonId}/retry`);

      updateLessonStatus(lessonId, 'uploaded');

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]:
          data.message || 'Video processing retry has been queued.',
      }));

      toast.success('Video processing retry queued!');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Failed to retry video processing.';

      toast.error(message);
    } finally {
      setRetryingLessonId(null);
    }
  };

  const totalLessons = sections.reduce(
    (total, section) => total + (section.lessons || []).length,
    0
  );

  const readyVideos = sections.reduce(
    (total, section) =>
      total +
      (section.lessons || []).filter(
        (lesson) => lesson.processingStatus === 'ready'
      ).length,
    0
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading curriculum...
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">📚</div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            Course not found
          </h2>
          <p className="mt-2 text-base text-slate-600">
            This course could not be found or you are not authorized to manage it.
          </p>
          <Link
            to="/instructor/courses"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
            style={{ color: '#FFFFFF' }}
          >
            Back to My Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <Link
          to={`/instructor/courses/${courseId}/edit`}
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Course Details
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-7 shadow-lg sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border-[30px] border-white/10" />

          <div className="relative">
            <p
              className="text-base font-bold uppercase tracking-[0.16em]"
              style={{ color: '#E0E7FF' }}
            >
              Instructor Workspace / Curriculum
            </p>

            <h1
              className="mt-3 text-3xl font-bold sm:text-4xl"
              style={{ color: '#FFFFFF' }}
            >
              {course.title}
            </h1>

            <p
              className="mt-3 max-w-2xl text-lg leading-7"
              style={{ color: '#EEF2FF' }}
            >
              Build a structured learning experience by organizing your course into sections and lessons.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold capitalize"
                style={{ color: '#FFFFFF' }}
              >
                Status: {course.status}
              </span>

              <span
                className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold"
                style={{ color: '#FFFFFF' }}
              >
                {sections.length} Sections
              </span>

              <span
                className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold"
                style={{ color: '#FFFFFF' }}
              >
                {totalLessons} Lessons
              </span>
            </div>
          </div>
        </section>

        
{/* OVERVIEW */}
<div className="mt-5 grid gap-4 sm:grid-cols-3">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-base font-semibold text-slate-500">
      Total Sections
    </p>
    <p
      className="mt-2 font-bold tracking-tight text-slate-900"
      style={{ fontSize: '44px', lineHeight: 1.15 }}
    >
      {sections.length}
    </p>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-base font-semibold text-slate-500">
      Total Lessons
    </p>
    <p
      className="mt-2 font-bold tracking-tight text-slate-900"
      style={{ fontSize: '44px', lineHeight: 1.15 }}
    >
      {totalLessons}
    </p>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-base font-semibold text-slate-500">
      Videos Ready
    </p>
    <p
      className="mt-2 font-bold tracking-tight text-emerald-600"
      style={{ fontSize: '44px', lineHeight: 1.15 }}
    >
      {readyVideos}
    </p>
  </div>
</div>


        {/* ADD SECTION */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Add a New Section
            </h2>
            <p className="mt-1 text-base text-slate-500">
              Sections help divide your course into organized topics.
            </p>
          </div>

          <form
            onSubmit={addSection}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              placeholder="Enter section title"
              className={inputClass}
            />

            <button
              type="submit"
              disabled={addingSection || busy}
              className={`${primaryButton} shrink-0`}
              style={{ color: '#FFFFFF' }}
            >
              {addingSection ? 'Adding...' : '+ Add Section'}
            </button>
          </form>
        </section>

        {/* SECTIONS */}
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Course Curriculum
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Manage your sections, lessons, and video content.
              </p>
            </div>
          </div>

          {sections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="text-5xl">🗂️</div>
              <h3 className="mt-4 text-xl font-bold text-slate-800">
                No sections yet
              </h3>
              <p className="mt-2 text-base text-slate-500">
                Add your first section above to start building your curriculum.
              </p>
            </div>
          )}

          <div className="space-y-5">
            {sections.map((section, index) => (
              <section
                key={section._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* SECTION HEADER */}
                <div className="border-b border-slate-100 bg-slate-50/80 p-5 sm:p-6">
                  {editingSectionId === section._id ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        className={inputClass}
                        autoFocus
                      />

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateSection(section._id)}
                        className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                        style={{ color: '#FFFFFF' }}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(null);
                          setEditingTitle('');
                        }}
                        className={secondaryButton}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg font-bold text-indigo-700">
                          {index + 1}
                        </div>

                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
                            Section {index + 1}
                          </p>
                          <h3 className="mt-1 text-xl font-bold text-slate-900">
                            {section.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {(section.lessons || []).length} Lessons
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => moveSection(index, -1)}
                          className={secondaryButton}
                          title="Move section up"
                        >
                          ↑ Move Up
                        </button>

                        <button
                          type="button"
                          disabled={busy || index === sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                          className={secondaryButton}
                          title="Move section down"
                        >
                          ↓ Move Down
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEditingSection(section)}
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteSection(section._id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5 p-5 sm:p-6">

                  {/* LESSON LIST */}
                  <div className="space-y-4">
                    {(section.lessons || []).map((lesson, lessonIndex) => {
                      const videoStatus = lesson.processingStatus || 'none';

                      return (
                        <article
                          key={lesson._id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        >
                          {/* LESSON DETAILS */}
                          <div className="p-4 sm:p-5">
                            {editingLesson?._id === lesson._id ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Lesson Title
                                  </label>
                                  <input
                                    value={editingLesson.title}
                                    onChange={(event) =>
                                      setEditingLesson((previous) => ({
                                        ...previous,
                                        title: event.target.value,
                                      }))
                                    }
                                    placeholder="Lesson title"
                                    className={inputClass}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Description
                                  </label>
                                  <textarea
                                    value={editingLesson.description}
                                    onChange={(event) =>
                                      setEditingLesson((previous) => ({
                                        ...previous,
                                        description: event.target.value,
                                      }))
                                    }
                                    placeholder="Lesson description"
                                    rows={3}
                                    className={inputClass}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Duration (minutes)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingLesson.duration}
                                    onChange={(event) =>
                                      setEditingLesson((previous) => ({
                                        ...previous,
                                        duration: event.target.value,
                                      }))
                                    }
                                    placeholder="Duration in minutes"
                                    className={inputClass}
                                  />
                                </div>

                                <label className="flex items-center gap-3 text-base font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={editingLesson.isPreview}
                                    onChange={(event) =>
                                      setEditingLesson((previous) => ({
                                        ...previous,
                                        isPreview: event.target.checked,
                                      }))
                                    }
                                    className="h-5 w-5 accent-indigo-600"
                                  />
                                  Free preview lesson
                                </label>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={updateLesson}
                                    className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                                    style={{ color: '#FFFFFF' }}
                                  >
                                    Save Lesson
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditingLesson(null)}
                                    className={secondaryButton}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700">
                                    {lessonIndex + 1}
                                  </div>

                                  <div>
                                    <h4 className="text-lg font-bold text-slate-900">
                                      {lesson.title}
                                    </h4>

                                    {lesson.description && (
                                      <p className="mt-1 text-base leading-6 text-slate-600">
                                        {lesson.description}
                                      </p>
                                    )}

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                                      <span>
                                        {lesson.duration || 0} minutes
                                      </span>

                                      {lesson.isPreview && (
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
                                          Free Preview
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={busy || lessonIndex === 0}
                                    onClick={() =>
                                      moveLesson(section, lessonIndex, -1)
                                    }
                                    className={secondaryButton}
                                    title="Move lesson up"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      busy ||
                                      lessonIndex === section.lessons.length - 1
                                    }
                                    onClick={() =>
                                      moveLesson(section, lessonIndex, 1)
                                    }
                                    className={secondaryButton}
                                    title="Move lesson down"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      startEditingLesson(lesson, section._id)
                                    }
                                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => deleteLesson(lesson._id)}
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* VIDEO MANAGEMENT */}
                          <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h4 className="text-base font-bold text-slate-900">
                                  Lesson Video
                                </h4>
                                <p className="mt-1 text-sm text-slate-500">
                                  Upload and manage this lesson's video.
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1.5 text-sm font-bold capitalize ${
                                  STATUS_STYLES[videoStatus] || STATUS_STYLES.none
                                }`}
                              >
                                {videoStatus}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                              <input
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm"
                                disabled={
                                  busy || uploadingLessonId !== null
                                }
                                onChange={(event) =>
                                  handleVideoFileChange(lesson._id, event)
                                }
                                className="block w-full min-w-0 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2.5 file:font-bold file:text-indigo-700 hover:file:bg-indigo-200"
                              />

                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  uploadingLessonId !== null ||
                                  !selectedVideoFiles[lesson._id]
                                }
                                onClick={() => uploadLessonVideo(lesson._id)}
                                className={`${primaryButton} shrink-0`}
                                style={{ color: '#FFFFFF' }}
                              >
                                {uploadingLessonId === lesson._id
                                  ? 'Uploading...'
                                  : 'Upload Video'}
                              </button>
                            </div>

                            {uploadingLessonId === lesson._id && (
                              <div className="mt-5">
                                <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
                                  <span>Upload Progress</span>
                                  <span>
                                    {uploadProgress[lesson._id] || 0}%
                                  </span>
                                </div>

                                <div
                                  className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
                                  role="progressbar"
                                  aria-valuenow={uploadProgress[lesson._id] || 0}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                >
                                  <div
                                    className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                                    style={{
                                      width: `${uploadProgress[lesson._id] || 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {selectedVideoFiles[lesson._id] && (
                              <p className="mt-3 break-all text-sm text-slate-600">
                                <span className="font-bold">Selected:</span>{' '}
                                {selectedVideoFiles[lesson._id].name} (
                                {(
                                  selectedVideoFiles[lesson._id].size /
                                  (1024 * 1024)
                                ).toFixed(2)} MB)
                              </p>
                            )}

                            {uploadFeedback[lesson._id] && (
                              <p className="mt-3 break-words rounded-xl bg-indigo-50 p-3 text-sm font-medium text-indigo-800">
                                {uploadFeedback[lesson._id]}
                              </p>
                            )}

                            {videoStatus === 'failed' && (
                              <button
                                type="button"
                                disabled={
                                  retryingLessonId !== null ||
                                  uploadingLessonId !== null
                                }
                                onClick={() => retryLessonVideo(lesson._id)}
                                className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ color: '#FFFFFF' }}
                              >
                                {retryingLessonId === lesson._id
                                  ? 'Retrying...'
                                  : 'Retry Processing'}
                              </button>
                            )}

                            {['uploaded', 'processing'].includes(videoStatus) && (
                              <p className="mt-3 text-sm font-medium text-blue-700">
                                Video processing is in progress. Status refreshes automatically every 5 seconds.
                              </p>
                            )}

                            <p className="mt-3 text-sm text-slate-500">
                              Supported formats: MP4, MOV and WEBM. Maximum size: 200 MB.
                            </p>
                          </div>
                        </article>
                      );
                    })}

                    {(section.lessons || []).length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center">
                        <p className="text-base font-medium text-slate-500">
                          No lessons in this section yet.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ADD LESSON */}
                  <form
                    onSubmit={(event) => addLesson(event, section)}
                    className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-5"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        + Add a Lesson
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add the next learning topic to this section.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Lesson Title
                        </label>
                        <input
                          value={newLessons[section._id]?.title || ''}
                          onChange={(event) =>
                            handleNewLessonChange(
                              section._id,
                              'title',
                              event.target.value
                            )
                          }
                          placeholder="Enter lesson title"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Description
                        </label>
                        <textarea
                          value={newLessons[section._id]?.description || ''}
                          onChange={(event) =>
                            handleNewLessonChange(
                              section._id,
                              'description',
                              event.target.value
                            )
                          }
                          placeholder="Describe what this lesson covers"
                          rows={3}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newLessons[section._id]?.duration ?? ''}
                          onChange={(event) =>
                            handleNewLessonChange(
                              section._id,
                              'duration',
                              event.target.value
                            )
                          }
                          placeholder="Enter duration in minutes"
                          className={inputClass}
                        />
                      </div>

                      <label className="flex items-center gap-3 text-base font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={newLessons[section._id]?.isPreview || false}
                          onChange={(event) =>
                            handleNewLessonChange(
                              section._id,
                              'isPreview',
                              event.target.checked
                            )
                          }
                          className="h-5 w-5 accent-indigo-600"
                        />
                        Make this a free preview lesson
                      </label>

                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={busy}
                          className={primaryButton}
                          style={{ color: '#FFFFFF' }}
                        >
                          + Add Lesson
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
