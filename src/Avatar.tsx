import React, { useRef } from 'react';
import { loadAvatar, saveAvatar } from './storage';

export const Avatar: React.FC = () => {
  const [avatar, setAvatar] = React.useState<string | null>(() => loadAvatar());
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatar(result);
      saveAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
      <div style={{ position:'relative' }}>
        <img
          src={avatar || '/croissant.svg'}
          alt="avatar"
          style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', border:'2px solid #ff9f43', cursor:'pointer' }}
          onClick={() => inputRef.current?.click()}
        />
        <button
          style={{ position:'absolute', bottom:-4, right:-4, fontSize:10, padding:'2px 4px', borderRadius:4, border:'1px solid #ccc', background:'#fff', cursor:'pointer' }}
          onClick={() => inputRef.current?.click()}
          title="Change avatar"
        >Edit</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onChange} />
      <div>
        <strong>Your Croissant Map</strong>
        <div style={{ fontSize:12, opacity:0.7 }}>Click map to add spots. Right-click a circle to remove.</div>
      </div>
    </div>
  );
};
