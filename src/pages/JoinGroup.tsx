import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function JoinGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  // if (!groupId) return <Navigate to="/" replace />;

  if (!groupId) return null;

  const group = useQuery(api.group.getGroupById, {
    groupId: groupId as Id<"groups">,
  });
  const joinGroup = useMutation(api.group.joinGroup);

  const handleJoinGroup = async (groupId: Id<"groups">) => {
    try {
      await joinGroup({ groupId });
      navigate("/");
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  if (group === null) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
        <h1 className="text-4xl font-bold">Group Not Found</h1>
        <p className="">The group you are trying to join does not exist.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
      <h1 className="text-4xl font-bold">Joining a Group...</h1>
      <p className="">
        {group
          ? `${group.hostName} is inviting you to join ${group.name}`
          : "Loading group information..."}
      </p>
      <button
        className="btn btn-xl btn-primary"
        onClick={() => handleJoinGroup(groupId as Id<"groups">)}
      >
        Join Group
      </button>
    </section>
  );
}
