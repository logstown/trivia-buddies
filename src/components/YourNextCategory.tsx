import { useQuery, useAction, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { OpenTDBCategory } from "../../convex/opentdb";

export default function YourNextCategory({
  handleCloseModal,
}: {
  handleCloseModal: () => void;
}) {
  const user = useQuery(api.users.getCurrentUser);
  const fetchCategories = useAction(api.opentdb.fetchCategories);
  const updateNextCategory = useMutation(api.users.updateNextCategory);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<OpenTDBCategory[]>([]);

  useEffect(() => {
    if (user === undefined) return;
    setSelectedCategory(user?.nextCategory ?? null);
  }, [user]);

  useEffect(() => {
    fetchCategories().then((categories) => {
      setCategories(categories);
    });
  }, [fetchCategories]);

  if (!user) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-3xl font-bold">Not Authenticated</h1>
        <p className="">Please sign in to see your next category.</p>
      </section>
    );
  }

  const handleSave = async () => {
    await updateNextCategory({
      nextCategory: selectedCategory ?? undefined,
    });

    handleCloseModal();
  };

  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="text-lg font-bold">Category for your next question</h3>
        <p className="py-4">
          Share this link with friends so they can join your group.
        </p>
        <select
          className="select select-bordered w-full max-w-xs"
          value={selectedCategory ?? ""}
          onChange={(e) =>
            setSelectedCategory(
              e.target.value ? parseInt(e.target.value) : null,
            )
          }
        >
          <option value="">Random</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="modal-action">
          <button className="btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCloseModal}>close</button>
      </form>
    </dialog>
  );
}
