import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center">
      <div className="font-mono text-sm text-muted">404</div>
      <h1 className="mt-4 text-5xl">This page went out of stock</h1>
      <p className="mt-2 text-muted">The link may be broken or the page was moved.</p>
      <Link to="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
