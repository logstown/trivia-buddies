import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { chain } from "lodash";
import { Stat } from "./Stat";

export function GroupStats({
  groupId,
  totalQuestions,
}: {
  groupId: Id<"groups">;
  totalQuestions: number;
}) {
  const playerStats = useQuery(api.stats.getPlayerStatsByGroup, { groupId });

  const playersWithSameAccuracy = chain(playerStats ?? [])
    .groupBy("accuracy")
    .map((players, accuracy) => ({
      accuracy: parseFloat(accuracy),
      players: players.map((stat) => ({
        id: stat.playerId,
        name: stat.playerName,
        avatarUrl: stat.playerAvatarUrl,
      })),
    }))
    .sortBy("accuracy")
    .reverse()
    .value();
  // .map((stats, accuracy) => {
  //     const sortedStats = sortBy(stats, stat => stat.answered).reverse();
  //     return sortedStats[0];
  // }

  console.log(totalQuestions);

  return (
    <div className="stats stats-vertical md:stats-horizontal shadow overflow-visible">
      {playersWithSameAccuracy.map((stat) => (
        <Stat
          key={stat.accuracy}
          users={stat.players}
          statValue={stat.accuracy * 100 + "%"}
          statTitle="Accuracy"
          //   statDesc={`${stat.correct} / ${stat.answered} correct`}
        />
      ))}
    </div>
  );
}
