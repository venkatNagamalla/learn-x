
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

export default function QuizTaker({ quizId, onBack, onPassed }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setResult(null);
      setAnswers({});

      const { data } = await api.get(`/quizzes/${quizId}`);

      if (!data.quiz || !Array.isArray(data.quiz.questions)) {
        throw new Error('Invalid quiz data received from server.');
      }

      setQuiz(data.quiz);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Unable to load quiz.'
      );
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleAnswerChange = (questionId, selectedIndex) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: Number(selectedIndex),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!quiz) return;

    const unanswered = quiz.questions.filter(
      (question) =>
        answers[String(question._id)] === undefined
    );

    if (unanswered.length > 0) {
      toast.error(
        `Please answer all ${quiz.questions.length} questions before submitting.`
      );
      return;
    }

    const invalidQuestion = quiz.questions.find(
      (question) =>
        !question._id ||
        !Array.isArray(question.options) ||
        !Number.isInteger(answers[String(question._id)]) ||
        answers[String(question._id)] < 0 ||
        answers[String(question._id)] >= question.options.length
    );

    if (invalidQuestion) {
      toast.error('One or more answers are invalid. Please check your selections.');
      return;
    }

    const payload = {
      answers: quiz.questions.map((question) => {
        const questionId = String(question._id);
        const selectedIndex = Number(answers[questionId]);

        return {
          question: questionId,
          questionId,
          selectedIndex,
        };
      }),
    };

    try {
      setSubmitting(true);

      const { data } = await api.post(
        `/quizzes/${quizId}/submit`,
        payload
      );

      setResult(data);

      if (data.passed) {
        toast.success('Congratulations! You passed the quiz.');
        onPassed?.();
      } else {
        toast.error('You did not pass this attempt. Review your answers.');
      }
    } catch (error) {
      console.error(
        'Quiz submission error:',
        error.response?.data || error
      );

      toast.error(
        error.response?.data?.message ||
        'Unable to submit quiz.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!result || result.attemptsLeft <= 0) return;
    loadQuiz();
  };

  const getCorrectOption = (reviewItem, index) => {
    const question = quiz.questions[index];

    if (
      Number.isInteger(reviewItem.correctIndex) &&
      question?.options?.[reviewItem.correctIndex] !== undefined
    ) {
      return question.options[reviewItem.correctIndex];
    }

    return 'Correct answer information unavailable';
  };

  const getSelectedOption = (reviewItem, index) => {
    const question = quiz.questions[index];

    if (
      Number.isInteger(reviewItem.chosen) &&
      question?.options?.[reviewItem.chosen] !== undefined
    ) {
      return question.options[reviewItem.chosen];
    }

    if (typeof reviewItem.chosen === 'string') {
      return reviewItem.chosen;
    }

    return 'No answer';
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-600 shadow-sm">
        Loading quiz...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Quiz could not be loaded.</p>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          Back to Lessons
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QUIZ HEADER */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Back to Lessons
        </button>

        <h2 className="text-2xl font-bold text-slate-900">
          {quiz.title}
        </h2>

        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
          <span>{quiz.questions.length} Questions</span>
          <span>•</span>
          <span>Passing Score: {quiz.passPercent}%</span>
          <span>•</span>
          <span>Maximum Attempts: {quiz.maxAttempts}</span>
        </div>
      </div>

      {/* QUIZ QUESTIONS */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {quiz.questions.map((question, index) => (
            <div
              key={question._id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm font-semibold text-indigo-600">
                Question {index + 1} of {quiz.questions.length}
              </p>

              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {question.text}
              </h3>

              <div className="mt-5 space-y-3">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                      answers[String(question._id)] === optionIndex
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={String(question._id)}
                      value={optionIndex}
                      checked={
                        answers[String(question._id)] === optionIndex
                      }
                      onChange={() =>
                        handleAnswerChange(question._id, optionIndex)
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />

                    <span className="w-6 shrink-0 font-semibold text-slate-500">
                      {String.fromCharCode(65 + optionIndex)}.
                    </span>

                    <span className="text-sm text-slate-800">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm text-slate-600">
              Answered: {Object.keys(answers).length} / {quiz.questions.length}
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </form>
      )}

      {/* RESULT SCREEN */}
      {result && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 text-center shadow-sm sm:p-8">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ${
                result.passed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {result.passed ? '✓' : '✕'}
            </div>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              {result.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
            </h2>

            <p className="mt-2 text-slate-500">{result.message}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Your Score</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">
                  {result.score}%
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Correct Answers</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Passing Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {quiz.passPercent}%
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Attempts Left</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {result.attemptsLeft}
                </p>
              </div>
            </div>
          </div>

          {/* ANSWER REVIEW */}
          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-xl font-bold text-slate-900">
              Answer Review
            </h3>

            <div className="mt-5 space-y-5">
              {(result.review || []).map((item, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${
                    item.ok
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">
                      Question {index + 1}: {item.question}
                    </h4>

                    <span
                      className={`shrink-0 text-sm font-bold ${
                        item.ok ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {item.ok ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-700">
                    Your answer: {getSelectedOption(item, index)}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-green-800">
                    Correct answer: {getCorrectOption(item, index)}
                  </p>

                  {item.explanation && (
                    <p className="mt-3 text-sm text-slate-600">
                      <strong>Explanation:</strong> {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">
            {result.attemptsLeft > 0 && (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                Retry Quiz
              </button>
            )}

            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Lessons
            </button>
          </div>

          {result.attemptsLeft <= 0 && !result.passed && (
            <p className="text-sm font-medium text-red-600">
              You have used all available attempts for this quiz.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
