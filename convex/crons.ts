import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

const dailyTime = { hourUTC: 8, minuteUTC: 0 }; // 8:00 AM UTC (4:00 AM EST) in prod, 8:00 AM UTC in dev

crons.cron(
  "get daily question",
  `${dailyTime.minuteUTC} ${dailyTime.hourUTC} * * *`,
  internal.questions.addNewGroupQuestion,
  {},
);

export default crons;
