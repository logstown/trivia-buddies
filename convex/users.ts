import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type ReminderRecipient = {
  userId: Id<"users">;
  name: string;
  email: string;
};

type QuestionReminderContext = {
  groupName: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  recipients: ReminderRecipient[];
  skippedAlreadyAnswered: number;
  skippedMissingEmail: number;
};

type ReminderSendResult =
  | { ok: true }
  | { ok: false; email: string; status: number; message: string };

type ReminderSendSummary = {
  sent: number;
  failed: number;
  skipped: number;
};

const RESEND_EMAILS_PER_SECOND = 4;
const RESEND_BATCH_DELAY_MS = 1000;
const RESEND_MAX_SEND_ATTEMPTS = 3;
const RESEND_DEFAULT_RETRY_DELAY_MS = 1000;

const htmlEscapeCharacters: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => htmlEscapeCharacters[character]);

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryDelayFromHeader = (retryAfter: string | null) => {
  if (!retryAfter) return RESEND_DEFAULT_RETRY_DELAY_MS;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(seconds * 1000, RESEND_DEFAULT_RETRY_DELAY_MS);
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isFinite(retryAt)) {
    return Math.max(retryAt - Date.now(), RESEND_DEFAULT_RETRY_DELAY_MS);
  }

  return RESEND_DEFAULT_RETRY_DELAY_MS;
};

const buildReminderEmail = ({
  appUrl,
  category,
  difficulty,
  groupName,
  name,
}: {
  appUrl?: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  groupName: string;
  name: string;
}) => {
  const greetingName = name.trim() || "there";
  const subject = `Today's ${groupName} trivia question is ready`;
  const textLines = [
    `Hi ${greetingName},`,
    "",
    `Today's ${groupName} trivia question is ready.`,
    `Category: ${category}`,
    `Difficulty: ${difficulty}`,
    "",
    appUrl
      ? `Answer it here: ${appUrl}`
      : "Open Trivia Buddies to answer today's question.",
  ];

  const callToAction = appUrl
    ? `<p><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">Answer today's question</a></p>`
    : "<p>Open Trivia Buddies to answer today's question.</p>";

  return {
    subject,
    text: textLines.join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <p>Hi ${escapeHtml(greetingName)},</p>
        <p>Today's <strong>${escapeHtml(groupName)}</strong> trivia question is ready.</p>
        <p>
          <strong>Category:</strong> ${escapeHtml(category)}<br />
          <strong>Difficulty:</strong> ${escapeHtml(difficulty)}
        </p>
        ${callToAction}
      </div>
    `,
  };
};

const sendReminderEmail = async ({
  email,
  from,
  questionId,
  recipient,
  resendApiKey,
}: {
  email: ReturnType<typeof buildReminderEmail>;
  from: string;
  questionId: Id<"questions">;
  recipient: ReminderRecipient;
  resendApiKey: string;
}): Promise<ReminderSendResult> => {
  for (let attempt = 1; attempt <= RESEND_MAX_SEND_ATTEMPTS; attempt += 1) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `question-${questionId}-user-${recipient.userId}`,
      },
      body: JSON.stringify({
        from,
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: "kind", value: "question_reminder" },
          { name: "app", value: "trivia_buddies" },
        ],
      }),
    });

    if (response.ok) return { ok: true };

    if (response.status === 429 && attempt < RESEND_MAX_SEND_ATTEMPTS) {
      await sleep(retryDelayFromHeader(response.headers.get("Retry-After")));
      continue;
    }

    return {
      ok: false,
      email: recipient.email,
      status: response.status,
      message: await response.text(),
    };
  }

  return {
    ok: false,
    email: recipient.email,
    status: 429,
    message: "Resend request was rate limited after retry attempts",
  };
};

export const upsertCurrentUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const email = identity.email;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (existing) {
      await ctx.db.patch("users", existing._id, {
        name: identity.name || existing.name,
        imageUrl: identity.pictureUrl,
        ...(email ? { email } : {}),
      });
    } else {
      await ctx.db.insert("users", {
        clerkId: identity.tokenIdentifier,
        ...(email ? { email } : {}),
        name: identity.name || "Anonymous",
        imageUrl: identity.pictureUrl,
        numQuestionsPicked: 0,
        nextCategory: {
          id: 0,
          name: "Random",
        },
      });
    }
    return null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
      nextCategory: user.nextCategory,
    };
  },
});

export const getUsersInGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
    }));
  },
});

export const getUsersInGroupForQuestionPicking = internalQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
  },
});

export const sendQuestionReminderEmails = internalAction({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, { questionId }): Promise<ReminderSendSummary> => {
    const reminderContext: QuestionReminderContext | null = await ctx.runQuery(
      internal.questions.getQuestionReminderContext,
      { questionId },
    );

    if (!reminderContext) {
      console.warn(`Skipping reminders for missing question ${questionId}`);
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.APP_URL;

    if (!resendApiKey || !from) {
      throw new Error(
        "Missing RESEND_API_KEY or RESEND_FROM_EMAIL Convex environment variables",
      );
    }

    const results: ReminderSendResult[] = [];

    for (
      let index = 0;
      index < reminderContext.recipients.length;
      index += RESEND_EMAILS_PER_SECOND
    ) {
      const recipients = reminderContext.recipients.slice(
        index,
        index + RESEND_EMAILS_PER_SECOND,
      );
      const batchResults = await Promise.all(
        recipients.map(async (recipient) => {
          const email = buildReminderEmail({
            appUrl,
            category: reminderContext.category,
            difficulty: reminderContext.difficulty,
            groupName: reminderContext.groupName,
            name: recipient.name,
          });

          return await sendReminderEmail({
            from,
            email,
            questionId,
            recipient,
            resendApiKey,
          });
        }),
      );

      results.push(...batchResults);

      if (index + recipients.length < reminderContext.recipients.length) {
        await sleep(RESEND_BATCH_DELAY_MS);
      }
    }

    const failures = results.filter((result) => !result.ok);
    if (failures.length > 0) {
      console.error("Failed to send some question reminders", failures);
    }

    return {
      sent: results.length - failures.length,
      failed: failures.length,
      skipped:
        reminderContext.skippedAlreadyAnswered +
        reminderContext.skippedMissingEmail,
    };
  },
});

export const updateNextCategory = mutation({
  args: {
    nextCategory: v.object({
      id: v.number(),
      name: v.string(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { nextCategory }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    console.log(nextCategory);
    await ctx.db.patch("users", user._id, {
      nextCategory,
    });
    return null;
  },
});

export const incrementNumQuestionsPicked = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;

    await ctx.db.patch("users", user._id, {
      numQuestionsPicked: user.numQuestionsPicked + 1,
    });
    return null;
  },
});
