import React from 'react';

const isValidEMPID = (value) => /^\d+$/.test(value);

export const TableCell = ({
  row,
  cellIndex,
  rowIndex,
  headerName,
  headers,
  dropdownOptions,
  expandedSkillCell,
  setExpandedSkillCell,
  handleCellChange
}) => {
  const cell = row[cellIndex] || '';
  const isEmpty = !cell.trim();
  const headerLower = headerName.toLowerCase().trim();
  
  const isEMPIDColumn = headerLower.includes('empid');
  const isInvalidEMPID = isEMPIDColumn && cell && !isValidEMPID(cell);
  const alignmentClass = 'left-align';

  // Location dropdown
  if (headerLower.includes('location')) {
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName}>
        <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
          <option value="">{isEmpty ? '-- Select --' : cell}</option>
          {dropdownOptions.location.map((loc, idx) => <option key={`${loc}-${idx}`} value={loc}>{loc}</option>)}
        </select>
      </td>
    );
  }
  
  // ACT/PCT Code dropdown
  if (headerLower.includes('act code') || headerLower.includes('pct code') || headerLower.includes('act/pct')) {
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName} title={cell ? `ACT Code: ${cell}` : 'Select ACT/PCT Code'}>
        <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
          <option value="">{isEmpty ? '-- Select --' : cell}</option>
          {dropdownOptions.actCode.map((code, idx) => <option key={`${code}-${idx}`} value={code}>{code}</option>)}
        </select>
      </td>
    );
  }
  
  // Skill Set with tags
  if (headerLower.includes('skill set')) {
    const cellKey = `${rowIndex}-${cellIndex}`;
    const isExpanded = expandedSkillCell === cellKey;
    
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell skill-set-cell ${alignmentClass}`} data-column={headerName}>
        <div className="skill-set-display">
          <div className="skill-set-values">
            {cell ? (
              <>
                {cell.split(',').map((skill, idx) => <span key={`skill-${idx}-${skill.trim()}`} className="skill-tag">{skill.trim()}</span>)}
                <span className="skill-toggle-plus" onClick={() => setExpandedSkillCell(isExpanded ? null : cellKey)} title="Click to add more skills">
                  {isExpanded ? '−' : '+'}
                </span>
              </>
            ) : (
              <>
                <span className="placeholder">No skills selected</span>
                <span className="skill-toggle-plus" onClick={() => setExpandedSkillCell(isExpanded ? null : cellKey)} title="Click to add skills">
                  {isExpanded ? '−' : '+'}
                </span>
              </>
            )}
          </div>
          {isExpanded && (
            <select autoFocus onChange={(e) => { if (e.target.value) { handleCellChange(rowIndex, cellIndex, e.target.value); setExpandedSkillCell(null); }}} 
                    className="cell-dropdown skill-dropdown" defaultValue="" onBlur={() => setExpandedSkillCell(null)}>
              <option value="">-- Select Skill --</option>
              {dropdownOptions.skillSet.map((skill, idx) => <option key={`${skill}-${idx}`} value={skill}>{skill}</option>)}
            </select>
          )}
        </div>
      </td>
    );
  }
  
  // Service Line dropdown
  if (headerLower.includes('service line')) {
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName}>
        <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
          <option value="">{isEmpty ? '-- Select --' : cell}</option>
          {dropdownOptions.serviceLine.map((line, idx) => <option key={`${line}-${idx}`} value={line}>{line}</option>)}
        </select>
      </td>
    );
  }

  // Timesheet/Hours - make editable with input field
  if (headerLower.includes('timesheet') || (headerLower.includes('hours') && !headerLower.includes('hourly'))) {
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${alignmentClass}`} data-column={headerName}>
        <input
          type="number"
          step="0.01"
          value={cell}
          onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
          className="timesheet-input"
          placeholder="Enter hours"
          title="Enter timesheet hours"
        />
      </td>
    );
  }

  if ((headerLower.includes('hourly rate') && headerLower.includes('$')) || (headerLower.includes('monthly rate') && headerLower.includes('$'))) {
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${alignmentClass}`} data-column={headerName}>
        {isEmpty ? '' : `$ ${cell}`}
      </td>
    );
  }

  // Regular cell
  return (
    <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${isInvalidEMPID ? 'invalid-empid' : ''} ${alignmentClass}`} data-column={headerName}>
      {cell}
    </td>
  );
};

export default TableCell;
