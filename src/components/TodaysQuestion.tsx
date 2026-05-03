import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { formatDate } from "date-fns";

export const TodaysQuestion = () => {
  const question = useQuery(api.questions.getTodaysQuestion);
  const questionAnswers = useQuery(
    api.questions.getQuestionAnswers,
    question ? { questionId: question._id } : "skip",
  );
  const submitAnswer = useMutation(api.questions.submitAnswer);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    questionId: string;
    answer: string;
  } | null>(null);

  if (question === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
            Question for {formatDate(new Date(), "MMMM do, yyyy")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-base-content">
            Today&apos;s Question
          </h1>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-5 h-8 w-full" />
          <div className="skeleton mt-3 h-8 w-4/5" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
          Question for {formatDate(new Date(), "MMMM do, yyyy")}
        </p>
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-base-content">
            Today&apos;s Question
          </h1>
          <p className="mt-3 text-base text-base-content/70">
            No question available.
          </p>
        </div>
      </div>
    );
  }

  const isAnswered = !!questionAnswers?.userAnswer;
  const selectedAnswerForQuestion =
    selectedAnswer?.questionId === question._id ? selectedAnswer.answer : null;
  const displayedAnswer =
    questionAnswers?.userAnswer ?? selectedAnswerForQuestion;

  const badgeColor =
    question.difficulty === "easy"
      ? "badge-success"
      : question.difficulty === "medium"
        ? "badge-warning"
        : "badge-error";

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAnswer({
      questionId: question._id,
      answer: event.target.value,
    });
  };

  const resultIsCorrect =
    questionAnswers?.userAnswer === question.correctAnswer;
  const resultTone = resultIsCorrect
    ? "border-success/30 bg-success/10 text-success"
    : "border-error/30 bg-error/10 text-error";

  const answerTone = (answer: string) => {
    if (isAnswered && answer === question.correctAnswer) {
      return "border-success/40 bg-success/10";
    }

    if (isAnswered && answer === questionAnswers.userAnswer) {
      return "border-error/40 bg-error/10";
    }

    if (!isAnswered && displayedAnswer === answer) {
      return "border-primary/50 bg-primary/10";
    }

    const tone = isAnswered
      ? ""
      : "hover:border-base-content/20 hover:bg-base-200/50 cursor-pointer";

    return `border-base-300 bg-base-100 ${tone}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
          {formatDate(new Date(), "MMMM do, yyyy")}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold tracking-normal text-base-content">
            Today&apos;s Question
          </h1>
          {isAnswered && (
            <div
              className={`badge badge-lg font-bold tracking-wide ${resultTone}`}
            >
              {resultIsCorrect ? "CORRECT" : "INCORRECT"}
            </div>
          )}
        </div>
      </header>

      <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-neutral badge-soft max-w-full truncate">
            {question.category}
          </span>
          {isAnswered && (
            <span className={`badge badge-soft capitalize ${badgeColor}`}>
              {question.difficulty}
            </span>
          )}
        </div>

        <p className="mt-4 text-2xl font-semibold leading-snug text-base-content sm:text-3xl">
          {decodeHtmlEntities(question.question)}
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-label="Answer choices">
        {question.answers.map((answer, index) => {
          const isCorrectAnswer =
            isAnswered && answer === question.correctAnswer;
          const isUserAnswer =
            isAnswered && answer === questionAnswers.userAnswer;

          return (
            <label
              key={index}
              className={`flex flex-col gap-3 rounded-box border p-4 transition sm:flex-row sm:items-center sm:justify-between ${answerTone(answer)} ${
                isAnswered ? "cursor-default" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <input
                  disabled={isAnswered}
                  type="radio"
                  className="radio radio-primary shrink-0"
                  name="answer"
                  value={answer}
                  checked={displayedAnswer === answer}
                  onChange={handleChange}
                />
                <span
                  className={`min-w-0 text-base leading-snug text-base-content ${
                    isCorrectAnswer ? "font-bold" : "font-medium"
                  }`}
                >
                  {decodeHtmlEntities(answer)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                {/* {isAnswered && (isCorrectAnswer || isUserAnswer) && (
                  <span
                    className={`badge badge-sm ${
                      isCorrectAnswer
                        ? "badge-success"
                        : isUserAnswer
                          ? "badge-error"
                          : "badge-ghost"
                    }`}
                  >
                    {isCorrectAnswer
                      ? "Correct answer"
                      : isUserAnswer
                        ? "Your answer"
                        : null}
                  </span>
                )} */}
                <div className="flex min-h-8 flex-wrap justify-end gap-1">
                  {questionAnswers?.answerUsers[answer]?.map((user, idx) => (
                    <div
                      className="tooltip"
                      data-tip={user.playerName}
                      key={idx}
                    >
                      <Avatar
                        name={user.playerName}
                        imageUrl={user.playerImageUrl}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </label>
          );
        })}
      </section>

      <footer className="flex items-center justify-between gap-4">
        {!isAnswered && (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!displayedAnswer) return;
              void submitAnswer({ answer: displayedAnswer });
            }}
            disabled={!displayedAnswer}
          >
            Submit Answer
          </button>
        )}
      </footer>
    </div>
  );
};
