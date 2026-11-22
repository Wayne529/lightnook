export const offlineOnly=import.meta.env.VITE_OFFLINE_ONLY==='true';
if(new URLSearchParams(location.search).get('mode')==='offline')localStorage.setItem('lightnook-mode','offline');
export const isOffline=()=>offlineOnly||localStorage.getItem('lightnook-mode')==='offline';
export function switchMode(offline:boolean){localStorage.setItem('lightnook-mode',offline?'offline':'online');location.href='/welcome';}
