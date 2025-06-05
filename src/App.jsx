import React, { useEffect } from 'react';
import init from './script.js';

export default function App() {
  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <div id="info">
        Controls:<br />
        W/S: Pitch Up/Down<br />
        A/D: Yaw Left/Right<br />
        Q/E: Roll Left/Right<br />
        R/F: Altitude Up/Down (Thrust)<br />
        Arrow Keys: Alternative Pitch/Yaw<br />
        Touch: Drag left circle for pitch/yaw, right circle for roll/altitude
      </div>
      <div id="joystick-left" className="joystick"></div>
      <div id="joystick-right" className="joystick"></div>
    </>
  );
}
