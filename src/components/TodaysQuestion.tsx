import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";

export const TodaysQuestion = () => {
  const question = useQuery(api.questions.getTodaysQuestion);
  const questionAnswers = useQuery(
    api.questions.getQuestionAnswers,
    question ? { questionId: question._id } : "skip",
  );
  const submitAnswer = useMutation(api.questions.submitAnswer);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (questionAnswers?.userAnswer) {
      setSelectedAnswer(questionAnswers.userAnswer);
    }
  }, [questionAnswers]);

  if (question === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-4xl font-bold">Today&apos;s Question</h1>
        <p className="text-lg ">Loading...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-4xl font-bold">Today&apos;s Question</h1>
        <p className="text-lg ">No question available.</p>
      </div>
    );
  }

  const isAnswered = !!questionAnswers?.userAnswer;

  const correctAnswerColor =
    questionAnswers?.userAnswer === question?.correctAnswer
      ? "text-success"
      : "text-error";

  const badgeColor =
    question.difficulty === "easy"
      ? "badge-success"
      : question.difficulty === "medium"
        ? "badge-warning"
        : "badge-error";

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAnswer(event.target.value);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-8">
      <h1 className="text-lg uppercase">Today&apos;s Question</h1>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-semibold">{question.category}</h2>
          <div className={`badge badge-soft capitalize ${badgeColor}`}>
            {question.difficulty}
          </div>
        </div>
        <p className="text-xl ">{decodeHtmlEntities(question.question)}</p>
      </div>
      <div className="flex flex-col gap-4">
        {question.answers.map((answer, index) => (
          <label key={index} className="flex items-center gap-3">
            <input
              disabled={isAnswered}
              type="radio"
              className="radio"
              name="answer"
              value={answer}
              checked={selectedAnswer === answer}
              onChange={handleChange}
            />
            <span
              className={`
                  ${isAnswered && answer === question.correctAnswer ? "font-bold" : ""}
                `}
            >
              {decodeHtmlEntities(answer)}
            </span>
            <div className="flex gap-1">
              {questionAnswers?.answerUsers[answer]?.map((user, idx) => (
                <Avatar
                  key={idx}
                  name={user.playerName}
                  imageUrl={user.playerImageUrl}
                />
              ))}
            </div>
          </label>
        ))}
      </div>
      {!isAnswered ? (
        <button
          className="btn btn-primary"
          onClick={() => submitAnswer({ answer: selectedAnswer! })}
          disabled={!selectedAnswer}
        >
          Submit Answer
        </button>
      ) : (
        <p className={`text-xl uppercase font-semibold ${correctAnswerColor}`}>
          {questionAnswers?.userAnswer === question.correctAnswer
            ? "Correct!"
            : "Incorrect"}
        </p>
      )}
    </div>
  );
};
