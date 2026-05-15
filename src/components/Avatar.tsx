export const Avatar: React.FC<{
  imageUrl?: string;
  name: string;
  isLarge?: boolean;
}> = ({ imageUrl, name, isLarge = false }) => {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = isLarge ? "w-16 h-16" : "w-8 h-8";

  return (
    <div className="tooltip inline-block hover:z-20" data-tip={name}>
      <div className={`avatar ${!imageUrl ? "avatar-placeholder" : ""}`}>
        <div className={`${sizeClasses} rounded-full`}>
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className="bg-neutral text-neutral-content w-full h-full rounded-full flex items-center justify-center">
              <span className={isLarge ? "text-lg" : "text-xs"}>
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
