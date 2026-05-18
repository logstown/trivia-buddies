import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { find, groupBy, minBy } from "lodash";
import { format } from "date-fns";

type ReminderRecipient = {
  userId: Id<"users">;
  name: string;
  email: string;
};

type QuestionReminderContext = {
  questionId: Id<"questions">;
  groupName: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  recipients: ReminderRecipient[];
  skippedAlreadyAnswered: number;
  skippedMissingEmail: number;
};

const MILLISECONDS_IN_A_DAY = 86400000;
const DAILY_QUESTION_GROUP_BATCH_SIZE = 25;
const DAILY_QUESTION_GROUP_STAGGER_MS = 6000;
const MAX_EXISTING_QUESTIONS_TO_CHECK = 500;
const MAX_GROUP_USERS_FOR_QUESTION_PICKING = 200;
const MAX_QUESTION_FETCH_ATTEMPTS = 5;
const QUESTION_FETCH_RETRY_DELAY_MS = 6000;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getGroupQuestions = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return questions;
  },
});

export const addQuestionUponCreateGroup = internalAction({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const question = await ctx.runAction(internal.opentdb.fetchQuestion, {
      categoryId: undefined,
    });

    const group = await ctx.runQuery(internal.group.getFullGroupById, {
      groupId,
    });

    if (!group) throw new Error("Group not found");

    await ctx.runMutation(internal.questions.addGroupQuestion, {
      group,
      type: question.type,
      difficulty: question.difficulty,
      category: question.category,
      question: question.question,
      correctAnswer: question.correct_answer,
      incorrectAnswers: question.incorrect_answers,
    });
  },
});

export const addNewGroupQuestion = internalAction({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { cursor }) => {
    const groupPage: Awaited<
      ReturnType<typeof ctx.runQuery<typeof internal.questions.listDailyGroups>>
    > = await ctx.runQuery(internal.questions.listDailyGroups, {
      paginationOpts: {
        numItems: DAILY_QUESTION_GROUP_BATCH_SIZE,
        cursor: cursor ?? null,
      },
    });

    for (const [index, group] of groupPage.page.entries()) {
      await ctx.scheduler.runAfter(
        index * DAILY_QUESTION_GROUP_STAGGER_MS,
        internal.questions.addNewQuestionForGroup,
        { groupId: group._id },
      );
    }

    if (!groupPage.isDone) {
      await ctx.scheduler.runAfter(
        groupPage.page.length * DAILY_QUESTION_GROUP_STAGGER_MS,
        internal.questions.addNewGroupQuestion,
        { cursor: groupPage.continueCursor },
      );
    }
  },
});

export const listDailyGroups = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const groupPage = await ctx.db.query("groups").paginate(paginationOpts);

    return {
      ...groupPage,
      page: groupPage.page.map((group) => ({ _id: group._id })),
    };
  },
});

export const getGroupDailyQuestionContext = internalQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;

    const [questions, users] = await Promise.all([
      ctx.db
        .query("questions")
        .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
        .order("desc")
        .take(MAX_EXISTING_QUESTIONS_TO_CHECK),
      ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
        .take(MAX_GROUP_USERS_FOR_QUESTION_PICKING),
    ]);

    return {
      group,
      previousQuestionText: questions.map((question) => question.question),
      users,
    };
  },
});

export const addNewQuestionForGroup = internalAction({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const questionContext: Awaited<
      ReturnType<
        typeof ctx.runQuery<typeof internal.questions.getGroupDailyQuestionContext>
      >
    > = await ctx.runQuery(internal.questions.getGroupDailyQuestionContext, {
      groupId,
    });

    if (!questionContext) {
      console.warn(`Skipping daily question for missing group ${groupId}`);
      return null;
    }

    const nextCategoryUser = minBy(
      questionContext.users,
      (user) => user.numQuestionsPicked ?? 0,
    );
    const previousQuestionText = new Set(questionContext.previousQuestionText);

    let question: Awaited<
      ReturnType<typeof ctx.runAction<typeof internal.opentdb.fetchQuestion>>
    > | null = null;

    for (let attempt = 0; attempt < MAX_QUESTION_FETCH_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await sleep(QUESTION_FETCH_RETRY_DELAY_MS);
      }

      const candidate = await ctx.runAction(internal.opentdb.fetchQuestion, {
        categoryId:
          attempt === MAX_QUESTION_FETCH_ATTEMPTS - 1
            ? undefined
            : nextCategoryUser?.nextCategory.id,
      });

      if (!previousQuestionText.has(candidate.question)) {
        question = candidate;
        break;
      }
    }

    if (!question) {
      throw new Error(
        `Unable to find an unused question for group ${groupId} after ${MAX_QUESTION_FETCH_ATTEMPTS} attempts`,
      );
    }

    const user = nextCategoryUser
      ? { id: nextCategoryUser._id, name: nextCategoryUser.name }
      : undefined;

    await ctx.runMutation(internal.questions.addGroupQuestion, {
      group: questionContext.group,
      user,
      type: question.type,
      difficulty: question.difficulty,
      category: question.category,
      question: question.question,
      correctAnswer: question.correct_answer,
      incorrectAnswers: question.incorrect_answers,
    });

    return null;
  },
});

