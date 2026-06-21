"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

type Props = {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * SubmitButton — form submit gomb useFormStatus()-szal
 *
 * Miért kell ez?
 * A Server Component formokban (login, join) nincs hozzáférés a pending
 * állapothoz. A React useFormStatus() hook automatikusan érzékeli, hogy
 * a szülő <form> épp küld-e — de csak Client Component-ben hívható, és
 * csak ha közvetlenül a <form>-on belül van renderelve.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  style,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        ...style,
      }}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
