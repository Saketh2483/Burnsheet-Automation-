import React from 'react';

export const CountryTabs = ({ selectedCountry, setSelectedCountry }) => {
  return (
    <div className="country-tabs">
      {['India', 'USA'].map(country => (
        <div
          key={country}
          className={`country-tab ${selectedCountry === country ? 'active' : ''}`}
          onClick={() => setSelectedCountry(country)}
        >
          {country}
        </div>
      ))}
    </div>
  );
};

export default CountryTabs;
