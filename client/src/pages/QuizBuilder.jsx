
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

const createEmptyQuestion = () => ({
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
});

const createEmptyForm = () => ({
  title: '',
  section: '',
  passPercent: 60,
  maxAttempts: 3,
  questions: [createEmptyQuestion()],
});

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const primaryButtonStyle = { color: '#FFFFFF' };

export default function QuizBuilder() {
  const { id: courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [form, setForm] = useState(createEmptyForm());
  const [editingQuizId, setEditingQuizId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [curriculumResponse, quizResponse] = await Promise.all([
        api.get(`/courses/manage/${courseId}`),
        api.get(`/courses/${courseId}/quizzes`),
      ]);

      setCourse(curriculumResponse.data.course);
      setSections(curriculumResponse.data.sections || []);
      setQuizzes(quizResponse.data.quizzes || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load course quizzes.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalQuestions = useMemo(
    () =>
      quizzes.reduce(
        (total, quiz) => total + (quiz.questions?.length || 0),
        0
      ),
    [quizzes]
  );

  const updateQuestion = (questionIndex, field, value) => {
    setForm((previous) => ({
      ...previous,
      questions: previous.questions.map((question, index) =>
        index === questionIndex
          ? { ...question, [field]: value }
          : question
      ),
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setForm((previous) => ({
      ...previous,
      questions: previous.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentIndex) =>
                currentIndex === optionIndex ? value : option
              ),
            }
          : question
      ),
    }));
  };

  const addQuestion = () => {
    setForm((previous) => ({
      ...previous,
      questions: [
        ...previous.questions,
        createEmptyQuestion(),
      ],
    }));
  };

  const removeQuestion = (questionIndex) => {
    if (form.questions.length === 1) {
      toast.error('A quiz must have at least one question.');
      return;
    }

    setForm((previous) => ({
      ...previous,
      questions: previous.questions.filter(
        (_, index) => index !== questionIndex
      ),
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingQuizId(null);
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('Enter a quiz title.');
      return false;
    }

    if (
      !Number.isInteger(Number(form.passPercent)) ||
      Number(form.passPercent) < 0 ||
      Number(form.passPercent) > 100
    ) {
      toast.error('Passing percentage must be between 0 and 100.');
      return false;
    }

    if (
      !Number.isInteger(Number(form.maxAttempts)) ||
      Number(form.maxAttempts) < 1
    ) {
      toast.error('Maximum attempts must be at least 1.');
      return false;
    }

    for (let i = 0; i < form.questions.length; i++) {
      const question = form.questions[i];

      if (!question.text.trim()) {
        toast.error(`Enter text for question ${i + 1}.`);
        return false;
      }

      if (question.options.some((option) => !option.trim())) {
        toast.error(`Fill all four options for question ${i + 1}.`);
        return false;
      }

      if (
        !Number.isInteger(Number(question.correctIndex)) ||
        Number(question.correctIndex) < 0 ||
        Number(question.correctIndex) > 3
      ) {
        toast.error(`Select the correct answer for question ${i + 1}.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const payload = {
      course: courseId,
      section: form.section || null,
      title: form.title.trim(),
      passPercent: Number(form.passPercent),
      maxAttempts: Number(form.maxAttempts),
      questions: form.questions.map((question) => ({
        text: question.text.trim(),
        options: question.options.map((option) => option.trim()),
        correctIndex: Number(question.correctIndex),
        explanation: question.explanation.trim(),
      })),
    };

    try {
      setSaving(true);

      if (editingQuizId) {
        await api.put(`/quizzes/${editingQuizId}`, payload);
        toast.success('Quiz updated successfully!');
      } else {
        await api.post('/quizzes', payload);
        toast.success('Quiz created successfully!');
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to save quiz.'
      );
    } finally {
      setSaving(false);
    }
  };

  const editQuiz = (quiz) => {
    setEditingQuizId(quiz._id);

    setForm({
      title: quiz.title || '',
      section: quiz.section?._id || quiz.section || '',
      passPercent: quiz.passPercent ?? 60,
      maxAttempts: quiz.maxAttempts ?? 3,
      questions: (quiz.questions || []).map((question) => ({
        text: question.text || '',
        options: [
          question.options?.[0] || '',
          question.options?.[1] || '',
          question.options?.[2] || '',
          question.options?.[3] || '',
        ],
        correctIndex: question.correctIndex ?? 0,
        explanation: question.explanation || '',
      })),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      setDeletingQuizId(quizId);

      await api.delete(`/quizzes/${quizId}`);

      if (editingQuizId === quizId) {
        resetForm();
      }

      toast.success('Quiz deleted successfully!');
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete quiz.'
      );
    } finally {
      setDeletingQuizId(null);
    }
  };

  const getSectionTitle = (sectionId) => {
    if (!sectionId) return 'Entire Course';

    const section = sections.find(
      (item) => item._id === sectionId
    );

    return section?.title || 'Section';
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-base font-medium text-slate-600">
            Loading quiz builder...
          </p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Course not found
          </h2>
          <p className="mt-2 text-base text-slate-600">
            You may not be authorized to manage this course.
          </p>
          <Link
            to="/instructor"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
            style={primaryButtonStyle}
          >
            Back to My Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">

        <Link
          to="/instructor"
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <span>←</span>
          Back to My Courses
        </Link>

        {/* HEADER */}

        <section className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-28 right-48 h-64 w-64 rounded-full bg-violet-300/10" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p
                  className="text-sm font-bold uppercase tracking-[0.18em]"
                  style={{ color: '#E0E7FF' }}
                >
                  Instructor Workspace
                </p>

                <h1
                  className="mt-2 text-3xl font-bold sm:text-4xl"
                  style={{ color: '#FFFFFF' }}
                >
                  Quiz Builder
                </h1>

                <p
                  className="mt-2 text-base sm:text-lg"
                  style={{ color: '#E0E7FF' }}
                >
                  Create assessments and test your students' knowledge.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p
                  className="text-sm font-medium"
                  style={{ color: '#E0E7FF' }}
                >
                  Managing course
                </p>
                <p
                  className="mt-1 max-w-xs text-lg font-bold"
                  style={{ color: '#FFFFFF' }}
                >
                  {course.title}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS */}

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-500">
              Total Quizzes
            </p>
            <p
              className="mt-2 font-bold tracking-tight text-slate-900"
              style={{ fontSize: '44px', lineHeight: 1.15 }}
            >
              {quizzes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-500">
              Total Questions
            </p>
            <p
              className="mt-2 font-bold tracking-tight text-indigo-600"
              style={{ fontSize: '44px', lineHeight: 1.15 }}
            >
              {totalQuestions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-semibold text-slate-500">
              Course Sections
            </p>
            <p
              className="mt-2 font-bold tracking-tight text-slate-900"
              style={{ fontSize: '44px', lineHeight: 1.15 }}
            >
              {sections.length}
            </p>
          </div>
        </section>

        {/* QUIZ FORM */}

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Quiz Configuration
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Configure the quiz details and assessment questions.
              </p>
            </div>

            {editingQuizId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
              >
                Cancel Editing
              </button>
            )}
          </div>

          {/* QUIZ TITLE */}

          <div>
            <label className="mb-2 block text-base font-semibold text-slate-700">
              Quiz Title
            </label>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              maxLength={150}
              required
              placeholder="e.g. JavaScript Fundamentals Quiz"
              className={inputClass}
            />
          </div>

          {/* SETTINGS */}

          <div className="rounded-xl bg-slate-50 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              Quiz Settings
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-base font-semibold text-slate-700">
                  Assign To
                </label>

                <select
                  value={form.section}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      section: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Entire Course</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-base font-semibold text-slate-700">
                  Passing Percentage
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.passPercent}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        passPercent: event.target.value,
                      }))
                    }
                    required
                    className={inputClass}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-base font-semibold text-slate-700">
                  Maximum Attempts
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxAttempts}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      maxAttempts: event.target.value,
                    }))
                  }
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* QUESTIONS */}

          <section className="border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Assessment Questions
                </h2>
                <p className="mt-1 text-base text-slate-500">
                  Add multiple-choice questions and mark the correct answer.
                </p>
              </div>

              <span className="rounded-full bg-indigo-50 px-4 py-2 text-base font-bold text-indigo-700">
                {form.questions.length} Questions
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {form.questions.map((question, questionIndex) => (
                <div
                  key={questionIndex}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
                        {questionIndex + 1}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Question {questionIndex + 1}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Multiple-choice question
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-base font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove Question
                    </button>
                  </div>

                  <div className="p-4 sm:p-5">
                    <label className="mb-2 block text-base font-semibold text-slate-700">
                      Question Text
                    </label>

                    <textarea
                      value={question.text}
                      onChange={(event) =>
                        updateQuestion(
                          questionIndex,
                          'text',
                          event.target.value
                        )
                      }
                      rows={3}
                      required
                      placeholder="Enter your question..."
                      className={inputClass}
                    />

                    {/* OPTIONS */}

                    <div className="mt-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-lg font-bold text-slate-900">
                          Answer Options
                        </h4>
                        <span className="text-sm font-medium text-slate-500">
                          Select the correct answer
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {question.options.map((option, optionIndex) => {
                          const isCorrect =
                            Number(question.correctIndex) === optionIndex;

                          return (
                            <label
                              key={optionIndex}
                              className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 transition ${
                                isCorrect
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : 'border-slate-200 bg-slate-50 hover:border-indigo-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${questionIndex}`}
                                checked={isCorrect}
                                onChange={() =>
                                  updateQuestion(
                                    questionIndex,
                                    'correctIndex',
                                    optionIndex
                                  )
                                }
                                className="h-5 w-5 shrink-0 accent-emerald-600"
                                aria-label={`Mark option ${optionIndex + 1} as correct`}
                              />

                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}
                              </span>

                              <input
                                value={option}
                                onChange={(event) =>
                                  updateOption(
                                    questionIndex,
                                    optionIndex,
                                    event.target.value
                                  )
                                }
                                required
                                placeholder={`Option ${optionIndex + 1}`}
                                className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
                              />

                              {isCorrect && (
                                <span className="shrink-0 text-xs font-bold text-emerald-700">
                                  Correct
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* EXPLANATION */}

                    <div className="mt-5">
                      <label className="mb-2 block text-base font-semibold text-slate-700">
                        Answer Explanation
                        <span className="ml-2 font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <textarea
                        value={question.explanation}
                        onChange={(event) =>
                          updateQuestion(
                            questionIndex,
                            'explanation',
                            event.target.value
                          )
                        }
                        rows={2}
                        placeholder="Explain why this is the correct answer..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-5 py-4 text-base font-bold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-100"
            >
              <span className="text-xl">+</span>
              Add Another Question
            </button>
          </section>

          {/* SAVE ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-bold shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              style={primaryButtonStyle}
            >
              {saving
                ? 'Saving...'
                : editingQuizId
                  ? 'Update Quiz'
                  : 'Create Quiz'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reset Form
            </button>
          </div>
        </form>

        {/* EXISTING QUIZZES */}

        <section className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Quiz Management
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Existing Quizzes
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Edit or delete quizzes already created for this course.
              </p>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-base font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
              {quizzes.length} Total
            </span>
          </div>

          {quizzes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                📝
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                No quizzes created yet
              </h3>
              <p className="mt-1 text-base text-slate-500">
                Create your first quiz using the form above.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {quizzes.map((quiz) => (
                <article
                  key={quiz._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">
                          {quiz.title}
                        </h3>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                          Active
                        </span>
                      </div>

                      <p className="mt-2 text-base text-slate-600">
                        {getSectionTitle(
                          quiz.section?._id || quiz.section
                        )}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                          {quiz.questions?.length || 0} Questions
                        </span>

                        <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                          Pass: {quiz.passPercent}%
                        </span>

                        <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                          Attempts: {quiz.maxAttempts}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-3">
                      <button
                        type="button"
                        onClick={() => editQuiz(quiz)}
                        className="rounded-xl border border-indigo-200 px-5 py-2.5 text-base font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={deletingQuizId === quiz._id}
                        onClick={() => deleteQuiz(quiz._id)}
                        className="rounded-xl border border-red-200 px-5 py-2.5 text-base font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingQuizId === quiz._id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
