import React from 'react';
import { CroissantMap } from './CroissantMap';
import { Avatar } from './Avatar';

export const App: React.FC = () => {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <header style={{ padding:'0.75rem 1rem', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', background:'#fff', zIndex:1000 }}>
        <Avatar />
        <div style={{ fontSize:12, opacity:0.6 }}>Add croissant spots. Data stored locally.</div>
      </header>
      <main style={{ flex:1, display:'flex', position:'relative' }}>
        <CroissantMap />
      </main>
    </div>
  );
};
