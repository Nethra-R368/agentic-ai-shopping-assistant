import React from 'react';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      {/* Decorative blurred background elements for modern SaaS look */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="fixed top-[20%] right-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="fixed bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      {/* Main Chat Interface */}
      <Chatbot />
    </div>
  );
}

export default App;