export const addGroupQuestion = internalMutation({
  args: {
    group: v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      hostId: v.id("users"),
      totalQuestions: v.number(),
      totalCategoryQuestions: v.record(v.string(), v.number()), // category name -> number of questions in that category
      totalDifficultyQuestions: v.object({
        easy: v.number(),
        medium: v.number(),
        hard: v.number(),
      }),
    }),
    user: v.optional(
      v.object({
        id: v.id("users"),
        name: v.string(),
      }),
    ),
    type: v.union(v.literal("multiple"), v.literal("boolean")),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    category: v.string(),
    question: v.string(),
    correctAnswer: v.string(),
    incorrectAnswers: v.array(v.string()),
  },
  handler: async (
    ctx,
    {
      group,
      user,
      type,
      difficulty,
      category,
      question,
      correctAnswer,
      incorrectAnswers,
    },
  ) => {
    const answers =
      type === "multiple"
        ? [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5)
        : ["True", "False"];

    const questionId = await ctx.db.insert("questions", {
      groupId: group._id,
      stringDate: format(new Date(), "M-d-yyyy"),
      user,
      type,
      difficulty,
      category,
      question,
      correctAnswer,
      answers,
    });

    await ctx.db.patch("groups", group._id, {
      totalQuestions: group.totalQuestions + 1,
      totalCategoryQuestions: {
        ...group.totalCategoryQuestions,
        [category]: (group.totalCategoryQuestions[category] ?? 0) + 1,
      },
      totalDifficultyQuestions: {
        ...group.totalDifficultyQuestions,
        [difficulty]: (group.totalDifficultyQuestions[difficulty] ?? 0) + 1,
      },
    });

    if (user) {
      const pickedUser = await ctx.db.get("users", user.id);
      if (pickedUser) {
        await ctx.db.patch("users", pickedUser._id, {
          numQuestionsPicked: pickedUser.numQuestionsPicked + 1,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.users.sendQuestionReminderEmails, {
      questionId,
    });

    return questionId;
  },
});

export const getQuestionReminderContext = internalQuery({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (
    ctx,
    { questionId },
  ): Promise<QuestionReminderContext | null> => {
    const question = await ctx.db.get("questions", questionId);
    if (!question) return null;

    const group = await ctx.db.get("groups", question.groupId);
    if (!group) return null;

    const [users, answers] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", question.groupId))
        .collect(),
      ctx.db
        .query("playerAnswers")
        .withIndex("questionId", (q) => q.eq("questionId", questionId))
        .collect(),
    ]);

    const answeredUserIds = new Set(answers.map((answer) => answer.playerId));
    const recipients: ReminderRecipient[] = [];
    let skippedAlreadyAnswered = 0;
    let skippedMissingEmail = 0;

    for (const user of users) {
      if (answeredUserIds.has(user._id)) {
        skippedAlreadyAnswered += 1;
        continue;
      }

      if (!user.email) {
        skippedMissingEmail += 1;
        continue;
      }

      recipients.push({
        userId: user._id,
        name: user.name,
        email: user.email,
      });
    }

    return {
      questionId,
      groupName: group.name,
      category: question.category,
      difficulty: question.difficulty,
      recipients,
      skippedAlreadyAnswered,
      skippedMissingEmail,
    };
  },
});

