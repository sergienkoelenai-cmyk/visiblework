import React from 'react';
import './HomeFooter.css';

export default function HomeFooter({ version = 'v2.8.0' }) {
  return (
    <footer className="home-footer">
      <p className="home-footer__text">
        ✨ All caught up! • Visible Work {version}
      </p>
    </footer>
  );
}
