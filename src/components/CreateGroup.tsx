import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";

export default function CreateGroup() {
  const [newGroupName, setNewGroupName] = useState("");
  const createGroup = useMutation(api.group.createGroup);

  const handleCreateGroup = async (name: string) => {
    try {
      const groupId = await createGroup({ name });
      console.log("Group created with ID:", groupId);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };
  return (
    <>
      <h3 className="text-2xl"> You are not part of a group yet.</h3>
      <p>Create a group</p>
      <input
        type="text"
        placeholder="Group Name"
        className="input"
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
      />
      <button
        className="btn btn-primary"
        onClick={() => handleCreateGroup(newGroupName)}
      >
        Create
      </button>
    </>
  );
}
