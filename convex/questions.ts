import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { find, groupBy, minBy } from "lodash";

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

export const getGroupQuestions = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_groupId_creationTime", (q) => q.eq("groupId", groupId))
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
  args: {},
  handler: async (ctx) => {
    const allGroups = await ctx.runQuery(internal.group.getAllGroups);

    for (const group of allGroups) {
      const groupQuestions: Doc<"questions">[] = await ctx.runQuery(
        internal.questions.getGroupQuestions,
        { groupId: group._id },
      );

      const groupUsers: Doc<"users">[] = await ctx.runQuery(
        internal.users.getUsersInGroupForQuestionPicking,
        {
          groupId: group._id,
        },
      );
      const nextCategoryUser = minBy(
        groupUsers,
        (user) => user.numQuestionsPicked ?? 0,
      );

      let question: Awaited<
        ReturnType<typeof ctx.runAction<typeof internal.opentdb.fetchQuestion>>
      >;

      let alreadyUsed: boolean;
      do {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // Avoid hammering the API in case of many duplicates
        question = await ctx.runAction(internal.opentdb.fetchQuestion, {
          categoryId: nextCategoryUser?.nextCategory.id,
        });

        alreadyUsed = groupQuestions.some(
          (q) => q.question === question.question,
        );
      } while (alreadyUsed);

      const user = nextCategoryUser
        ? { id: nextCategoryUser._id, name: nextCategoryUser.name }
        : undefined;

      await ctx.runMutation(internal.questions.addGroupQuestion, {
        group,
        user,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        question: question.question,
        correctAnswer: question.correct_answer,
        incorrectAnswers: question.incorrect_answers,
      });

      if (nextCategoryUser) {
        await ctx.runMutation(internal.users.incrementNumQuestionsPicked, {
          userId: nextCategoryUser._id,
        });
      }
    }
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

    await ctx.scheduler.runAfter(
      0,
      internal.users.sendQuestionReminderEmails,
      { questionId },
    );

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

export const getTodaysQuestion = query({
  args: {},
  handler: async (ctx) => {
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
      .withIndex("by_groupId_creationTime", (q) => q.eq("groupId", groupId))
      .order("desc")
      .first();

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

    const todaysQuestion = await ctx.runQuery(api.questions.getTodaysQuestion);

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
      await ctx.db.patch("playerStats", stats?._id, {
        answered: stats.answered + 1,
        correct: stats.correct + correct,
        currentParticipationStreak: stats.currentParticipationStreak + 1,
        longestParticipationStreak: Math.max(
          stats.longestParticipationStreak,
          stats.currentParticipationStreak + 1,
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
