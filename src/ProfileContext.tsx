import React, { RefObject, useContext, useEffect } from "react";
import { Profile, FieldReference, isFieldReference, ValueOrFieldReference, KeysWithValsOfType } from "./types";

/**
 * A helper to create a Context and Provider with no upfront default value, and
 * without having to check for undefined all the time.
 */
 function createCtx<A extends {} | null>() {
  const ctx = React.createContext<A | undefined>(undefined);
  function useCtx() {
    const c = useContext(ctx);
    if (c === undefined)
      throw new Error("useCtx must be inside a Provider with a value");
    return c;
  }
  return [useCtx, ctx.Provider] as const; // 'as const' makes TypeScript infer a tuple
}

// We still have to specify a type, but no default
export const [useProfile, ProfileProvider] = createCtx<Profile>();

function useField<T>(field: FieldReference<T>, ref: RefObject<HTMLElement>) {
	const context = useProfile();
	useEffect(() => {
		if (ref.current) ref.current.setAttribute("data-data-track", field.name)
	})
	return context[field.name]
}

export function useResolvedValue<T>(x: ValueOrFieldReference<T>, ref: RefObject<HTMLElement>) {
	if (isFieldReference<T>(x)) return useField<T>(x, ref)
  return x;
}

export { useField } ;

export default ProfileProvider;