import { useState } from 'react';

const TabbableThing = (props: {tab1: string, tab2: string}) => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className="TabbableThing">
      <div className="TabbableThing-buttons">
        <button onClick={() => setTabIndex(0)}>Tab 1</button>
        <button onClick={() => setTabIndex(1)}>Tab 2</button>
      </div>
      <div className="TabbableThing-tabs">
        {tabIndex == 0 && 
          <div className="TabbableThing-tab">
            Tab 1 content -- {props.tab1}
          </div>
        }
        {tabIndex == 1 && 
          <div className="TabbableThing-tab">
            Tab 2 content -- {props.tab2}
          </div>
        }
      </div>
    </div>
  )
};

export default TabbableThing;