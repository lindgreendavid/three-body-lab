import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <span className="brand__mark" aria-hidden="true">
        3B
      </span>
      <p>404 · outside the declared grid</p>
      <h1>This page is not part of the experiment.</h1>
      <Link className="button button--primary" href="/">
        Return to Three Body Lab
      </Link>
    </main>
  );
}
