import { useState } from "react";
import ScholarSyncChatbot from "./AIChat"; // Corrected import name
import "./AIWidget.css"; // Import AIWidget styles

const AIWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="ai-widget"> {/* Main container for the widget */}
      {open && (
        <div className={`ai-widget-panel ${open ? 'open' : ''}`}> {/* Use CSS class for panel */}
          <ScholarSyncChatbot onClose={() => setOpen(false)} /> {/* Pass onClose prop */}
        </div>
      )}
      
      <button
        onClick={() => setOpen(!open)}
        className="ai-toggle-btn" // Use CSS class for button
      >
        🤖
      </button>
    </div>
  );
};

export default AIWidget;