export const getQuestionByDate = query({
  args: {
    stringDate: v.string(),
  },
  handler: async (ctx, { stringDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const groupId = user.groupId;
    if (!groupId) return null;

    const question = await ctx.db
      .query("questions")
      .withIndex("by_groupId_stringDate", (q) =>
        q.eq("groupId", groupId).eq("stringDate", stringDate),
      )
      .unique();

    return question;
  },
});

export const getQuestionAnswers = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, { questionId }) => {
    const answers = await ctx.db
      .query("playerAnswers")
      .withIndex("questionId", (q) => q.eq("questionId", questionId))
      .collect();

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const userAnswer = answers.find((a) => a.playerId === user._id);

    const groupUsers = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
      .collect();

    const usersWithAnswer = groupUsers
      //   .filter((u) => u._id !== user._id)
      .map((u) => {
        const userAnswer = find(answers, { playerId: u._id });

        return {
          playerName: u?.name ?? "Unknown Player",
          playerImageUrl: u?.imageUrl,
          answer: userAnswer?.answer,
        };
      });

    const answerUsers = groupBy(usersWithAnswer, (u) => {
      return u.answer || "hasntAnswered";
    });

    return {
      userAnswer: userAnswer?.answer,
      answerUsers,
    };
  },
});

export const submitAnswer = mutation({
  args: {
    answer: v.string(),
  },
  handler: async (ctx, { answer }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) return null;

    const todaysQuestion = await ctx.runQuery(api.questions.getQuestionByDate, {
      stringDate: format(new Date(), "M-d-yyyy"),
    });

    if (!todaysQuestion) {
      throw new Error("No question available to answer");
    }

    await ctx.db.insert("playerAnswers", {
      playerId: user._id,
      questionId: todaysQuestion._id,
      answer,
    });

    const [stats, categoryStats, difficultyStats] = await Promise.all([
      ctx.db
        .query("playerStats")
        .withIndex("by_player", (q) => q.eq("playerId", user._id))
        .unique(),
      ctx.db
        .query("playerCategoryStats")
        .withIndex("by_player", (q) => q.eq("playerId", user._id))
        .unique(),
      ctx.db
        .query("playerDifficultyStats")
        .withIndex("by_player", (q) => q.eq("playerId", user._id))
        .unique(),
    ]);

    const isCorrect = answer === todaysQuestion.correctAnswer;
    const correct = isCorrect ? 1 : 0;

    if (stats) {
      const answeredYesterday =
        Date.now() - (stats.lastAnsweredAt ?? 0) < MILLISECONDS_IN_A_DAY;
      const newParticipationStreak = answeredYesterday
        ? stats.currentParticipationStreak + 1
        : 1;

      await ctx.db.patch("playerStats", stats?._id, {
        answered: stats.answered + 1,
        correct: stats.correct + correct,
        currentParticipationStreak: newParticipationStreak,
        longestParticipationStreak: Math.max(
          stats.longestParticipationStreak,
          newParticipationStreak,
        ),
        currentCorrectStreak: isCorrect ? stats.currentCorrectStreak + 1 : 0,
        longestCorrectStreak: isCorrect
          ? Math.max(stats.longestCorrectStreak, stats.currentCorrectStreak + 1)
          : stats.longestCorrectStreak,
        lastAnsweredAt: Date.now(),
      });
    } else {
      await ctx.db.insert("playerStats", {
        playerId: user._id,
        groupId: todaysQuestion.groupId,
        answered: 1,
        correct,
        currentParticipationStreak: 1,
        longestParticipationStreak: 1,
        currentCorrectStreak: correct,
        longestCorrectStreak: correct,
        lastAnsweredAt: Date.now(),
      });
    }

    if (categoryStats) {
      await ctx.db.patch("playerCategoryStats", categoryStats._id, {
        answered: categoryStats.answered + 1,
        correct: categoryStats.correct + correct,
      });
    } else {
      await ctx.db.insert("playerCategoryStats", {
        playerId: user._id,
        category: todaysQuestion.category,
        groupId: todaysQuestion.groupId,
        answered: 1,
        correct,
      });
    }

    if (difficultyStats) {
      await ctx.db.patch("playerDifficultyStats", difficultyStats._id, {
        answered: difficultyStats.answered + 1,
        correct: difficultyStats.correct + correct,
      });
    } else {
      await ctx.db.insert("playerDifficultyStats", {
        playerId: user._id,
        difficulty: todaysQuestion.difficulty,
        groupId: todaysQuestion.groupId,
        answered: 1,
        correct,
      });
    }
  },
});
