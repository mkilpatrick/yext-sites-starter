import React from "react";
import { useResolvedValue } from "../ProfileContext";
import { ValueOrFieldReference } from "../types"

interface AboutProps {
	name: ValueOrFieldReference<string>
}

export default function About(props: AboutProps) {
	const ref = React.createRef<HTMLSpanElement>();
	const name = useResolvedValue(props.name, ref); // type safe!
	return (
		<div>
			Learn More About <span ref={ref}>{name}</span>!
		</div>
	)
}
