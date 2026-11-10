
import { useCallback, useEffect, useState } from 'react';
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

export default function QuizBuilder() {
  const { id: courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [form, setForm] = useState(createEmptyForm());
  const [editingQuizId, setEditingQuizId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      <div className="py-20 text-center text-slate-600">
        Loading quiz builder...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 text-center text-slate-600">
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
      <div className="mx-auto max-w-5xl">

        <Link
          to="/instructor"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to My Courses
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-purple-600">
            Instructor Workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Quiz Builder
          </h1>

          <p className="mt-2 text-slate-600">
            Create and manage quizzes for:
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-800">
            {course.title}
          </h2>
        </div>

        {/* QUIZ FORM */}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              {editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}
            </h2>

            {editingQuizId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-semibold text-slate-600 hover:text-red-600"
              >
                Cancel Editing
              </button>
            )}
          </div>

          {/* QUIZ TITLE */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
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
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </div>

          {/* SECTION AND SETTINGS */}

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-purple-500"
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
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Passing Percentage
              </label>

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
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* QUESTIONS */}

          <div className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Questions ({form.questions.length})
              </h2>

              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
              >
                + Add Question
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {form.questions.map((question, questionIndex) => (
                <div
                  key={questionIndex}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800">
                      Question {questionIndex + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-sm font-semibold text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  {/* QUESTION TEXT */}

                  <textarea
                    value={question.text}
                    onChange={(event) =>
                      updateQuestion(
                        questionIndex,
                        'text',
                        event.target.value
                      )
                    }
                    rows={2}
                    required
                    placeholder="Enter your question..."
                    className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-purple-500"
                  />

                  {/* FOUR OPTIONS */}

                  <div className="mt-5">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Options
                    </p>

                    <p className="mb-3 text-xs text-slate-500">
                      Select the radio button beside the correct answer.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`flex items-center gap-3 rounded-lg border p-3 ${
                            Number(question.correctIndex) === optionIndex
                              ? 'border-green-400 bg-green-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${questionIndex}`}
                            checked={
                              Number(question.correctIndex) === optionIndex
                            }
                            onChange={() =>
                              updateQuestion(
                                questionIndex,
                                'correctIndex',
                                optionIndex
                              )
                            }
                            className="h-4 w-4 accent-green-600"
                            aria-label={`Mark option ${optionIndex + 1} as correct`}
                          />

                          <span className="w-6 shrink-0 text-sm font-semibold text-slate-500">
                            {String.fromCharCode(65 + optionIndex)}.
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
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EXPLANATION */}

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Answer Explanation
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAVE BUTTON */}

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Form
            </button>
          </div>
        </form>

        {/* EXISTING QUIZZES */}

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Existing Quizzes
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Edit or delete quizzes already created for this course.
          </p>

          {quizzes.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No quizzes created yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz._id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {quiz.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {getSectionTitle(
                        quiz.section?._id || quiz.section
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700">
                        {quiz.questions?.length || 0} Questions
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        Pass: {quiz.passPercent}%
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        Attempts: {quiz.maxAttempts}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => editQuiz(quiz)}
                      className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteQuiz(quiz._id)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
