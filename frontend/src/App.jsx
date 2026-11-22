import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Alerts from './pages/Alerts';
import Assistant from './pages/Assistant';
import Auth from './pages/Auth';
import Compare from './pages/Compare';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Wishlist from './pages/Wishlist';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="assistant/:id" element={<Assistant />} />
        <Route path="compare" element={<Compare />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
