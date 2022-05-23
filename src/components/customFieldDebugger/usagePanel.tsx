import { useState } from 'react';

type UsagePanelProps = {
  fields: {
    [key: string]: string,
  };
  usageMap: {
    [key: string]: Array<HTMLElement>,
  };
  proxyUsageList: {
    [key: string]: boolean,
  };
};

const UsagePanel = (props: UsagePanelProps) => {
  const { fields } = props;
  const [isVisible, setVisible] = useState(false);
  const [sortedColIdx, setSortedColIdx] = useState(1);
  const [sortedDirection, setSortedDirection] = useState('ascending');

  // Clicking the "sort" button for the same `sortedColIdx` will reverse the sort
  // Clicking the "sort" button for a different `sortedColIdx` will sort by that column instead
  const toggleSortState = (colIdx: number) => {
    if (colIdx === sortedColIdx) {
      setSortedDirection(sortedDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortedDirection('ascending');
      setSortedColIdx(colIdx);
    }
  }

  // aggregate data from field data + `usageMap` + `proxyUsageList` to `UsagePanelFieldProps`
  const getFieldProps = (field: [string, string]): UsagePanelFieldProps => {
    const [fieldKey, fieldVal] = field;
    let shortKey = fieldKey;
    const prefix = 'document.streamOutput.';
    if (shortKey.startsWith(prefix)) {
      shortKey = shortKey.slice(prefix.length);
    }
  
    let shortVal = fieldVal;
    const maxStrLen = 40;
    if (typeof shortVal === 'string' && shortVal.length > maxStrLen) {
      shortVal = `${shortVal.slice(0, maxStrLen)}...`;
    }
  
    const fieldIsUsed = !!(props.usageMap[fieldKey] || props.proxyUsageList[fieldKey]);
    let fieldStatus = 'notUsed';
    if (props.usageMap[fieldKey]) { fieldStatus = 'used'; }
    else if (props.proxyUsageList[fieldKey]) { fieldStatus = 'internal'; }

    const usageEls = props.usageMap[fieldKey];

    return {
      fieldKey: shortKey,
      fieldVal: shortVal.toString(),
      fieldIsUsed,
      fieldStatus,
      usedEls: usageEls,
    };
  }

  const getSortFnFromState = () => {
    const colIdxToPropKey: {[key: number]: string} = {
      0: 'fieldStatus',
      1: 'fieldKey',
    };

    const fieldStatusSortIndices: {[key: string]: string} = {
      'used': '0',
      'internal': '1',
      'notUsed': '2',
    };

    return (a: UsagePanelFieldProps, b: UsagePanelFieldProps) => {
      let a_value = a[colIdxToPropKey[sortedColIdx] as keyof UsagePanelFieldProps];
      let b_value = b[colIdxToPropKey[sortedColIdx] as keyof UsagePanelFieldProps];

      if (!(a_value && b_value)) { return 0; }

      // Field statuses should not be sorted alphabetically, instead use the pre-defined order above
      if (colIdxToPropKey[sortedColIdx] === 'fieldStatus') {
        a_value = fieldStatusSortIndices[a_value as string];
        b_value = fieldStatusSortIndices[b_value as string];
      }

      if (sortedDirection === 'ascending') {
        return a_value > b_value ? 1 : -1;
      } else {
        return a_value < b_value ? 1 : -1;
      }
    }
  }

  return (
    <div className={`CFD-usagePanel CFDUsagePanel${isVisible ? ' is-visible' : ''}`}>
      <div className="CFDUsagePanel-headingRow">
        <div className="CFDUsagePanel-fieldStatus CFDUsagePanel-heading">
          Status
          <button className="CFDUsagePanel-headingSortButton" onClick={() => toggleSortState(0)}>
            <span className={`CFDUsagePanel-headingSortIcon${sortedColIdx === 0 ? ` is-sorted is-${sortedDirection}` : ''}`}></span>
          </button>
        </div>
        <div className="CFDUsagePanel-fieldSummary CFDUsagePanel-heading">
          Field Data
          <button className="CFDUsagePanel-headingSortButton" onClick={() => toggleSortState(1)}>
            <span className={`CFDUsagePanel-headingSortIcon${sortedColIdx === 1 ? ` is-sorted is-${sortedDirection}` : ''}`}></span>
          </button>
        </div>
      </div>
      <div className="CFDUsagePanel-scrollable">
        {Object.entries(fields).map(field => getFieldProps(field)).sort(getSortFnFromState()).map((fieldProps, idx) => 
          <UsagePanelField key={idx} {...fieldProps} />
        )}
      </div>
      <button className="CFD-usageBtn" onClick={() => setVisible(!isVisible)}></button>
    </div>
  );
};

type UsagePanelFieldProps = {
  fieldKey: string,
  fieldVal: string,
  fieldIsUsed: boolean,
  fieldStatus: string,
  usedEls?: Array<HTMLElement>,
}

const UsagePanelField = (props: UsagePanelFieldProps) => {
  const { fieldKey, fieldVal, fieldIsUsed, fieldStatus, usedEls } = props;

  const statusToDisplayedStatus: {[key:string]: string} = {
    'notUsed': 'Not Used',
    'used': 'On Page',
    'internal': 'Internal Logic'
  };

  // Clicking a field should reveal its usage location on the page
  const showUsageLocation = () => {
    if (usedEls && usedEls.length > 0) {
      const el = usedEls[0];
      document.querySelectorAll('.CFD-isSelected').forEach(el => el.classList.remove('CFD-isSelected'));
      el.classList.add('CFD-isSelected');
      window.scrollTo({top: el.getBoundingClientRect().top, behavior: 'smooth'});
    }
  }

  return (
    <div className={`CFDUsagePanel-field${fieldIsUsed ? ' CFDUsagePanel-field--used' : ' CFDUsagePanel-field--notUsed'}`} onClick={() => showUsageLocation()}>
      <span className={`CFDUsagePanel-fieldStatusIndicator CFDUsagePanel-fieldStatusIndicator--${fieldStatus}`}></span>
      <span className="CFDUsagePanel-fieldStatus">{statusToDisplayedStatus[fieldStatus]}</span>
      <span className="CFDUsagePanel-fieldSummary">
        <span className="CFDUsagePanel-fieldSummaryKey">{fieldKey}</span>
        <span className="CFDUsagePanel-fieldSummaryVal">{fieldVal}</span>
      </span>
    </div>
  )
}

export default UsagePanel;