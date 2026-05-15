import { Id } from "../../convex/_generated/dataModel";
import { Avatar } from "./Avatar";

export function Stat({
  users,
  statValue,
  statTitle,
  statDesc,
}: {
  users: { id: Id<"users">; name: string; avatarUrl?: string }[];
  statValue: string;
  statTitle: string;
  statDesc?: string;
}) {
  return (
    <div className="stat overflow-visible">
      <div className="stat-figure text-secondary overflow-visible">
        <div className="avatar-group -space-x-6 overflow-visible">
          {users?.map((user, index) => (
            <Avatar
              key={index}
              isLarge
              name={user.name}
              imageUrl={user.avatarUrl}
            />
          ))}
        </div>
      </div>
      <div className="stat-value">{statValue}</div>
      <div className="stat-title">{statTitle}</div>
      <div className="stat-desc text-secondary">{statDesc}</div>
    </div>
  );
}
