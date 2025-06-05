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
        W: Move Forward<br />
        A: Turn Left<br />
        S: Turn Right<br />
        Touch: Drag left circle to move/turn
      </div>
      <div id="joystick-left" className="joystick"></div>
      <div id="joystick-right" className="joystick"></div>
    </>
  );
}
