type FullScreenLoaderProps = {
  message?: string;
  backgroundClassName?: string;
  textClassName?: string;
};

export default function FullScreenLoader({
  message = "Cargando...",
  backgroundClassName = "bg-soft-gray-50",
  textClassName = "text-slate-500",
}: FullScreenLoaderProps) {
  const containerClassName = [
    "flex min-h-screen items-center justify-center",
    backgroundClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const messageClassName = [
    "mt-4 text-sm",
    textClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-celeste-300 border-r-transparent"></div>
        {message ? <p className={messageClassName}>{message}</p> : null}
      </div>
    </div>
  );
}
