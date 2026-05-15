import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Set different times for prod vs. dev
const isProd = process.env.NODE_ENV === "production";
const dailyTime = isProd
  ? { hourUTC: 8, minuteUTC: 0 }
  : { hourUTC: 9, minuteUTC: 0 };

crons.daily(
  "get daily question",
  dailyTime,
  internal.questions.addNewGroupQuestion,
  {},
);

export default crons;
