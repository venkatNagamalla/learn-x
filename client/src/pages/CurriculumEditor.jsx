
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
  none: 'bg-slate-100 text-slate-600',
  uploaded: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-700',
};

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

  // VIDEO UPLOAD STATE
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

  // POLL VIDEO STATUS EVERY 5 SECONDS
  useEffect(() => {
    const pendingLessons = sections.flatMap((section) =>
      (section.lessons || [])
        .filter((lesson) =>
          ['uploaded', 'processing'].includes(
            lesson.processingStatus
          )
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
            const { data } = await api.get(
              `/lessons/${lessonId}/status`
            );

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

  // UPDATE A LESSON'S STATUS IN THE UI

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

  // UPLOAD FILE TO S3 WITH REAL-TIME PROGRESS

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

      // STEP 1: Request a presigned S3 upload URL.

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

      // STEP 2: Upload directly to S3 with progress tracking.

      setUploadFeedback((previous) => ({
        ...previous,
        [lessonId]: 'Uploading video to AWS S3...',
      }));

      await uploadFileToS3(data.uploadUrl, file, lessonId);

      // STEP 3: Verify upload and queue processing.

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

      const { data } = await api.post(
        `/lessons/${lessonId}/retry`
      );

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

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-600">
        Loading curriculum...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 text-center">
        Course not found or you are not authorized to manage it.
        <Link
          to="/instructor"
          className="ml-2 text-indigo-600 underline"
        >
          Back to My Courses
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">

        <Link
          to={`/instructor/courses/${courseId}/edit`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Course Details
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Curriculum Editor
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {course.title}
          </h1>

          <p className="mt-2 text-slate-600">
            Organize your course into sections and lessons.
          </p>

          <p className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium capitalize text-indigo-700">
            Status: {course.status}
          </p>
        </div>

        {/* ADD SECTION */}

        <form
          onSubmit={addSection}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row"
        >
          <input
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            placeholder="Enter new section title"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={addingSection || busy}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addingSection ? 'Adding...' : '+ Add Section'}
          </button>
        </form>

        {/* SECTIONS */}

        <div className="mt-8 space-y-5">
          {sections.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No sections yet. Add your first section above.
            </div>
          )}

          {sections.map((section, index) => (
            <div
              key={section._id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">

                {editingSectionId === section._id ? (
                  <div className="flex flex-1 flex-wrap gap-2">
                    <input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    />

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateSection(section._id)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionId(null);
                        setEditingTitle('');
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold text-slate-900">
                      Section {index + 1}: {section.title}
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => moveSection(index, -1)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={busy || index === sections.length - 1}
                        onClick={() => moveSection(index, 1)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditingSection(section)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteSection(section._id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* LESSON LIST */}

              <div className="mt-5 space-y-3">
                {(section.lessons || []).map((lesson, lessonIndex) => {
                  const videoStatus = lesson.processingStatus || 'none';

                  return (
                    <div
                      key={lesson._id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      {editingLesson?._id === lesson._id ? (
                        <div className="space-y-3">
                          <input
                            value={editingLesson.title}
                            onChange={(event) =>
                              setEditingLesson((previous) => ({
                                ...previous,
                                title: event.target.value,
                              }))
                            }
                            placeholder="Lesson title"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />

                          <textarea
                            value={editingLesson.description}
                            onChange={(event) =>
                              setEditingLesson((previous) => ({
                                ...previous,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Lesson description"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />

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
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editingLesson.isPreview}
                              onChange={(event) =>
                                setEditingLesson((previous) => ({
                                  ...previous,
                                  isPreview: event.target.checked,
                                }))
                              }
                            />
                            Free preview lesson
                          </label>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={updateLesson}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                              Save Lesson
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingLesson(null)}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800">
                              {lessonIndex + 1}. {lesson.title}
                            </p>

                            {lesson.description && (
                              <p className="mt-1 text-sm text-slate-500">
                                {lesson.description}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-slate-500">
                              {lesson.duration || 0} minutes
                              {lesson.isPreview && (
                                <span className="ml-2 rounded-full bg-green-100 px-2 py-1 font-medium text-green-700">
                                  Preview
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy || lessonIndex === 0}
                              onClick={() => moveLesson(section, lessonIndex, -1)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy ||
                                lessonIndex === section.lessons.length - 1
                              }
                              onClick={() => moveLesson(section, lessonIndex, 1)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                startEditingLesson(lesson, section._id)
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteLesson(lesson._id)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {/* VIDEO UPLOAD */}

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-800">
                            Lesson Video
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[videoStatus] || STATUS_STYLES.none}`}
                          >
                            {videoStatus}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="file"
                            accept="video/mp4,video/quicktime,video/webm"
                            disabled={
                              busy || uploadingLessonId !== null
                            }
                            onChange={(event) =>
                              handleVideoFileChange(lesson._id, event)
                            }
                            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                          />

                          <button
                            type="button"
                            disabled={
                              busy ||
                              uploadingLessonId !== null ||
                              !selectedVideoFiles[lesson._id]
                            }
                            onClick={() => uploadLessonVideo(lesson._id)}
                            className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {uploadingLessonId === lesson._id
                              ? 'Uploading...'
                              : 'Upload Video'}
                          </button>
                        </div>

                        {/* UPLOAD PROGRESS BAR */}

                        {uploadingLessonId === lesson._id && (
                          <div className="mt-4">
                            <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                              <span>Upload progress</span>
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
                          <p className="mt-2 text-xs text-slate-500">
                            Selected: {selectedVideoFiles[lesson._id].name}
                            {' '}(
                            {(
                              selectedVideoFiles[lesson._id].size /
                              (1024 * 1024)
                            ).toFixed(2)} MB)
                          </p>
                        )}

                        {uploadFeedback[lesson._id] && (
                          <p className="mt-3 break-words text-sm text-indigo-700">
                            {uploadFeedback[lesson._id]}
                          </p>
                        )}

                        {/* RETRY BUTTON */}

                        {videoStatus === 'failed' && (
                          <button
                            type="button"
                            disabled={
                              retryingLessonId !== null ||
                              uploadingLessonId !== null
                            }
                            onClick={() => retryLessonVideo(lesson._id)}
                            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryingLessonId === lesson._id
                              ? 'Retrying...'
                              : 'Retry Processing'}
                          </button>
                        )}

                        {['uploaded', 'processing'].includes(videoStatus) && (
                          <p className="mt-3 text-xs text-blue-700">
                            Video processing is in progress. Status refreshes automatically every 5 seconds.
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          Supported formats: MP4, MOV and WEBM. Maximum size: 200 MB.
                        </p>
                      </div>
                    </div>
                  );
                })}

                {(section.lessons || []).length === 0 && (
                  <p className="text-sm text-slate-500">
                    No lessons in this section yet.
                  </p>
                )}
              </div>

              {/* ADD LESSON */}

              <form
                onSubmit={(event) => addLesson(event, section)}
                className="mt-5 space-y-3 rounded-lg border border-dashed border-slate-300 p-4"
              >
                <h3 className="font-semibold text-slate-800">
                  Add Lesson
                </h3>

                <input
                  value={newLessons[section._id]?.title || ''}
                  onChange={(event) =>
                    handleNewLessonChange(
                      section._id,
                      'title',
                      event.target.value
                    )
                  }
                  placeholder="Lesson title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <textarea
                  value={newLessons[section._id]?.description || ''}
                  onChange={(event) =>
                    handleNewLessonChange(
                      section._id,
                      'description',
                      event.target.value
                    )
                  }
                  placeholder="Lesson description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

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
                  placeholder="Duration in minutes"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <label className="flex items-center gap-2 text-sm text-slate-600">
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
                  />
                  Free preview lesson
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  + Add Lesson
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
