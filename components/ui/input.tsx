import { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950 outline-none ring-0 transition focus:border-emerald-400 ${className}`}
    />
  );
}
