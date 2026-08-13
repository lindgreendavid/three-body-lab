"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Three Body Lab render failure", error);
  }, [error]);

  return (
    <main className="status-page">
      <span className="brand__mark" aria-hidden="true">
        3B
      </span>
      <p>Trajectory interrupted</p>
      <h1>This run could not be rendered.</h1>
      <p>Your simulator inputs stay on this device. Try the run again or return to the laboratory.</p>
      <div className="hero__actions">
        <button className="button button--primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="button button--ghost" href="/">
          Return to the laboratory
        </Link>
      </div>
    </main>
  );
}
