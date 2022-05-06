import { useState } from 'react';

const ClickableThing = (props: {name: any}) => {
  const [count, setCount] = useState(0);

  return (
    <div className="ClickableThing" onClick={() => setCount(count + 1)}>
      Hi {props.name}, clicked {count} times
    </div>
  );
};

export default ClickableThing;
