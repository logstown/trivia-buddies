import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { formatDate } from "date-fns";
import { PencilIcon } from "lucide-react";
import YourNextCategory from "./YourNextCategory";

export const TodaysQuestion = () => {
  const question = useQuery(api.questions.getTodaysQuestion);
  const questionAnswers = useQuery(
    api.questions.getQuestionAnswers,
    question ? { questionId: question._id } : "skip",
  );
  const currentUser = useQuery(api.users.getCurrentUser);
  const group = useQuery(api.group.getGroupByUser);
  const submitAnswer = useMutation(api.questions.submitAnswer);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    questionId: string;
    answer: string;
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [showEditCategory, setShowEditCategory] = useState(false);

  // useEffect(() => {
  //   if (
  //     questionAnswers?.userAnswer &&
  //     questionAnswers.userAnswer === question?.correctAnswer
  //   ) {
  //     const confettiSettings = { target: "my-canvas" };
  //     const confetti = new ConfettiGenerator(confettiSettings);
  //     confetti.render();
  //   }
  // }, [questionAnswers, question]);

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

  const joinUrl = `${window.location.origin}/join-group/${question.groupId}`;

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

  const title = question.user
    ? `${question.user.name}'s Question`
    : "Today's Question";

  const handleCopyJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyStatus("copied");
    } catch (error) {
      console.error("Error copying join URL:", error);
      setCopyStatus("failed");
    }
  };

  return (
    <div className="flex flex-col gap-12 mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-6 border border-base-300 rounded-box lg:p-6 shadow-lg">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-primary">{group?.name}</h1>
          <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
            {formatDate(new Date(), "MMMM do, yyyy")}
          </p>
          <h2 className="text-xl font-semibold text-base-content">{title}</h2>
        </header>

        <section className="rounded-box shadow-inner bg-base-200/70 border border-base-200 p-5 sm:p-7">
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
          {question.answers.map((answer, index) => (
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
                    isAnswered && answer === question.correctAnswer
                      ? "font-bold"
                      : "font-medium"
                  }`}
                >
                  {decodeHtmlEntities(answer)}
                </span>
              </div>

              {/* <div className="flex items-center justify-between gap-3 sm:justify-end"> */}
              {isAnswered && (
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
              )}
              {/* </div> */}
            </label>
          ))}
        </section>

        <footer className="flex justify-end ">
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
      {isAnswered && (
        <>
          <div className="flex justify-center">
            <div
              className={`badge badge-xl text-3xl p-6 font-bold tracking-wide ${resultTone}`}
            >
              {resultIsCorrect ? "CORRECT" : "INCORRECT"}
            </div>
          </div>

          <div className="flex flex-col gap-12 mt-12">
            <ul className="list bg-base-100 rounded-box border border-base-300 shadow-md">
              <li className="p-4 pb-2 uppercase text-base-content/50">
                {!!questionAnswers?.answerUsers.hasntAnswered?.length
                  ? "Yet to answer"
                  : "All players have answered!"}
              </li>

              {questionAnswers?.answerUsers.hasntAnswered?.map((user, idx) => (
                <li className="list-row items-center" key={idx}>
                  <Avatar
                    name={user.playerName}
                    imageUrl={user.playerImageUrl}
                  />
                  <div>{user.playerName}</div>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 items-center">
              <span className="text-xl font-semibold">
                Your next question's category is
              </span>
              <div className="flex gap-2 items-center">
                <div className="badge badge-lg badge-secondary badge-soft ">
                  {currentUser?.nextCategory.name ?? "Random"}
                </div>
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => setShowEditCategory(true)}
                >
                  <PencilIcon size={13} />
                </button>
              </div>
            </div>

            {group?.hostId === currentUser?._id && (
              <ul className="list bg-base-100 rounded-box shadow-md">
                <li className="p-4 pb-2 text-xs opacity-60 tracking-wide uppercase">
                  Invite friends to your group
                </li>

                <li className="list-row items-center">
                  <div className="flex flex-col gap-3">
                    <p>
                      Share this link with friends so they can join your group.
                    </p>
                    <div className="join w-full">
                      <input
                        className="input join-item w-full font-mono text-sm"
                        value={joinUrl}
                        readOnly
                      />
                      <button
                        className="btn btn-soft join-item"
                        onClick={() => void handleCopyJoinUrl()}
                      >
                        {copyStatus === "copied" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    {copyStatus === "failed" && (
                      <p className="mt-2 text-sm text-error">
                        Copy failed. You can select the link and copy it
                        manually.
                      </p>
                    )}
                  </div>
                </li>
              </ul>
            )}
          </div>
        </>
      )}
      {showEditCategory && (
        <YourNextCategory handleCloseModal={() => setShowEditCategory(false)} />
      )}
    </div>
  );
};
