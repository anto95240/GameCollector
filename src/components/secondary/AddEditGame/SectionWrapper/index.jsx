import React from 'react';
import "./SectionWrapper.css";

const SectionWrapper = ({ id, title, children, className = "" }) => {
    return (
        <div id={id} className={`form-section ${className}`}>
            <h3>{title}</h3>
            {children}
        </div>
    );
};

export default SectionWrapper;