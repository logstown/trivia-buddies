import { useQuery, useAction, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { OpenTDBCategory } from "../../convex/opentdb";

export default function YourNextCategory() {
  const user = useQuery(api.users.getCurrentUser);
  const fetchCategories = useAction(api.opentdb.fetchCategories);
  const updateNextCategory = useMutation(api.users.updateNextCategory);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<OpenTDBCategory[]>([]);
  const [showSave, setShowSave] = useState(false);

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

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
      <h1 className="text-3xl font-bold">Your Next Category Is...</h1>
      <select
        className="select select-bordered w-full max-w-xs"
        value={selectedCategory ?? ""}
        onChange={(e) => {
          setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
          setShowSave(true);
        }}
      >
        <option value="">Random</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {showSave && (
        <button
          className="btn btn-primary"
          onClick={async () => {
            console.log(selectedCategory);
            await updateNextCategory({
              nextCategory: selectedCategory ?? undefined,
            });
            setShowSave(false);
          }}
        >
          Save
        </button>
      )}
    </section>
  );
}
