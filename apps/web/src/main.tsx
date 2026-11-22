import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,HashRouter,Routes,Route,Navigate,useLocation} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {ToastProvider,useMe,Loading,ErrorState} from './ui';
import {Welcome,Setup,PlanPreview,Today,PlanPage,CalendarPage,Profile} from './pages/core';
import {Eat,MealDetail,Library} from './pages/meals';
import {RecordPage,WorkoutPage,GroceryPage,SignPage} from './pages/records';
import './style.css';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000,refetchOnWindowFocus:false},mutations:{retry:false}}});
function Auth({children}:{children:React.ReactNode}){const me=useMe();const location=useLocation();if(me.isPending)return <Loading/>;if(me.error){if((me.error as any).status===401)return <Navigate to="/welcome" replace state={{from:location.pathname}}/>;return <ErrorState error={me.error} retry={()=>me.refetch()}/>;}return children;}
const Router=import.meta.env.VITE_STATIC_HOST==='true'?HashRouter:BrowserRouter;
function App(){return <Router><ToastProvider><Routes><Route path="/welcome" element={<Welcome/>}/><Route path="*" element={<Auth><Routes><Route path="/" element={<Today/>}/><Route path="/setup" element={<Setup/>}/><Route path="/preferences" element={<Setup edit/>}/><Route path="/plan-preview/:id" element={<PlanPreview/>}/><Route path="/plan" element={<PlanPage/>}/><Route path="/eat" element={<Eat/>}/><Route path="/library" element={<Library/>}/><Route path="/meals/:id" element={<MealDetail/>}/><Route path="/calendar" element={<CalendarPage/>}/><Route path="/record/:id" element={<RecordPage/>}/><Route path="/workout/:id" element={<WorkoutPage/>}/><Route path="/groceries/:id" element={<GroceryPage/>}/><Route path="/signs" element={<SignPage/>}/><Route path="/profile" element={<Profile/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Auth>}/></Routes></ToastProvider></Router>;}
createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><App/></QueryClientProvider></React.StrictMode>);
if(import.meta.env.PROD&&import.meta.env.VITE_OFFLINE_ONLY==='true'&&'serviceWorker' in navigator)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});
