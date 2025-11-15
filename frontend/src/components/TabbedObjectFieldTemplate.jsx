// TabbedObjectFieldTemplate.jsx
import React, { useMemo, useState, useEffect } from 'react';

export default function TabbedObjectFieldTemplate(props) {
  const {
    properties = [],
    title,
    description,
    uiSchema,
    schema,
  } = props;

  const groups = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => {
      const propName = p.name;
      const propUi = (uiSchema && uiSchema[propName]) || {};
      const tabName =
        (propUi['ui:options'] && propUi['ui:options'].tab) ||
        (schema?.properties?.[propName]?.tab) ||
        'General';
      if (!map.has(tabName)) map.set(tabName, []);
      map.get(tabName).push(p);
    });
    return map;
  }, [properties, uiSchema, schema]);

  const tabNames = useMemo(() => Array.from(groups.keys()), [groups]);
  const [active, setActive] = useState(tabNames[0] || 'General');

  useEffect(() => {
    if (!tabNames.includes(active) && tabNames.length > 0) {
      setActive(tabNames[0]);
    }
  }, [tabNames, active]);

  return (
    <div className="move-in-tabs">
      {title ? <h3 className="form-title">{title}</h3> : null}
      {description ? <p className="form-description">{description}</p> : null}

      <div className="tab-list" role="tablist" aria-label="Form sections">
        {tabNames.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={active === name}
            className={`tab ${active === name ? 'active' : ''}`}
            onClick={() => setActive(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tabNames.map((name) => (
        <div
          key={name}
          role="tabpanel"
          hidden={active !== name}
          className="tab-panel"
        >
          {groups.get(name)?.map((p) => (
            <div key={p.name} className={`property-wrapper ${p.hidden ? 'hidden' : ''}`}>
              {p.content}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

